#!/usr/bin/env node

const AWS = require('aws-sdk');
const express = require('express');
const helmet = require('helmet')
const httpProxy = require('http-proxy');
const bodyParser = require('body-parser');
const stream = require('stream');
const basicAuth = require('basic-auth-connect');
const compress = require('compression');

const yargs = require('yargs')
    .usage('usage: $0 [options] <aws-es-cluster-endpoint>')
    .option('r', {
        alias: 'region',
        default: process.env.REGION || 'ap-southeast-2',
        demand: false,
        describe: 'the region of the Elasticsearch cluster',
        type: 'string'
    })
    .option('l', {
      alias: 'limit',
      default: process.env.LIMIT || '2kb',
      demand: false,
      describe: 'request limit'
    })
    .help()
    .version()
    .strict();

const argv = yargs.argv;
const ENDPOINT = process.env.ENDPOINT || argv._[0];

if (!ENDPOINT) {
    yargs.showHelp();
    process.exit(1);
}

// Try to infer the region if it is not provided as an argument.
const REGION = argv.r;
if (!REGION) {
    const m = ENDPOINT.match(/\.([^.]+)\.es\.amazonaws\.com\.?$/);
    if (m) {
        REGION = m[1];
    } else {
        console.error('region cannot be parsed from endpoint address, either the endpoint must end ' +
                      'in .<region>.es.amazonaws.com or --region should be provided as an argument');
        yargs.showHelp();
        process.exit(1);
    }
}

const TARGET = process.env.ENDPOINT || argv._[0];
const BIND_ADDRESS = "0.0.0.0";
const REQ_LIMIT = argv.l;

var credentials;
const chain = new AWS.CredentialProviderChain();
chain.resolve(function (err, resolved) {
    if (err) throw err;
    else credentials = resolved;
});
function getCredentials(req, res, next) {
    return credentials.get(function (err) {
        if (err) return next(err);
        else return next();
    });
}

const proxy = httpProxy.createProxyServer({
    target: TARGET,
    changeOrigin: true,
    secure: true
});
proxy.on('proxyReq', function (proxyReq, req) {
    const endpoint = new AWS.Endpoint(ENDPOINT);
    const request = new AWS.HttpRequest(endpoint);
    request.method = proxyReq.method;
    request.path = proxyReq.path;
    request.region = REGION;
    if (Buffer.isBuffer(req.body)) request.body = req.body;
    if (!request.headers) request.headers = {};
    request.headers['presigned-expires'] = false;
    request.headers['Host'] = ENDPOINT;

    const signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(credentials, new Date());

    proxyReq.setHeader('Host', request.headers['Host']);
    proxyReq.setHeader('X-Amz-Date', request.headers['X-Amz-Date']);
    proxyReq.setHeader('Authorization', request.headers['Authorization']);
    if (request.headers['x-amz-security-token']) proxyReq.setHeader('x-amz-security-token', request.headers['x-amz-security-token']);
});
proxy.on('proxyRes', function (proxyReq, req, res) {
    if (req.url.match(/\.(css|js|img|font)/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
});


const app = express();
app.set('port', "9200")
app.use(helmet())
app.use(compress());
app.use(bodyParser.raw({limit: REQ_LIMIT, type: function() { return true; }}));
app.use(getCredentials);
app.use(function (req, res) {
    var bufferStream;
    if (Buffer.isBuffer(req.body)) {
        var bufferStream = new stream.PassThrough();
        bufferStream.end(req.body);
    }
    proxy.web(req, res, {buffer: bufferStream});
});
app.listen(app.get('port'), (err) => {
  if (err) {
    return console.log('Something bad happened', err)
  }
  console.log('AWS ES cluster available at http://' + BIND_ADDRESS + ':' + app.get('port'));
  console.log('Kibana available at http://' + BIND_ADDRESS + ':' + app.get('port') + '/_plugin/kibana/');
})
