.PHONY: help docker-build

help:
	@echo "Targets:"
	@echo "  docker-build   Build the local all-in-one Docker image (karakeep:local)"

docker-build:
	docker build -f docker/Dockerfile --target aio -t karakeep:local .
