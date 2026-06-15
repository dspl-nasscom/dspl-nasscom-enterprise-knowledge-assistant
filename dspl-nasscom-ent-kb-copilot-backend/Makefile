.PHONY: dev serve ingest bench test lint docker-up docker-down install setup-data

# ── Development ────────────────────────────────────────────────────────────────
install:
	poetry install

dev:
	poetry run uvicorn app.main:app --reload --port 8000 --log-level debug

serve:
	poetry run gunicorn app.main:app -c gunicorn.conf.py

# ── Data ───────────────────────────────────────────────────────────────────────
setup-data:
	mkdir -p data/raw/sop_pdfs data/raw/tickets data/raw/hr_policies \
	         data/vector_store data/benchmarks

ingest:
	poetry run python scripts/ingest_all.py

# ── Evaluation ────────────────────────────────────────────────────────────────
bench:
	poetry run python scripts/benchmark.py

# ── Quality ───────────────────────────────────────────────────────────────────
test:
	poetry run pytest tests/ -v --tb=short

test-unit:
	poetry run pytest tests/unit/ -v

test-integration:
	poetry run pytest tests/integration/ -v

lint:
	poetry run ruff check . && poetry run mypy app/

fmt:
	poetry run ruff format .

# ── Docker ────────────────────────────────────────────────────────────────────
docker-up:
	docker compose -f docker/docker-compose.yml up --build

docker-down:
	docker compose -f docker/docker-compose.yml down -v
