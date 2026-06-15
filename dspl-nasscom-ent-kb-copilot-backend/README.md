# Enterprise Knowledge Copilot - Backend

> **Nasscom UC2** - Agentic RAG system with ReAct reasoning, BGE-Reranker precision, source citations, and PII masking guardrails.

---

## Architecture

```
POST /api/v1/query
  └── LangGraph ReAct Agent
        ├── Tool 1: document_search  →  Qdrant Collection
        ├── Tool 2: ticket_lookup    →  support_tickets Collection
        └── Tool 3: summariser       →  multi-chunk synthesis
              ↓
        [Vector Search Top-20]  →  [BGE-Reranker Top-5]  →  [Guardrail / DLP Masking]  →  [LLM + Citations]
```

**4 Layers:**
| Layer | Component | File |
|-------|-----------|------|
| 1 - Ingestion | PDF/CSV/TXT loader → chunker → embedder → vector store | `app/ingestion/` |
| 2 - Agent | LangGraph ReAct loop with 3 tools | `app/agent/` |
| 3 - Retrieval | Bi-encoder search + BGE cross-encoder reranker | `app/retrieval/` |
| 4 - Generation | Grounded prompt + citation injection + DLP PII masking | `app/generation/` |

---

## Quick Start

### 1. create virtual environment
```bash
python -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies
```bash
poetry install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env — set LLM provider keys, GCP details, and Qdrant settings
```

### 4. Run the development server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080
# API live at http://localhost:8080
# Swagger UI at http://localhost:8080/docs
```

---

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/query` | Submit a question, get cited answer |
| `GET` | `/api/v1/query/stream?question=...` | SSE streaming answer |
| `POST` | `/api/v1/ingest` | Upload documents (multipart) |
| `GET` | `/api/v1/health` | Detailed system health |
| `GET` | `/api/v1/health/readyz` | readiness probe |
| `GET` | `/api/v1/health/livez` | liveness probe |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/config` | Read current retrieval config (Firestore-backed with caching) |
| `PATCH` | `/api/v1/admin/config` | Update retrieval parameters (threshold, top_k, PII masking toggle) |
| `DELETE` | `/api/v1/admin/config/reset` | Reset configuration to `.env` defaults |
| `GET` | `/api/v1/admin/tickets` | List escalated support tickets (with status, assignee, and reporter filters) |
| `GET` | `/api/v1/admin/tickets/{ticket_id}` | Get detailed ticket details by ID |
| `PATCH` | `/api/v1/admin/tickets/{ticket_id}` | Update ticket details (status, assignee, resolution note, etc.) |
| `POST` | `/api/v1/admin/tickets/{ticket_id}/comments` | Add comment/update note to a ticket |
| `GET` | `/api/v1/admin/documents` | List uploaded documents with dynamically generated GCS signed URLs |

### User Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/users` | Register a new user (`Admin` or `User` role) |
| `GET` | `/api/v1/users` | List users with optional role and email query filtering |
| `GET` | `/api/v1/users/{user_id}` | Retrieve specific user by ID |
| `PATCH` | `/api/v1/users/{user_id}` | Update user information (name, role) |
| `DELETE` | `/api/v1/users/{user_id}` | Remove user from the system |

### Example query
```bash
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the password reset policy?"}'
```

### Example ingest
```bash
curl -X POST http://localhost:8080/api/v1/ingest \
  -F "files=@data/raw/sop_pdfs/SOP_01_Password_Reset.txt" \
  -F "doc_type=sop"
```

---

## Running with Docker

```bash
# cd dspl-nasscom-ent-kb-copilot-backend  -- navigate to the root directory
docker compose -f docker/docker-compose.yml up      # builds image + starts API + Qdrant DB + Postgres DB
docker compose -f docker/docker-compose.yml down    # tears down containers + volumes
```
---

## Evaluation (RAGAS)

Place a SQuAD v2 sample at `data/benchmarks/squad_v2_sample.json`, then:
```bash
make bench
```

Metrics reported: **Answer Faithfulness**, **Context Recall**, **Answer Relevance**, avg latency, escalation rate.

---

## Configuration (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `gemini` | LLM provider (`gemini`, `openai`, or `ollama`) |
| `GEMINI_API_KEY` | — | Required if using Google Gemini |
| `OPENAI_API_KEY` | — | Required if using OpenAI |
| `LLM_MODEL` | `gemini-2.5-flash` | Model name used for generation |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama connection endpoint |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Hugging Face model identifier for embeddings |
| `RERANKER_MODEL` | `BAAI/bge-reranker-base` | Hugging Face model identifier for BGE cross-encoder reranker |
| `TOP_K_RETRIEVE` | `20` | Candidate chunk retrieval count from vector store |
| `TOP_N_RERANK` | `5` | High-confidence chunks forwarded to LLM after reranking |
| `CONFIDENCE_THRESHOLD` | `0.4` | Minimum reranker confidence score required before answering |
| `GCS_BUCKET_NAME` | — | Google Cloud Storage bucket name for raw files & citation links |
| `FIRESTORE_PROJECT` | — | GCP project ID where Firestore database is provisioned |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service account key file (local dev environment) |
| `PII_MASKING_ENABLED` | `true` | Enable/disable Google Cloud Data Loss Prevention (DLP) API for PII masking |
| `VECTOR_STORE_BACKEND` | `qdrant` | Name of vector store backend |
| `QDRANT_URL` | `http://localhost:6333` | Endpoint for Qdrant service |
| `QDRANT_API_KEY` | — | Optional security key for Qdrant |
| `QDRANT_COLLECTION` | `kb_copilot` | Collection identifier in Qdrant |
| `VECTOR_STORE_PATH` | `data/vector_store` | Fallback local directory for vector store databases |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed origins for web API traffic |

---

## Project Structure

```
app/
├── api/v1/          # Route layer (query, stream, ingest, health, admin, users)
│   └── schemas/     # Pydantic models for API request/response validation
├── agent/           # LangGraph ReAct agent, state definition, and nodes
│   └── tools/       # ReAct tools: document_search, ticket_lookup, summariser
├── retrieval/       # Embeddings generator, vector store client (Qdrant), rerankers
├── ingestion/       # Loader utilities, document chunkers, metadata extraction
├── generation/      # Generator helper, prompt templates, evaluation guardrails
├── core/            # Base configuration, logging config, system exceptions, DLP helper
├── db/              # Firestore client CRUD helper modules (tickets, configurations, user records, query logs)
├── storage/         # GCS helper scripts (signed URL generators)
└── main.py          # FastAPI startup lifecycle hooks and router registration
scripts/
├── ingest_all.py    # Bulk ingestion tool for loading directory of documents
├── benchmark.py     # Evaluation benchmark suite (RAGAS)
└── view_audit_log.py # Print query logs audit trail
```
