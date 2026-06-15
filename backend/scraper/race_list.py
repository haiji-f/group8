import logging
import re
import time

import requests

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


def fetch_race_ids(date_str: str) -> list[str]:
    """
    date_str: "YYYYMMDD" 形式
    returns: netkeiba の 12 桁 race_id のリスト (昇順)
    """
    url = f"https://race.netkeiba.com/top/race_list_sub.html?kaisai_date={date_str}"
    logger.info("Fetching race list: %s", url)

    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = "EUC-JP"

    race_ids = sorted(set(re.findall(r"race_id=(\d{12})", resp.text)))
    logger.info("Found %d race(s) for %s", len(race_ids), date_str)

    time.sleep(1.5)
    return race_ids
