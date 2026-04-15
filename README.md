## Quick Start (Docker)

Run the entire app locally with just **Git** and **Docker**. No Node.js, Python, or other dependencies needed on your machine.

### 1. Clone the repo

```bash
git clone https://github.com/tristcoil/zero-sum-public.git
cd zero-sum-public
```

### 2. Create the config file

```bash
cp .env.example .env
```

That's it — the defaults work out of the box. The app runs fully without any API keys.

> **Optional:** If you want AI-generated stock analysis summaries, open `.env` and add your [OpenAI API key](https://platform.openai.com/api-keys). Everything else (charts, market data, heatmaps, screeners, etc.) works without it.

### 3. Start the app

```bash
docker compose up --build
```

First build takes a few minutes (downloading dependencies, building images). Subsequent starts are fast.

### 4. Open in your browser

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

> **Note:** On first start, the background scheduler begins fetching market data. Give it a minute or two for the landing page, heatmap, and other sections to populate.

### Stopping

```bash
# Stop all containers (data is preserved in ./data/)
docker compose down
```

### Updating

```bash
git pull
docker compose up --build
```

---

## What's Inside

| Container | Description |
|-----------|-------------|
| **backend** | Flask API — serves market data, fundamentals, analysis |
| **scheduler** | Background worker — fetches & caches Yahoo Finance data on a schedule |
| **frontend** | Next.js UI — the full dashboard and charting terminal |

All market data is cached in the `./data/` directory on your machine and persists across restarts.

---

## Configuration

All configuration lives in the project root `.env`. Edit it to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(empty)* | OpenAI key for AI analysis (optional) |
| `OPENAI_ORG_ID` | *(empty)* | OpenAI org ID (optional) |
| `ANALYSIS_MODEL` | `gpt-4o` | Which OpenAI model to use |
| `ANALYSIS_CACHE_HOURS` | `24` | How long to cache AI analysis results |

The scheduler timing and cache TTL can be tuned via `docker-compose.yml` environment variables — the defaults are sensible for local use.

---

## Development (without Docker)

If you prefer running things natively for development:

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
python app.py

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and the backend API on `http://localhost:5000`.

---
