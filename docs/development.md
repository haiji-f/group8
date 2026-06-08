# 開発環境

## 前提

- Node.js 24 系
- Python 3.12 系
- VS Code または Cursor

## 初回セットアップ

```bash
cd frontend
npm install
```

Python の品質チェックをローカルで使う場合:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

## VS Code / Cursor

推奨拡張は `.vscode/extensions.json` に入っています。

- EditorConfig
- Prettier
- ESLint
- Python
- Black Formatter
- Ruff

保存時フォーマットは `.vscode/settings.json` で共有しています。

## フロントエンド

```bash
cd frontend
npm run dev
```

品質チェック:

```bash
cd frontend
npm run format:check
npm run lint
npm run build
```

自動整形:

```bash
cd frontend
npm run format
```

## バックエンド

Python は Black で整形し、Ruff で lint と import 順を確認します。

品質チェック:

```bash
ruff check backend
black --check backend
python -m compileall backend
```

自動修正:

```bash
ruff check backend --fix
black backend
```

## CI

GitHub Actions では以下を確認します。

- frontend: format check / lint / build
- backend: Ruff / Black / Python 構文チェック
