# RepairTrack Backend

FastAPI backend foundation for the RepairTrack repair management platform.

## Prerequisites

- Python 3.11+

## Setup

### 1. Create and activate a virtual environment

```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
# Copy the example and edit as needed
copy .env.example .env
```

### 4. Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Open API documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc:       http://localhost:8000/redoc

### 6. Test the health endpoint

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "RepairTrack API",
  "version": "0.1.0"
}
```

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application and middleware
│   ├── core/
│   │   └── config.py     # Centralized settings (loaded from .env)
│   ├── api/
│   │   └── routes/
│   │       └── health.py # GET /api/v1/health
│   ├── models/           # Database models (future phases)
│   ├── schemas/          # Pydantic schemas (future phases)
│   ├── services/         # Business logic (future phases)
│   └── utils/            # Shared helpers (future phases)
├── .env                  # Local secrets — not committed
├── .env.example          # Safe template to share
├── .gitignore
├── requirements.txt
└── README.md
```

## Phase Status

| Phase | Feature | Status |
|-------|---------|--------|
| 4.1   | Backend foundation & health endpoint | ✅ Complete |
| 4.2+  | Authentication, database, APIs | 🔜 Upcoming |
