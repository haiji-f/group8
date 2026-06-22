import type { Horse, Race } from "../types";
import { supabase } from "./supabase";

interface DBRace {
  race_id: string;
  race_name: string;
  venue: string;
  post_time: string | null;
  num_horses: number;
  distance: number;
  surface: string;
}

interface DBHorse {
  horse_no: number;
  post_no: number;
  horse_name: string;
  ball_count: number | null;
  jockey: string | null;
  win_odds: number | string | null;
}

// Mock Data matching the seed SQL exactly
const MOCK_RACES: Race[] = [
  {
    race_id: "2026_001",
    race_name: "第67回宝塚記念 (G1)",
    venue: "阪神",
    post_time: "15:40",
    num_horses: 8,
    distance: 2200,
    track_type: "Turf",
  },
  {
    race_id: "2026_002",
    race_name: "第93回日本ダービー (G1)",
    venue: "東京",
    post_time: "15:40",
    num_horses: 10,
    distance: 2400,
    track_type: "Turf",
  },
  {
    race_id: "2026_003",
    race_name: "第71回有馬記念 (G1)",
    venue: "中山",
    post_time: "15:25",
    num_horses: 12,
    distance: 2500,
    track_type: "Turf",
  },
];

const MOCK_HORSES: Record<string, Horse[]> = {
  "2026_001": [
    {
      horse_no: 1,
      horse_name: "ドウデュース",
      post_no: 1,
      ball_count: 35,
      jockey_name: "武豊",
      odds_win: 2.1,
    },
    {
      horse_no: 2,
      horse_name: "ジャスティンパレス",
      post_no: 2,
      ball_count: 25,
      jockey_name: "ルメール",
      odds_win: 3.8,
    },
    {
      horse_no: 3,
      horse_name: "ベラジオオペラ",
      post_no: 3,
      ball_count: 18,
      jockey_name: "横山和",
      odds_win: 5.6,
    },
    {
      horse_no: 4,
      horse_name: "ソールオリエンス",
      post_no: 4,
      ball_count: 15,
      jockey_name: "横山武",
      odds_win: 7.4,
    },
    {
      horse_no: 5,
      horse_name: "ローシャムパーク",
      post_no: 5,
      ball_count: 12,
      jockey_name: "戸崎",
      odds_win: 9.2,
    },
    {
      horse_no: 6,
      horse_name: "ブローザホーン",
      post_no: 6,
      ball_count: 20,
      jockey_name: "菅原明",
      odds_win: 4.5,
    },
    {
      horse_no: 7,
      horse_name: "プラダリア",
      post_no: 7,
      ball_count: 8,
      jockey_name: "池添",
      odds_win: 15.3,
    },
    {
      horse_no: 8,
      horse_name: "カラテ",
      post_no: 8,
      ball_count: 4,
      jockey_name: "国分優",
      odds_win: 45.0,
    },
  ],
  "2026_002": [
    {
      horse_no: 1,
      horse_name: "レガレイラ",
      post_no: 1,
      ball_count: 30,
      jockey_name: "ルメール",
      odds_win: 2.8,
    },
    {
      horse_no: 2,
      horse_name: "ジャスティンミラノ",
      post_no: 2,
      ball_count: 35,
      jockey_name: "戸崎",
      odds_win: 2.2,
    },
    {
      horse_no: 3,
      horse_name: "コスモキュランダ",
      post_no: 3,
      ball_count: 15,
      jockey_name: "デムーロ",
      odds_win: 7.1,
    },
    {
      horse_no: 4,
      horse_name: "アーバンシック",
      post_no: 4,
      ball_count: 20,
      jockey_name: "横山武",
      odds_win: 5.2,
    },
    {
      horse_no: 5,
      horse_name: "シンエンペラー",
      post_no: 5,
      ball_count: 18,
      jockey_name: "坂井",
      odds_win: 6.0,
    },
    {
      horse_no: 6,
      horse_name: "シックスペンス",
      post_no: 6,
      ball_count: 12,
      jockey_name: "川田",
      odds_win: 9.8,
    },
    {
      horse_no: 7,
      horse_name: "ダノンデサイル",
      post_no: 7,
      ball_count: 8,
      jockey_name: "横山典",
      odds_win: 18.5,
    },
    {
      horse_no: 8,
      horse_name: "エコロヴァルツ",
      post_no: 7,
      ball_count: 6,
      jockey_name: "岩田康",
      odds_win: 28.0,
    },
    {
      horse_no: 9,
      horse_name: "サンライズジパング",
      post_no: 8,
      ball_count: 5,
      jockey_name: "菅原明",
      odds_win: 35.0,
    },
    {
      horse_no: 10,
      horse_name: "メイショウタバル",
      post_no: 8,
      ball_count: 4,
      jockey_name: "浜中",
      odds_win: 48.0,
    },
  ],
  "2026_003": [
    {
      horse_no: 1,
      horse_name: "イクイノックス",
      post_no: 1,
      ball_count: 40,
      jockey_name: "ルメール",
      odds_win: 1.8,
    },
    {
      horse_no: 2,
      horse_name: "リバティアイランド",
      post_no: 2,
      ball_count: 30,
      jockey_name: "川田",
      odds_win: 3.0,
    },
    {
      horse_no: 3,
      horse_name: "タイトルホルダー",
      post_no: 3,
      ball_count: 22,
      jockey_name: "横山和",
      odds_win: 4.5,
    },
    {
      horse_no: 4,
      horse_name: "スターズオンアース",
      post_no: 4,
      ball_count: 18,
      jockey_name: "ビュイック",
      odds_win: 6.2,
    },
    {
      horse_no: 5,
      horse_name: "ドウデュース",
      post_no: 5,
      ball_count: 25,
      jockey_name: "武豊",
      odds_win: 3.5,
    },
    {
      horse_no: 6,
      horse_name: "ソールオリエンス",
      post_no: 6,
      ball_count: 12,
      jockey_name: "川田",
      odds_win: 9.5,
    },
    {
      horse_no: 7,
      horse_name: "タスティエーラ",
      post_no: 7,
      ball_count: 10,
      jockey_name: "ムーア",
      odds_win: 12.0,
    },
    {
      horse_no: 8,
      horse_name: "ハーパー",
      post_no: 7,
      ball_count: 6,
      jockey_name: "岩田望",
      odds_win: 32.0,
    },
    {
      horse_no: 9,
      horse_name: "スルーセブンシーズ",
      post_no: 8,
      ball_count: 14,
      jockey_name: "池添",
      odds_win: 8.2,
    },
    {
      horse_no: 10,
      horse_name: "ディープボンド",
      post_no: 8,
      ball_count: 8,
      jockey_name: "和田竜",
      odds_win: 22.0,
    },
    {
      horse_no: 11,
      horse_name: "ライラック",
      post_no: 8,
      ball_count: 5,
      jockey_name: "戸崎",
      odds_win: 42.0,
    },
    {
      horse_no: 12,
      horse_name: "アイアンバローズ",
      post_no: 8,
      ball_count: 4,
      jockey_name: "石橋脩",
      odds_win: 65.0,
    },
  ],
};

// Hardcoded sample trio odds for seed match
const MOCK_TRIO_ODDS: Record<string, number> = {
  "2026_001_1_2_3": 42.5,
  "2026_001_1_2_6": 38.2,
  "2026_001_1_6_2": 49.0,
  "2026_001_2_1_3": 76.5,
  "2026_001_2_1_6": 68.0,
  "2026_001_6_1_2": 112.4,
  "2026_001_1_3_4": 145.8,
  "2026_001_3_1_2": 189.0,
  "2026_001_1_2_8": 850.5,
  "2026_001_8_7_5": 25400.0,
};

export async function getRaces(): Promise<Race[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("races")
        .select("*")
        .order("post_time", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        return (data as DBRace[]).map((r) => ({
          race_id: r.race_id,
          race_name: r.race_name,
          venue: r.venue,
          post_time: r.post_time ? r.post_time.substring(0, 5) : "",
          num_horses: r.num_horses,
          distance: r.distance,
          track_type: r.surface === "芝" ? "Turf" : "Dirt",
        }));
      }
    } catch (e) {
      console.error("Failed to fetch races from Supabase, falling back to Mock:", e);
    }
  }

  // Simulate network delay for premium feel
  await new Promise((resolve) => setTimeout(resolve, 600));
  return MOCK_RACES;
}

export async function getHorses(raceId: string): Promise<Horse[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("horses")
        .select("*")
        .eq("race_id", raceId)
        .order("horse_no", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        return (data as DBHorse[]).map((h) => ({
          horse_no: h.horse_no,
          post_no: h.post_no,
          horse_name: h.horse_name,
          ball_count: h.ball_count || 5,
          jockey_name: h.jockey || "",
          odds_win: Number(h.win_odds || 0),
        }));
      }
    } catch (e) {
      console.error(`Failed to fetch horses for ${raceId} from Supabase, falling back to Mock:`, e);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_HORSES[raceId] || [];
}

export async function getTrioOdds(
  raceId: string,
  rank1: number,
  rank2: number,
  rank3: number,
): Promise<number> {
  const [combo1, combo2, combo3] = [rank1, rank2, rank3].sort((a, b) => a - b);

  // If supabase is active, query DB
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("trifecta_odds")
        .select("odds_value")
        .eq("race_id", raceId)
        .eq("rank1", combo1)
        .eq("rank2", combo2)
        .eq("rank3", combo3)
        .single();

      if (!error && data) {
        return Number(data.odds_value);
      }
    } catch (e) {
      console.error("Supabase trio odds lookup failed, calculating fallback:", e);
    }
  }

  // Look in mock dictionary first
  const key = `${raceId}_${combo1}_${combo2}_${combo3}`;
  if (MOCK_TRIO_ODDS[key]) {
    return MOCK_TRIO_ODDS[key];
  }

  // Dynamically calculate a realistic payout if not pre-seeded
  // Get the horses' single win odds
  let horses: Horse[] = [];
  if (supabase) {
    horses = await getHorses(raceId);
  }
  if (!horses || horses.length === 0) {
    horses = MOCK_HORSES[raceId] || [];
  }
  const h1 = horses.find((h) => h.horse_no === rank1);
  const h2 = horses.find((h) => h.horse_no === rank2);
  const h3 = horses.find((h) => h.horse_no === rank3);

  const win1 = h1 ? h1.odds_win : 5.0;
  const win2 = h2 ? h2.odds_win : 8.0;
  const win3 = h3 ? h3.odds_win : 12.0;

  // Trio formula that scales with horse odds:
  // e.g. popular horses (low odds) -> low payout, longshots (high odds) -> massive payout!
  // formula: odds = win1 * (win2 + 1.5) * (win3 + 3.0) * coefficient
  // We use 0.7 as coefficient to reflect standard pari-mutuel takeout rates.
  const coefficient = 0.75;
  let computedOdds = win1 * (win2 + 1.5) * (win3 + 3.0) * coefficient;

  // Cap and format
  computedOdds = Math.max(5.0, computedOdds);
  return Math.round(computedOdds * 10) / 10;
}
