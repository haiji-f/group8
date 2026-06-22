"""
使い方:
  # デモ用・任意の日付を指定
  python -m scraper.main --dates 2026-06-13 2026-06-14

  # 毎週 cron 用（未指定時は翌土・日を自動計算）
  python -m scraper.main
"""

import argparse
import logging
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv

from scraper import calculator, db
from scraper.odds_scraper import fetch_trifecta_odds
from scraper.race_list import fetch_race_ids
from scraper.race_scraper import scrape_race

# ---------------------------------------------------------------------------
# ロギング設定
# ---------------------------------------------------------------------------
LOG_FILE = Path(__file__).parent.parent / "scraper.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 日付計算
# ---------------------------------------------------------------------------


def get_target_dates(args_dates: list[str] | None) -> list[date]:
    if args_dates:
        return [date.fromisoformat(d) for d in args_dates]
    today = date.today()
    days_until_sat = (5 - today.weekday()) % 7 or 7
    sat = today + timedelta(days=days_until_sat)
    sun = sat + timedelta(days=1)
    return [sat, sun]


# ---------------------------------------------------------------------------
# メイン処理
# ---------------------------------------------------------------------------


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(description="netkeiba スクレイパー")
    parser.add_argument(
        "--dates",
        nargs="*",
        metavar="YYYY-MM-DD",
        help="対象日付（複数可）。未指定時は翌土・日を自動計算。",
    )
    args = parser.parse_args()

    target_dates = get_target_dates(args.dates)
    logger.info(
        "Target dates: %s",
        ", ".join(str(d) for d in target_dates),
    )

    client = db.get_client()

    total_races = 0
    total_horses = 0
    total_odds = 0
    total_errors = 0

    for target_date in target_dates:
        date_str = target_date.strftime("%Y%m%d")
        race_date_iso = target_date.isoformat()

        try:
            netkeiba_ids = fetch_race_ids(date_str)
        except Exception as exc:
            logger.error("Failed to fetch race list for %s: %s", date_str, exc)
            total_errors += 1
            continue

        for netkeiba_race_id in netkeiba_ids:
            # --- races + horses ---
            try:
                race, horses = scrape_race(netkeiba_race_id, race_date_iso)
            except Exception as exc:
                logger.error("Failed to scrape race %s: %s", netkeiba_race_id, exc)
                total_errors += 1
                continue

            try:
                horses = calculator.calc_ball_counts(horses)
                db.upsert_race(client, race)
                db.upsert_horses(client, horses)
            except Exception as exc:
                logger.error(
                    "Failed to upsert race/horses %s: %s", netkeiba_race_id, exc
                )
                total_errors += 1
                continue

            total_races += 1
            total_horses += len(horses)
            race_id = race["race_id"]

            # --- trifecta_odds ---
            try:
                odds_list = fetch_trifecta_odds(race_id, netkeiba_race_id)
                inserted = db.upsert_trifecta_odds(client, odds_list)
                total_odds += inserted
            except Exception as exc:
                logger.error(
                    "Failed to fetch/upsert trifecta odds for %s: %s",
                    netkeiba_race_id,
                    exc,
                )
                total_errors += 1

    # --- サマリー ---
    date_labels = ", ".join(str(d) for d in target_dates)
    logger.info("[SUMMARY] 対象日付: %s", date_labels)
    logger.info("[SUMMARY] races: %d件 upsert", total_races)
    logger.info("[SUMMARY] horses: %d件 upsert", total_horses)
    logger.info("[SUMMARY] trifecta_odds: %s件 upsert", f"{total_odds:,}")
    logger.info("[SUMMARY] エラー: %d件", total_errors)


if __name__ == "__main__":
    main()
