import logging
import os
from datetime import date, timedelta

from supabase import Client, create_client

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def upsert_race(client: Client, race: dict) -> None:
    client.table("races").upsert(race, on_conflict="race_date,venue,race_no").execute()


def upsert_horses(client: Client, horses: list[dict]) -> None:
    if not horses:
        return
    client.table("horses").upsert(horses, on_conflict="race_id,horse_no").execute()


def delete_old_data(client: Client) -> int:
    """今週の土曜より前のレースと関連データを削除する。"""
    today = date.today()
    days_since_sat = (today.weekday() - 5) % 7
    this_saturday = today - timedelta(days=days_since_sat)
    cutoff = this_saturday.isoformat()
    resp = client.table("races").select("race_id").lt("race_date", cutoff).execute()
    old_ids = [r["race_id"] for r in resp.data]
    if not old_ids:
        logger.info("delete_old_data: no old data (cutoff=%s)", cutoff)
        return 0
    for i in range(0, len(old_ids), BATCH_SIZE):
        batch = old_ids[i : i + BATCH_SIZE]
        client.table("trifecta_odds").delete().in_("race_id", batch).execute()
        client.table("horses").delete().in_("race_id", batch).execute()
    client.table("races").delete().lt("race_date", cutoff).execute()
    logger.info("delete_old_data: deleted %d races before %s", len(old_ids), cutoff)
    return len(old_ids)


def upsert_trifecta_odds(client: Client, odds_list: list[dict]) -> int:
    total = 0
    for i in range(0, len(odds_list), BATCH_SIZE):
        batch = odds_list[i : i + BATCH_SIZE]
        client.table("trifecta_odds").upsert(
            batch, on_conflict="race_id,rank1,rank2,rank3"
        ).execute()
        total += len(batch)
    return total
