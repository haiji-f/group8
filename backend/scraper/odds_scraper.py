"""
三連単オッズを netkeiba API から取得する。

API エンドポイント:
  https://race.netkeiba.com/api/api_get_jra_odds.html
  type=7 → 三連複（6文字キー: rank1+rank2+rank3 の組合せ）
  type=6 → 三連単ペア（4文字キー: rank1+rank2）※全組合せではない

取得戦略:
  type=7（三連複）で全組合せを取得し、6通りの順列に展開して
  三連単オッズの近似値として trifecta_odds テーブルに保存する。
  （実際の三連単確定オッズを全組合せ分取得する公式APIは未提供のため）
"""

import base64
import itertools
import logging
import re
import time
import zlib
from datetime import UTC, datetime

import requests

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://race.netkeiba.com/",
}

_API_BASE = "https://race.netkeiba.com/api/api_get_jra_odds.html"


def fetch_trifecta_odds(race_id: str, netkeiba_race_id: str) -> list[dict]:
    """
    三連複 API から取得し、6通りの順列に展開して三連単オッズを返す。
    戻り値: (race_id, rank1, rank2, rank3, odds_value, scraped_at) のリスト
    """
    scraped_at = datetime.now(UTC).isoformat()

    raw = _fetch_sanrenfuku(netkeiba_race_id)
    if not raw:
        logger.warning("No trifecta odds fetched for %s", netkeiba_race_id)
        return []

    result: list[dict] = []
    for (h1, h2, h3), odds_value in raw.items():
        for r1, r2, r3 in itertools.permutations([h1, h2, h3]):
            result.append({
                "race_id": race_id,
                "rank1": r1,
                "rank2": r2,
                "rank3": r3,
                "odds_value": odds_value,
                "scraped_at": scraped_at,
            })

    logger.info(
        "Trifecta odds for %s: %d triplets → %d permutations",
        race_id, len(raw), len(result),
    )
    time.sleep(1.5)
    return result


def _fetch_sanrenfuku(netkeiba_race_id: str) -> dict[tuple[int, int, int], float]:
    """三連複オッズを API から取得して {(h1,h2,h3): odds} を返す。"""
    url = (
        f"{_API_BASE}?pid=api_get_jra_odds&input=UTF-8&output=jsonp"
        f"&callback=cb&race_id={netkeiba_race_id}"
        f"&type=7&action=init&sort=odds&compress=1"
    )
    logger.info("Fetching sanrenfuku odds API: race_id=%s", netkeiba_race_id)

    resp = requests.get(url, headers=_HEADERS, timeout=30)
    resp.raise_for_status()

    # JSONP → JSON → zlib 解凍
    json_str = re.sub(r"^cb\(|\)$", "", resp.text.strip())
    payload = __import__("json").loads(json_str)
    raw_odds = __import__("json").loads(
        zlib.decompress(base64.b64decode(payload["data"]))
    )

    odds_map: dict[tuple[int, int, int], float] = {}
    for key, val in raw_odds["odds"].get("7", {}).items():
        if len(key) != 6:
            continue
        try:
            odds_value = float(val[0].replace(",", ""))
        except (ValueError, IndexError):
            continue
        if odds_value <= 0:
            continue  # 除外馬や無効組合せ

        h1, h2, h3 = int(key[:2]), int(key[2:4]), int(key[4:6])
        odds_map[(h1, h2, h3)] = odds_value

    logger.info("Sanrenfuku entries: %d valid", len(odds_map))
    return odds_map
