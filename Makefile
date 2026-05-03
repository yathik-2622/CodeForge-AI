.PHONY: install dev-all dev-frontend dev-api dev-backend

install:
	cd frontend && npm install
	cd node_api && npm install
	cd backend && pip install -r requirements.txt

dev-frontend:
	cd frontend && npm run dev

dev-api:
	cd node_api && npm run dev

dev-backend:
	cd backend && uvicorn main:app --reload --port 9000

dev-all:
	@echo "Start each service in a separate terminal:"
	@echo "  make dev-frontend   (port 5173)"
	@echo "  make dev-api        (port 8080)"
	@echo "  make dev-backend    (port 9000)"

build:
	cd frontend && npm run build
	cd node_api && npm run build
