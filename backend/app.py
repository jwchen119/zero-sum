"""
Flask API — Stock Analytics Backend
Registers blueprints and applies middleware (CORS, rate-limiting, cache headers).
"""

import json
import logging
import math
import os
import threading

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))
except ImportError:
    pass

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# ─── App & extensions ────────────────────────────────────

from flask.json.provider import DefaultJSONProvider

class _SafeJSONProvider(DefaultJSONProvider):
    """Recursively convert NaN/Inf to None so responses are always valid JSON."""
    def dumps(self, obj, **kwargs):
        return super().dumps(self._sanitize(obj), **kwargs)

    @classmethod
    def _sanitize(cls, obj):
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: cls._sanitize(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [cls._sanitize(v) for v in obj]
        return obj


app = Flask(__name__)
app.json_provider_class = _SafeJSONProvider
app.json = _SafeJSONProvider(app)
CORS(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)

logger = logging.getLogger(__name__)

# ─── Register blueprints ─────────────────────────────────

from routes.core import core_bp
from routes.market import market_bp
from routes.screener import screener_bp
from routes.trading import trading_bp
from routes.alternative import alternative_bp
from routes.ta import ta_bp
from routes.status import status_bp
from routes.news import news_bp

app.register_blueprint(core_bp)
app.register_blueprint(market_bp)
app.register_blueprint(screener_bp)
app.register_blueprint(trading_bp)
app.register_blueprint(alternative_bp)
app.register_blueprint(ta_bp)
app.register_blueprint(status_bp)
app.register_blueprint(news_bp)

# ─── Rate-limit specific endpoints ───────────────────────
# Applied here since limiter lives in app.py and blueprints
# use the shared limiter via decorators or explicit limits.

with app.app_context():
    limiter.limit("30 per minute")(app.view_functions["trading.api_scanner"])
    limiter.limit("20 per minute")(app.view_functions["trading.api_portfolio_analyze"])

# ─── Response caching headers ─────────────────────────────

_CACHE_CONTROL_MAP = {
    "/api/market-summary": "public, max-age=300, stale-while-revalidate=60",
    "/api/sector-performance": "public, max-age=300, stale-while-revalidate=60",
    "/api/market-movers": "public, max-age=300, stale-while-revalidate=60",
    "/api/earnings-calendar": "public, max-age=3600, stale-while-revalidate=300",
    "/api/market-news": "public, max-age=600, stale-while-revalidate=120",
    "/api/coverage-tickers": "public, max-age=3600, stale-while-revalidate=600",
    "/api/etf-overview": "public, max-age=300, stale-while-revalidate=60",
    "/api/screener": "public, max-age=60, stale-while-revalidate=30",
    "/api/heatmap": "public, max-age=60, stale-while-revalidate=30",
    "/api/bulk-prices": "public, max-age=300, stale-while-revalidate=60",
    "/api/bulk-fundamentals": "public, max-age=3600, stale-while-revalidate=300",
    "/api/landing": "public, max-age=300, stale-while-revalidate=60",
    "/api/stock-detail": "public, max-age=300, stale-while-revalidate=60",
    "/api/sectors": "public, max-age=60, stale-while-revalidate=30",
    "/api/dividend-screener": "public, max-age=60, stale-while-revalidate=30",
    "/api/financials": "public, max-age=300, stale-while-revalidate=60",
    "/api/compare": "public, max-age=60, stale-while-revalidate=30",
    "/api/scanner": "public, max-age=60, stale-while-revalidate=30",
    "/api/volume-profile": "public, max-age=300, stale-while-revalidate=60",
    "/api/correlation": "public, max-age=300, stale-while-revalidate=60",
    "/api/sector-correlation": "public, max-age=300, stale-while-revalidate=60",
    "/api/sector-valuation": "public, max-age=300, stale-while-revalidate=60",
    "/api/earnings-full": "public, max-age=3600, stale-while-revalidate=300",
    "/api/insiders": "public, max-age=300, stale-while-revalidate=60",
    "/api/congress-trades": "public, max-age=3600, stale-while-revalidate=300",
    "/api/ta/patterns": "public, max-age=3600, stale-while-revalidate=300",
    "/api/ta/trendlines": "public, max-age=3600, stale-while-revalidate=300",
    "/api/ta/scan": "public, max-age=1800, stale-while-revalidate=300",
    "/api/portfolio/analyze": "private, max-age=60, stale-while-revalidate=30",
    "/api/stock-news": "public, max-age=600, stale-while-revalidate=120",
    "/api/article-extract": "public, max-age=86400, stale-while-revalidate=3600",
    "/api/stock-news-summary": "public, max-age=1800, stale-while-revalidate=300",
    "/api/system-status": "private, no-cache",
}


@app.after_request
def _add_cache_headers(response):
    """Attach Cache-Control headers so browsers/CDN/proxies cache responses."""
    if response.status_code == 200:
        path = request.path
        for prefix, header in _CACHE_CONTROL_MAP.items():
            if path.startswith(prefix):
                response.headers["Cache-Control"] = header
                break
    return response


# ─── Startup: pre-warm heavy caches ─────────────────────

def _prewarm_caches():
    """Pre-build screener and heatmap caches on startup."""
    from routes.screener import _get_screener_data, rebuild_heatmap_disk_cache, rebuild_sector_analysis_disk_cache

    try:
        logger.info("[startup] Pre-warming screener cache...")
        _get_screener_data()
        logger.info("[startup] Pre-warming heatmap disk cache...")
        rebuild_heatmap_disk_cache()
        logger.info("[startup] Pre-warming sector analysis disk cache...")
        rebuild_sector_analysis_disk_cache()
        logger.info("[startup] Cache pre-warm complete.")
    except Exception as exc:
        logger.error(f"[startup] Pre-warm error: {exc}")


threading.Thread(target=_prewarm_caches, daemon=True).start()

# ─── Health check ─────────────────────────────────────────


@app.route("/api/health")
def api_health():
    """Simple health check for Docker / load balancer probes."""
    import os
    from shared import CACHE_DIR, BATCH_DATA_DIR
    batch_count = 0
    if os.path.isdir(BATCH_DATA_DIR):
        batch_count = len([f for f in os.listdir(BATCH_DATA_DIR) if f.endswith(".json")])
    return jsonify({
        "status": "ok",
        "cachedTickers": batch_count,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
