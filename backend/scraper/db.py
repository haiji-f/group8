import logging
import os

from supabase import create_client, Client

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def upsert_race(client: Client, race: dict) -> None:
    client.table("races").upsert(
        race, on_conflict="race_date,venue,race_no"
    ).execute()


def upsert_horses(client: Client, horses: list[dict]) -> None:
    if not horses:
        return
    client.table("horses").upsert(
        horses, on_conflict="race_id,horse_no"
    ).execute()


def upsert_trifecta_odds(client: Client, odds_list: list[dict]) -> int:
    total = 0
    for i in range(0, len(odds_list), BATCH_SIZE):
        batch = odds_list[i : i + BATCH_SIZE]
        client.table("trifecta_odds").upsert(
            batch, on_conflict="race_id,rank1,rank2,rank3"
        ).execute()
        total += len(batch)
    return total
