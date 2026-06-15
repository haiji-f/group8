#!/bin/bash
# cron/run.sh
# 毎週金曜 21:00 に cron から実行される。
# --dates 未指定で main.py が翌土・日を自動計算する。

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/scraper.log"
PYTHON="$PROJECT_DIR/.venv/bin/python"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting weekly scraper" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# .env を読み込む
set -a && source .env && set +a

$PYTHON -m scraper.main >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed successfully" >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

exit $EXIT_CODE
