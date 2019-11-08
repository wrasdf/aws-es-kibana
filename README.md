# AWS ES/Kibana Proxy

AWS ElasticSearch/Kibana Proxy to access your [AWS ES](https://aws.amazon.com/elasticsearch-service/) cluster.

This is the solution for accessing your cluster if you have [configured access policies](http://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html#es-createdomain-configure-access-policies) for your ES domain

### Run within docker container

If you are familiar with Docker, you can run `aws-es-kibana` within a Docker container

Build the image

	docker build -t aws-es-kibana:local .

Run the container (do not forget to pass the required environment variables)

	docker run --rm -v ~/.aws:/root/.aws -p 9200:9200 aws-es-kibana:local <cluster-endpoint>

### How to debug

- $ make sh
