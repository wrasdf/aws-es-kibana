.PHONY: sh

DCB := docker-compose build
DCR := docker-compose run --rm

sh:
	$(DCB) sh
	$(DCR) sh

build-%:
	docker build -t ikerry/aws-es-kibana:$(*) .
	docker tag ikerry/aws-es-kibana:$(*) ikerry/aws-es-kibana:latest
	docker push ikerry/aws-es-kibana:latest
	docker push ikerry/aws-es-kibana:$(*)
