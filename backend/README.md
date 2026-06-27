# keiba-scraper

netkeiba から競馬データをスクレイピングし、Supabase に保存する Python スクレイパー。

---

## セットアップ

### 1. Python 仮想環境

```bash
cd group8/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium   # ← 必須（別途実行）
```

### 2. 環境変数

```bash
cp .env.example .env
# .env を編集して SUPABASE_URL と SUPABASE_SERVICE_KEY を設定する
```

### 3. Supabase テーブル作成

Supabase ダッシュボード → SQL Editor で以下の DDL を実行する。

```sql
CREATE TABLE races (
  race_id           text PRIMARY KEY,
  netkeiba_race_id  text,
  race_date         date NOT NULL,
  day_of_week       text NOT NULL,
  venue             text NOT NULL,
  race_no           smallint NOT NULL,
  race_name         text,
  surface           text NOT NULL,
  distance          smallint NOT NULL,
  post_time         time,
  num_horses        smallint,
  scraped_at        timestamptz NOT NULL,
  UNIQUE (race_date, venue, race_no)
);
CREATE INDEX idx_races_date ON races (race_date);

CREATE TABLE horses (
  horse_id    bigserial PRIMARY KEY,
  race_id     text NOT NULL REFERENCES races(race_id),
  horse_no    smallint NOT NULL,
  post_no     smallint NOT NULL,
  horse_name  text NOT NULL,
  jockey      text,
  win_odds    numeric(6,1),
  ball_count  smallint NOT NULL,
  UNIQUE (race_id, horse_no)
);
CREATE INDEX idx_horses_race_id ON horses (race_id);

CREATE TABLE trifecta_odds (
  id          bigserial PRIMARY KEY,
  race_id     text NOT NULL REFERENCES races(race_id),
  rank1       smallint NOT NULL,
  rank2       smallint NOT NULL,
  rank3       smallint NOT NULL,
  odds_value  numeric(8,1) NOT NULL,
  scraped_at  timestamptz NOT NULL,
  UNIQUE (race_id, rank1, rank2, rank3)
);
CREATE INDEX idx_trifecta_race_id ON trifecta_odds (race_id);
```

既存テーブルにカラムを追加する場合は以下を実行する。

```sql
ALTER TABLE races ADD COLUMN day_of_week text NOT NULL DEFAULT '';
```

---

## 実行方法

```bash
cd group8/backend
source .venv/bin/activate

# 日付を明示指定（デモ用）
python -m scraper.main --dates 2026-06-13 2026-06-14

# 日付未指定（翌土・日を自動計算 → cron 用）
python -m scraper.main
```

---

## cron 設定（毎週金曜 21:00 JST）

```bash
# 実行権限を付与
chmod +x cron/run.sh

# crontab に登録
crontab -e
```

`cron/crontab.txt` の内容をコピーし、パスを実際の環境に合わせて変更する。

### タイムゾーン確認

```bash
timedatectl | grep "Time zone"
# UTC の場合は crontab.txt のコメントを参照して UTC 時刻 (12:00) を使う
```

---

## 件数確認 SQL（実行後）

```sql
SELECT race_date, COUNT(*) AS race_count
FROM races
WHERE race_date IN ('2026-06-13', '2026-06-14')
GROUP BY race_date ORDER BY race_date;

SELECT r.race_date, COUNT(h.horse_id) AS horse_count
FROM horses h JOIN races r ON h.race_id = r.race_id
WHERE r.race_date IN ('2026-06-13', '2026-06-14')
GROUP BY r.race_date ORDER BY r.race_date;

SELECT r.race_date, COUNT(t.id) AS odds_count
FROM trifecta_odds t JOIN races r ON t.race_id = r.race_id
WHERE r.race_date IN ('2026-06-13', '2026-06-14')
GROUP BY r.race_date ORDER BY r.race_date;
```

期待値（目安）: races 各日 12 件、horses 各日 180 件、trifecta_odds 各日 〜59,000 件

---

## 注意事項

- **netkeiba の HTML 構造変更**: ページのクラス名は変更される可能性がある。動作しない場合は `scraper/race_scraper.py` と `scraper/odds_scraper.py` のセレクタを実際のページで確認して修正する。
- **三連単オッズのパーサ**: `odds_scraper.py` は複数の抽出戦略を順に試みる。ページ構造が想定と異なる場合はログ (`scraper.log`) を確認してパーサを調整する。
- **macOS での `date -d`**: `run.sh` 内は Linux (GNU date) 専用。macOS なら `date -v+1d` に変える（cron 自体は使わずに `--dates` 直接指定を推奨）。
- **過度な負荷禁止**: リクエスト間に 1.5 秒以上の間隔を設定済み。並列実行はしないこと。
