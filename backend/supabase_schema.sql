-- Supabase database schema for Ball-Drop Trifecta Lottery App

-- 1. Create races table
CREATE TABLE IF NOT EXISTS public.races (
    race_id TEXT PRIMARY KEY,
    race_name TEXT NOT NULL,
    venue TEXT NOT NULL,
    post_time TEXT NOT NULL,
    num_horses INTEGER NOT NULL,
    distance INTEGER NOT NULL,
    track_type TEXT NOT NULL CHECK (track_type IN ('Turf', 'Dirt')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create horses table
CREATE TABLE IF NOT EXISTS public.horses (
    race_id TEXT REFERENCES public.races(race_id) ON DELETE CASCADE,
    horse_no INTEGER NOT NULL,
    horse_name TEXT NOT NULL,
    post_no INTEGER NOT NULL CHECK (post_no BETWEEN 1 AND 8),
    ball_count INTEGER NOT NULL DEFAULT 5 CHECK (ball_count >= 1),
    jockey_name TEXT NOT NULL,
    odds_win NUMERIC(6, 1) NOT NULL,
    PRIMARY KEY (race_id, horse_no)
);

-- 3. Create trifecta_odds table
CREATE TABLE IF NOT EXISTS public.trifecta_odds (
    race_id TEXT REFERENCES public.races(race_id) ON DELETE CASCADE,
    rank1 INTEGER NOT NULL,
    rank2 INTEGER NOT NULL,
    rank3 INTEGER NOT NULL,
    odds NUMERIC(8, 1) NOT NULL,
    PRIMARY KEY (race_id, rank1, rank2, rank3)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_horses_race_id ON public.horses(race_id);
CREATE INDEX IF NOT EXISTS idx_trifecta_odds_lookup ON public.trifecta_odds(race_id, rank1, rank2, rank3);

-- Seed Sample Data

-- Races
INSERT INTO public.races (race_id, race_name, venue, post_time, num_horses, distance, track_type)
VALUES
('2026_001', '第67回宝塚記念 (G1)', '阪神', '15:40', 8, 2200, 'Turf'),
('2026_002', '第93回日本ダービー (G1)', '東京', '15:40', 10, 2400, 'Turf'),
('2026_003', '第71回有馬記念 (G1)', '中山', '15:25', 12, 2500, 'Turf')
ON CONFLICT (race_id) DO NOTHING;

-- Horses for 宝塚記念 (8 Horses)
INSERT INTO public.horses (race_id, horse_no, horse_name, post_no, ball_count, jockey_name, odds_win)
VALUES
('2026_001', 1, 'ドウデュース', 1, 35, '武豊', 2.1),
('2026_001', 2, 'ジャスティンパレス', 2, 25, 'ルメール', 3.8),
('2026_001', 3, 'ベラジオオペラ', 3, 18, '横山和', 5.6),
('2026_001', 4, 'ソールオリエンス', 4, 15, '横山武', 7.4),
('2026_001', 5, 'ローシャムパーク', 5, 12, '戸崎', 9.2),
('2026_001', 6, 'ブローザホーン', 6, 20, '菅原明', 4.5),
('2026_001', 7, 'プラダリア', 7, 8, '池添', 15.3),
('2026_001', 8, 'カラテ', 8, 4, '国分優', 45.0)
ON CONFLICT (race_id, horse_no) DO NOTHING;

-- Horses for 日本ダービー (10 Horses)
INSERT INTO public.horses (race_id, horse_no, horse_name, post_no, ball_count, jockey_name, odds_win)
VALUES
('2026_002', 1, 'レガレイラ', 1, 30, 'ルメール', 2.8),
('2026_002', 2, 'ジャスティンミラノ', 2, 35, '戸崎', 2.2),
('2026_002', 3, 'コスモキュランダ', 3, 15, 'デムーロ', 7.1),
('2026_002', 4, 'アーバンシック', 4, 20, '横山武', 5.2),
('2026_002', 5, 'シンエンペラー', 5, 18, '坂井', 6.0),
('2026_002', 6, 'シックスペンス', 6, 12, '川田', 9.8),
('2026_002', 7, 'ダノンデサイル', 7, 8, '横山典', 18.5),
('2026_002', 8, 'エコロヴァルツ', 7, 6, '岩田康', 28.0),
('2026_002', 9, 'サンライズジパング', 8, 5, '菅原明', 35.0),
('2026_002', 10, 'メイショウタバル', 8, 4, '浜中', 48.0)
ON CONFLICT (race_id, horse_no) DO NOTHING;

-- Horses for 有馬記念 (12 Horses)
INSERT INTO public.horses (race_id, horse_no, horse_name, post_no, ball_count, jockey_name, odds_win)
VALUES
('2026_003', 1, 'イクイノックス', 1, 40, 'ルメール', 1.8),
('2026_003', 2, 'リバティアイランド', 2, 30, '川田', 3.0),
('2026_003', 3, 'タイトルホルダー', 3, 22, '横山和', 4.5),
('2026_003', 4, 'スターズオンアース', 4, 18, 'ビュイック', 6.2),
('2026_003', 5, 'ドウデュース', 5, 25, '武豊', 3.5),
('2026_003', 6, 'ソールオリエンス', 6, 12, '川田', 9.5),
('2026_003', 7, 'タスティエーラ', 7, 10, 'ムーア', 12.0),
('2026_003', 8, 'ハーパー', 7, 6, '岩田望', 32.0),
('2026_003', 9, 'スルーセブンシーズ', 8, 14, '池添', 8.2),
('2026_003', 10, 'ディープボンド', 8, 8, '和田竜', 22.0),
('2026_003', 11, 'ライラック', 8, 5, '戸崎', 42.0),
('2026_003', 12, 'アイアンバローズ', 8, 4, '石橋脩', 65.0)
ON CONFLICT (race_id, horse_no) DO NOTHING;

-- Seed some Trifecta Odds for 宝塚記念 (Race '2026_001')
INSERT INTO public.trifecta_odds (race_id, rank1, rank2, rank3, odds)
VALUES
('2026_001', 1, 2, 3, 42.5),
('2026_001', 1, 2, 6, 38.2),
('2026_001', 1, 6, 2, 49.0),
('2026_001', 2, 1, 3, 76.5),
('2026_001', 2, 1, 6, 68.0),
('2026_001', 6, 1, 2, 112.4),
('2026_001', 1, 3, 4, 145.8),
('2026_001', 3, 1, 2, 189.0),
('2026_001', 1, 2, 8, 850.5),
('2026_001', 8, 7, 5, 25400.0)
ON CONFLICT (race_id, rank1, rank2, rank3) DO NOTHING;
