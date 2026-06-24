export interface Race {
  race_id: string;
  race_name: string;
  venue: string;
  post_time: string;
  num_horses: number;
  distance: number;
  track_type: "Turf" | "Dirt";
  race_date: string;
}

export interface Horse {
  horse_no: number; // 馬番
  post_no: number; // 枠番 (1-8)
  horse_name: string; // 馬名
  ball_count: number; // 割り当てボール数
  jockey_name: string; // 騎手名
  odds_win: number; // 単勝オッズ
}

export interface RankingResult {
  rank1: number; // 1頭目の horse_no
  rank2: number; // 2頭目の horse_no
  rank3: number; // 3頭目の horse_no
}

export interface TrioOdds {
  race_id: string;
  rank1: number;
  rank2: number;
  rank3: number;
  odds: number;
}
