FROM node:12-alpine

WORKDIR /app
COPY package.json *yarn* /app/
RUN yarn install

COPY . /app
EXPOSE 9200

ENTRYPOINT ["yarn", "start"]
