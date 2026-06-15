# ── Stage 1: dependency install ───────────────────────────────────────────────
FROM python:3.12-slim AS deps

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=2.3.4

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir poetry==${POETRY_VERSION}

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --no-root --only main


# ── Stage 2: download HF models during build ────────────────────────────────
FROM deps AS model-download

ARG HF_TOKEN=""

ENV HF_TOKEN=${HF_TOKEN}
ENV HF_HOME=/app/data/huggingface

RUN mkdir -p ${HF_HOME}

RUN python <<'PY'
import os

token = os.getenv("HF_TOKEN")

if token:
    from huggingface_hub import login
    login(token=token, add_to_git_credential=False)
    print("Authenticated with HuggingFace")
else:
    print("No HF token provided")

from sentence_transformers import SentenceTransformer, CrossEncoder

print("Downloading embedding model...")
SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2",
    token=token
)

print("Downloading reranker model...")
CrossEncoder(
    "BAAI/bge-reranker-base"
)

print("Models downloaded successfully")
print("HF_HOME =", os.environ["HF_HOME"])
PY


# ── Stage 3: runtime image ───────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/app/data/huggingface \
    TRANSFORMERS_OFFLINE=1 \
    HF_DATASETS_OFFLINE=1 \
    TOKENIZERS_PARALLELISM=false \
    PORT=8080

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 copilot

# Installed Python packages
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# HuggingFace cache/models
COPY --from=model-download /app/data/huggingface /app/data/huggingface

# Application source
COPY app/ ./app/

RUN mkdir -p /app/data/raw && \
    chown -R copilot:copilot /app

USER copilot

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health/livez || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]