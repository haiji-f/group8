def calc_ball_counts(
    horses: list[dict], K: int = 100, default_odds: float = 99.9
) -> list[dict]:
    odds_list = [h["win_odds"] if h["win_odds"] else default_odds for h in horses]
    weights = [1 / o for o in odds_list]
    total = sum(weights)
    for h, w in zip(horses, weights):
        h["ball_count"] = max(round(w / total * K), 1)
    return horses
