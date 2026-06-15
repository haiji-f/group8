import logging
import re
import time
from datetime import UTC, datetime

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

# netkeiba 競馬場コード → 英語キー / 日本語名
_VENUE_EN = {
    "01": "sapporo", "02": "hakodate", "03": "fukushima",
    "04": "niigata", "05": "tokyo",    "06": "nakayama",
    "07": "chukyo",  "08": "kyoto",   "09": "hanshin",
    "10": "kokura",
}
_VENUE_JP = {
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉",
}


def make_race_id(netkeiba_race_id: str, race_date: str) -> str:
    """自前形式 race_id を生成する。例: 20260613_hanshin_01"""
    venue_code = netkeiba_race_id[4:6]
    venue_en = _VENUE_EN.get(venue_code, f"venue{venue_code}")
    race_no = int(netkeiba_race_id[10:12])
    date_nodash = race_date.replace("-", "")
    return f"{date_nodash}_{venue_en}_{race_no:02d}"


def scrape_race(netkeiba_race_id: str, race_date: str) -> tuple[dict, list[dict]]:
    """
    出馬表ページをスクレイピングして (race dict, horses list) を返す。
    race_date: "YYYY-MM-DD"
    """
    url = f"https://race.netkeiba.com/race/shutuba.html?race_id={netkeiba_race_id}"
    logger.info("Fetching shutuba: %s", url)

    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = "EUC-JP"
    soup = BeautifulSoup(resp.text, "html.parser")

    venue_code = netkeiba_race_id[4:6]
    venue_jp = _VENUE_JP.get(venue_code, venue_code)
    race_no = int(netkeiba_race_id[10:12])
    race_id = make_race_id(netkeiba_race_id, race_date)

    # レース名
    race_name_el = soup.find(class_="RaceName")
    race_name = race_name_el.get_text(strip=True) if race_name_el else None

    # 芝/ダート・距離・発走時刻 — RaceData01 内
    surface: str | None = None
    distance: int | None = None
    post_time: str | None = None
    data01 = soup.find(class_="RaceData01")
    if data01:
        text01 = data01.get_text()
        m = re.search(r"(芝|ダート|ダ|障害)(\d+)m", text01)
        if m:
            raw = m.group(1)
            surface = "ダート" if raw == "ダ" else raw
            distance = int(m.group(2))
        m2 = re.search(r"(\d{1,2}:\d{2})発走", text01)
        if m2:
            post_time = m2.group(1) + ":00"

    # 未取得時のフォールバック（NOT NULL 制約対応）
    if surface is None:
        logger.warning("surface not found for %s — using '不明'", netkeiba_race_id)
        surface = "不明"
    if distance is None:
        logger.warning("distance not found for %s — using 0", netkeiba_race_id)
        distance = 0

    # 出走馬テーブル
    horses: list[dict] = []
    table = soup.find("table", class_="Shutuba_Table")
    if table:
        for tr in table.find_all("tr"):
            post_no = _text_int(tr, "Waku")
            horse_no = _text_int(tr, "Umaban")
            if horse_no is None:
                continue

            horse_name_el = tr.find(class_="HorseName")
            horse_name = (
                horse_name_el.find("a").get_text(strip=True)
                if horse_name_el and horse_name_el.find("a")
                else None
            )
            if not horse_name:
                continue

            jockey_el = tr.find(class_="Jockey")
            jockey = (
                jockey_el.find("a").get_text(strip=True)
                if jockey_el and jockey_el.find("a")
                else None
            )

            win_odds: float | None = None
            for cls in ("Txt_R", "Odds"):
                odds_el = tr.find(class_=cls)
                if odds_el:
                    try:
                        win_odds = float(odds_el.get_text(strip=True).replace(",", ""))
                    except ValueError:
                        pass
                    break

            horses.append({
                "race_id": race_id,
                "horse_no": horse_no,
                "post_no": post_no,
                "horse_name": horse_name,
                "jockey": jockey,
                "win_odds": win_odds,
            })

    scraped_at = datetime.now(UTC).isoformat()
    race = {
        "race_id": race_id,
        "netkeiba_race_id": netkeiba_race_id,
        "race_date": race_date,
        "venue": venue_jp,
        "race_no": race_no,
        "race_name": race_name,
        "surface": surface,
        "distance": distance,
        "post_time": post_time,
        "num_horses": len(horses),
        "scraped_at": scraped_at,
    }

    # win_odds が全て None の場合（過去レース）は結果ページから確定オッズを補完
    if all(h["win_odds"] is None for h in horses):
        confirmed = _fetch_confirmed_win_odds(netkeiba_race_id)
        if confirmed:
            for h in horses:
                h["win_odds"] = confirmed.get(h["horse_no"])

    time.sleep(1.5)
    return race, horses


def _fetch_confirmed_win_odds(netkeiba_race_id: str) -> dict[int, float]:
    """結果ページから確定単勝オッズを取得して {馬番: オッズ} を返す。"""
    url = f"https://race.netkeiba.com/race/result.html?race_id={netkeiba_race_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        resp.encoding = "EUC-JP"
        soup = BeautifulSoup(resp.text, "html.parser")

        table = soup.find("table", class_="RaceTable01")
        if not table:
            return {}

        result: dict[int, float] = {}
        for tr in table.find_all("tr")[1:]:
            odds_el = tr.find(class_=lambda c: c and "Odds" in c and "Txt_R" in c)

            # 馬番は "Num Txt_C" クラスのセル
            num_cells = tr.find_all(class_="Txt_C")
            horse_no = None
            for cell in num_cells:
                classes = cell.get("class", [])
                if "Num" in classes and "Txt_C" in classes:
                    try:
                        horse_no = int(cell.get_text(strip=True))
                    except ValueError:
                        pass
                    break

            if horse_no is None:
                continue

            # 単勝オッズは "Odds Txt_R" クラスのセル
            odds_el = tr.find(
                lambda tag: tag.name == "td"
                and "Odds" in (tag.get("class") or [])
                and "Txt_R" in (tag.get("class") or [])
            )
            if odds_el:
                try:
                    txt = odds_el.get_text(strip=True).replace(",", "")
                    result[horse_no] = float(txt)
                except ValueError:
                    pass

        logger.info("Confirmed win odds fetched: %d horses", len(result))
        time.sleep(1.5)
        return result

    except Exception as exc:
        logger.warning(
            "Failed to fetch confirmed odds for %s: %s", netkeiba_race_id, exc
        )
        return {}


def _text_int(tr, class_prefix: str) -> int | None:
    # 実際のクラスは Waku1/Waku2... や Umaban1/Umaban2... のように番号付き
    el = tr.find(class_=re.compile(rf"^{class_prefix}"))
    if el:
        try:
            return int(el.get_text(strip=True))
        except ValueError:
            pass
    return None
