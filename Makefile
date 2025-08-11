DOCKER_IMAGE ?= drive-thru
CONTAINER_NAME ?= drive-thru
PORT ?= 8000
ENV_FILE ?= .env

.PHONY: docker-build docker-up docker-down docker-logs docker-rebuild docker-status

docker-build:
	@echo "[build] Building image $(DOCKER_IMAGE) ..."
	docker build -t $(DOCKER_IMAGE) .

docker-up: ## Build and run the container in background
	@# Ensure .env exists and contains OPENAI_API_KEY
	@test -f $(ENV_FILE) || (echo "[error] $(ENV_FILE) not found. Create one with OPENAI_API_KEY=..." && exit 1)
	@grep -q "^OPENAI_API_KEY=" $(ENV_FILE) || (echo "[error] OPENAI_API_KEY not set in $(ENV_FILE)" && exit 1)
	@echo "[up] Starting $(CONTAINER_NAME) on port $(PORT)..."
	@docker rm -f $(CONTAINER_NAME) >/dev/null 2>&1 || true
	$(MAKE) docker-build
	docker run -d --name $(CONTAINER_NAME) --env-file $(ENV_FILE) -p $(PORT):8000 $(DOCKER_IMAGE)
	@echo "[ok] Visit http://localhost:$(PORT) (API docs at /docs)"

docker-down: ## Stop and remove the container
	@echo "[down] Stopping $(CONTAINER_NAME)..."
	@docker rm -f $(CONTAINER_NAME) || true

docker-logs: ## Tail container logs
	docker logs -f $(CONTAINER_NAME)

docker-rebuild: docker-down docker-up ## Rebuild image and restart

docker-status:
	@docker ps --filter name=$(CONTAINER_NAME)


