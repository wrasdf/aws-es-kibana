.PHONY: sh run

DCB := docker-compose build
DCR := docker-compose run --rm

sh:
	$(DCB) sh
	$(DCR) sh

run:
	docker build -t aws-es-kibana:local .
	docker run -d -v ${HOME}/.aws:/root/.aws -p 9200:9200 aws-es-kibana:local https://elasticsearch.apollo-stg.platform.myobdev.com
