# Research & Design Decisions

## Summary

- **Feature**: `changelog-slack-notifier`
- **Discovery Scope**: New Feature
- **Key Findings**:
  - Claude Code Action は cron ワークフローで prompt パラメータ指定により自動実行可能。ファイル書き出しで出力をキャプチャ可能
  - Slack chat.postMessage の text フィールド上限は 4,000 文字（推奨）、全体上限は 40,000 文字。thread_ts で返信を投稿
  - GitHub Releases API は日付フィルタ未対応。クライアント側で published_at を比較してフィルタが必要

## Research Log

### Claude Code Action のスケジュール実行

- **Context**: cron トリガーで Claude Code Action が動作するか確認
- **Sources Consulted**: https://github.com/anthropics/claude-code-action, https://code.claude.com/docs/en/github-actions
- **Findings**:
  - `prompt` パラメータ指定で自動実行モードになる
  - `claude_code_oauth_token` でサブスクリプション認証対応
  - `allowed_tools` は非推奨。`claude_args: --allowedTools Read,Write,Bash` を使用
  - 出力は `execution_file`（JSON）で取得可能
  - Claude はリポジトリ内のファイルを Read/Write 可能
- **Implications**: Claude にファイル書き出しさせ、後続ステップで読み取る方式が最もシンプル

### Slack chat.postMessage API

- **Context**: メッセージ投稿とスレッド返信の仕様確認
- **Sources Consulted**: https://docs.slack.dev/reference/methods/chat.postMessage/
- **Findings**:
  - `text` フィールド: 4,000 文字推奨上限
  - 全体メッセージ: 40,000 文字上限
  - `thread_ts` で親メッセージの timestamp を指定してスレッド返信
  - レスポンスの `ts` を使って後続のスレッド返信を投稿
  - mrkdwn はデフォルト有効
  - レート制限: 1メッセージ/秒/チャンネル
- **Implications**: 原文 diff が 4,000 文字を超える場合は固定文字数で分割して複数スレッド返信が必要

### GitHub Releases API

- **Context**: openai/codex のリリース情報取得方法
- **Sources Consulted**: https://docs.github.com/en/rest/releases/releases
- **Findings**:
  - `GET /repos/openai/codex/releases` で取得
  - `body` フィールドに Markdown 形式のリリースノート
  - 日付フィルタ非対応、クライアント側で `published_at` をフィルタ
  - 認証なし: 60 req/hour、認証あり: 5,000 req/hour
  - `per_page` パラメータで取得件数制御（最大100）
- **Implications**: body を Markdown で連結保存し、他ソースと統一的に扱う

### GitHub Actions 自動コミット

- **Context**: スナップショット更新のコミット・プッシュ方法
- **Sources Consulted**: https://docs.github.com/actions/security-guides/automatic-token-authentication
- **Findings**:
  - `git config --local` で github-actions[bot] を設定
  - `permissions: contents: write` が必要
  - `git diff --quiet --cached` で変更有無を判定し、空コミットを防止
- **Implications**: git コマンド直接使用で十分。追加 Action は不要

## Architecture Pattern Evaluation

| Option             | Description                                           | Strengths                              | Risks / Limitations                          | Notes    |
| ------------------ | ----------------------------------------------------- | -------------------------------------- | -------------------------------------------- | -------- |
| 単一ジョブ順次実行 | 1 job 内で fetch → diff → summarize → notify → commit | シンプル、デバッグ容易、状態共有が容易 | 直列実行のため所要時間が長くなる可能性       | **採用** |
| matrix 並列実行    | ソースごとに並列ジョブ                                | 高速                                   | ジョブ間の状態共有が複雑、コミット競合リスク | 不採用   |

## Design Decisions

### Decision: 実装言語として TypeScript を使用

- **Context**: スクリプトの保守性・型安全性の確保
- **Alternatives Considered**:
  1. Bash - シンプルだがテスト困難、エラーハンドリングが弱い
  2. Python - テキスト処理が得意だがランタイムセットアップが必要
- **Selected Approach**: TypeScript (Node.js)
- **Rationale**: package.json が既に存在し Node.js エコシステムが整っている。型安全性によりメンテナンス性が高い
- **Trade-offs**: ビルドステップが必要だが tsx で直接実行可能

### Decision: Claude の出力をファイル経由で受け渡し

- **Context**: Claude Code Action の出力を後続ステップで利用する方法
- **Alternatives Considered**:
  1. structured_output (JSON) - 型安全だがスキーマ定義が必要
  2. execution_file の解析 - JSON 形式だが構造が不安定
- **Selected Approach**: Claude にファイル書き出しさせる（`data/summaries/` ディレクトリ）
- **Rationale**: Claude の Write ツールで直接 Markdown ファイルを生成するため、フォーマット制御が容易
- **Trade-offs**: ファイルパスの取り決めが必要

### Decision: ハッシュ比較 + テキスト diff による差分検出

- **Context**: 前回スナップショットとの変更検出方法
- **Alternatives Considered**:
  1. バージョン番号比較 - パース実装が複雑、ソースごとに形式が異なる
- **Selected Approach**: SHA-256 ハッシュで変更有無を判定し、変更があればテキスト diff を生成
- **Rationale**: 全ソースで統一的に扱え、実装もシンプル
- **Trade-offs**: diff が大きくなる可能性があるが、Claude の要約で対応

## Risks & Mitigations

- Claude Code Action の出力品質が不安定な可能性 → プロンプトで出力フォーマットを厳密に指定
- Slack レート制限（1msg/sec/channel） → 投稿間に 1 秒の待機を挿入
- GitHub API レート制限 → GITHUB_TOKEN の認証付きリクエストで 5,000 req/hour を確保
- cron スケジュールの遅延（GitHub Actions は保証なし） → 業務影響は軽微のため許容

## References

- [Claude Code Action](https://github.com/anthropics/claude-code-action) — ワークフロー統合の公式リポジトリ
- [Slack chat.postMessage](https://docs.slack.dev/reference/methods/chat.postMessage/) — メッセージ投稿 API
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases) — リリース情報取得 API
- [GitHub Actions 自動認証](https://docs.github.com/actions/security-guides/automatic-token-authentication) — GITHUB_TOKEN の仕様
