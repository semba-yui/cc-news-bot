# Implementation Plan

- [ ] 1. SourceState Discriminated Union 拡張
- [x] 1.1 既存の SourceState 型を Discriminated Union に移行する
  - `type` フィールドを判別子として `HashBasedSourceState`・`VersionBasedSourceState`・`DateSlugBasedSourceState`・`SlugListBasedSourceState` の4バリアントを定義する
  - `SlugListBasedSourceState` に `knownSlugs: string[]` フィールドを追加する
  - 既存の状態ファイルに `type` フィールドがない場合のマイグレーションロジックを `loadState` に追加し、フィールド存在チェックで適切な型に振り分ける
  - 既存テストが引き続きパスすることを確認する
  - _Requirements: 1.3_

- [ ] 2. ニュースページパーサー群
- [x] 2.1 (P) OpenAI News パーサーを実装する
  - 一覧ページ HTML から記事エントリ（タイトル・日付・slug・カテゴリ）を抽出する機能を実装する
  - 個別記事ページ HTML から本文コンテンツを Markdown 形式で抽出する機能を実装する
  - モバイル/デスクトップ DOM 重複に対する `href` デデュプ処理を含める
  - 日付降順ソート・空 HTML・不正 HTML のケースをテストで検証する
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 (P) Anthropic News パーサーを実装する
  - 一覧ページ HTML から記事エントリ（タイトル・日付・カテゴリ・slug）を抽出する機能を実装する
  - CSS クラスハッシュに依存しない構造セレクタを使用する
  - 日付テキスト（"Mar 6, 2026" 形式）を ISO 8601 に変換するパースロジックを含める
  - 個別記事ページ HTML から本文コンテンツを抽出する機能を実装する
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.3 (P) Jules Changelog パーサーを実装する
  - `<article>` 要素から記事データ（タイトル・日付・dateSlug・コンテンツ）を抽出する機能を実装する
  - ページが提供する URL パス（例: `2026-02-19`, `2026-01-26-1`）をそのまま識別子として使用する
  - コンテンツを Markdown に変換して返す
  - 個別ページアクセスは不要であることをテストで明示する
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 3. Fetch スクリプト群
- [x] 3.1 (P) OpenAI News の取得・差分検出スクリプトを実装する
  - Deps interface パターンで副作用を注入可能にする
  - Headless ブラウザ（Playwright）経由で一覧ページを取得し、パーサーで記事一覧を抽出する
  - `knownSlugs` との差集合で新着記事を特定する
  - 新着記事の個別ページを Headless ブラウザで取得し、本文コンテンツを抽出する
  - 初回実行時は最新3件を通知対象とし、全 slug を `knownSlugs` に登録する
  - 取得結果を `html-current/openai-news.json` に書き出す
  - 状態ファイルを更新し `has_changes` を GitHub Actions output として出力する
  - 個別記事取得失敗時は該当記事をスキップし他を継続する（スキップした slug は knownSlugs に追加しない）
  - Deps モックによるテストで新着検出・初回実行・取得失敗・状態更新を検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3_

- [x] 3.2 (P) Anthropic News の取得・差分検出スクリプトを実装する
  - Deps interface パターンで副作用を注入可能にする
  - Static HTML（`fetch`）経由で一覧ページを取得し、パーサーで記事一覧を抽出する
  - `knownSlugs` との差集合で新着記事を特定する
  - 新着記事の個別ページを Static HTML で取得し、本文コンテンツを抽出する
  - 初回実行時は最新3件を通知対象とし、全 slug を `knownSlugs` に登録する
  - 取得結果を `html-current/anthropic-news.json` に書き出す
  - 個別記事取得失敗時は該当記事をスキップし他を継続する
  - Deps モックによるテストで新着検出・初回実行・取得失敗・状態更新を検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3_

- [x] 3.3 (P) Jules Changelog の取得・差分検出スクリプトを実装する
  - Deps interface パターンで副作用を注入可能にする
  - Static HTML（`fetch`）経由で一覧ページを取得し、パーサーで記事一覧を抽出する
  - `knownSlugs`（dateSlug）との差集合で新着記事を特定する
  - 一覧ページに全コンテンツが展開されているため、個別記事ページへのアクセスは行わない
  - 初回実行時は最新3件を通知対象とし、全 dateSlug を `knownSlugs` に登録する
  - 取得結果を `html-current/jules-changelog.json` に書き出す
  - Deps モックによるテストで新着検出・初回実行・取得失敗・状態更新を検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2_

- [ ] 4. Slack Block Kit ビルダー拡張
- [x] 4.1 (P) 3ソース用の Slack Block Kit ビルダー関数を追加する
  - OpenAI News 用ビルダー: Header（ソース名 + タイトル）→ Section（日付）→ Section（要約文）を構築する
  - Anthropic News 用ビルダー: OpenAI News と同じ構造（要約 + スレッド全文パターン）
  - Jules Changelog 用ビルダー: Header（ソース名 + タイトル）→ Section（日付）→ Section（翻訳済み本文）を構築する
  - 画像ブロックは含めない
  - テキスト3000文字、ヘッダー150文字の Slack 制限に準拠することをテストで検証する
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Notify スクリプト群
- [x] 5.1 (P) OpenAI News の Slack 通知スクリプトを実装する
  - 翻訳・要約済み JSON を読み込み、記事ごとに独立した Slack メッセージを投稿する
  - 親メッセージに要約（ソース名・タイトル・日付・`summaryJa`）を Block Kit で投稿する
  - スレッド返信に `fullTextJa` を投稿する（3000文字制限の自動分割対応）
  - Deps モックによるテストで親メッセージ + スレッド返信・複数記事処理を検証する
  - _Requirements: 5.4, 6.1, 6.2, 6.4, 6.5_

- [x] 5.2 (P) Anthropic News の Slack 通知スクリプトを実装する
  - OpenAI News と同じ要約 + スレッド全文パターンで通知する
  - 翻訳・要約済み JSON を読み込み、記事ごとに独立メッセージを投稿する
  - Deps モックによるテストで動作を検証する
  - _Requirements: 5.4, 6.1, 6.2, 6.4, 6.5_

- [x] 5.3 (P) Jules Changelog の Slack 通知スクリプトを実装する
  - 翻訳済み JSON を読み込み、記事ごとに親メッセージのみで通知を完結する（スレッド返信なし）
  - 記事が短いため要約は不要、`fullTextJa` を親メッセージに含める
  - Deps モックによるテストで動作を検証する
  - _Requirements: 5.5, 6.1, 6.3, 6.4, 6.5_

- [ ] 6. Claude Code Action 翻訳・要約プロンプト
- [x] 6.1 (P) OpenAI News 用の翻訳・要約プロンプトを定義する
  - 日本語コンテンツのため翻訳不要、要約（`summaryJa`）を生成し本文全文は `fullTextJa` としてそのまま保持する指示を記述する
  - 「英語の場合は日本語に翻訳し、日本語の場合はそのまま出力する」旨の条件付き指示を含める
  - 入力: `data/html-current/openai-news.json`、出力: `data/html-summaries/openai-news.json`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

- [x] 6.2 (P) Anthropic News 用の翻訳・要約プロンプトを定義する
  - 英語コンテンツを日本語に翻訳し、要約（`summaryJa`）と翻訳済み全文（`fullTextJa`）を生成する指示を記述する
  - 条件付き翻訳指示を含める
  - 入力: `data/html-current/anthropic-news.json`、出力: `data/html-summaries/anthropic-news.json`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_

- [x] 6.3 (P) Jules Changelog 用の翻訳プロンプトを定義する
  - 英語コンテンツを日本語に翻訳し、`fullTextJa` のみ生成する指示を記述する（要約は不要）
  - 条件付き翻訳指示を含める
  - 入力: `data/html-current/jules-changelog.json`、出力: `data/html-summaries/jules-changelog.json`
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7_

- [ ] 7. GitHub Actions ワークフロー
- [x] 7.1 (P) OpenAI News 用ワークフローを作成する
  - 6時間ごとの cron（`0 */6 * * *`）と `workflow_dispatch` トリガーを設定する
  - Playwright install ステップを含める（Cloudflare Bot 保護回避のため Headless ブラウザ必須）
  - Fetch → Claude Code Action（`has_changes` 条件付き）→ Notify → State commit の4ステップ構成
  - `SLACK_CHANNEL_ID_OPENAI_NEWS` シークレットを使用する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7.2 (P) Anthropic News 用ワークフローを作成する
  - 6時間ごとの cron と `workflow_dispatch` トリガーを設定する
  - Playwright は不要（Static HTML 取得）
  - Fetch → Claude Code Action → Notify → State commit の4ステップ構成
  - `SLACK_CHANNEL_ID_ANTHROPIC_NEWS` シークレットを使用する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7.3 (P) Jules Changelog 用ワークフローを作成する
  - 6時間ごとの cron と `workflow_dispatch` トリガーを設定する
  - Playwright は不要（Static HTML 取得）
  - Fetch → Claude Code Action → Notify → State commit の4ステップ構成
  - `SLACK_CHANNEL_ID_JULES_CHANGELOG` シークレットを使用する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

## Requirements Coverage

| Requirement                       | Tasks                        |
| --------------------------------- | ---------------------------- |
| 1.1, 1.2, 1.3, 1.4, 1.5           | 1.1, 3.1, 3.2, 3.3           |
| 2.1, 2.2, 2.3                     | 2.1, 3.1                     |
| 2.4, 2.5                          | 3.1                          |
| 3.1, 3.2, 3.3                     | 2.2, 3.2                     |
| 3.4, 3.5                          | 3.2                          |
| 4.1, 4.2, 4.3                     | 2.3, 3.3                     |
| 4.4, 4.5                          | 3.3                          |
| 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7 | 5.1, 5.2, 5.3, 6.1, 6.2, 6.3 |
| 6.1, 6.2, 6.3, 6.4, 6.5           | 4.1, 5.1, 5.2, 5.3           |
| 7.1, 7.2, 7.3                     | 3.1, 3.2, 3.3                |
| 8.1, 8.2, 8.3, 8.4                | 7.1, 7.2, 7.3                |
