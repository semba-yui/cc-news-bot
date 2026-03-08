# 要件定義書

## はじめに

本仕様は、cc-news-bot にニュースページ型の HTML ソースプロバイダ群を追加するための要件を定義する。
対象は **OpenAI News**・**Anthropic News**・**Jules Changelog** の3ソースであり、既存の HTML ソースプロバイダ（Gemini CLI・Cursor・Antigravity）と同様のアーキテクチャを踏襲する。

Anthropic News・Jules Changelog は Static HTML（`fetch`）で取得可能。OpenAI News は Cloudflare Bot 保護により Static HTML 取得が不可のため、Headless ブラウザ（Playwright）で取得する（既存 Antigravity パターン踏襲）。
差分検出は記事単位で行い、前回チェック以降の全新着記事を通知する。
翻訳は全ソース共通で Claude Code Action を経由し、英語コンテンツは日本語に翻訳、日本語コンテンツはそのまま保持する。

## Requirements

### Requirement 1: ニュースページプロバイダ共通基盤

**目的:** ボット管理者として、ニュースページ型の HTML ソースから複数記事の新着を追跡・通知する共通の仕組みが欲しい。これにより、記事単位の差分検出と通知を統一的に行いたい。

#### 受け入れ基準

1. The cc-news-bot shall ニュースページ型の HTML ソースプロバイダ（OpenAI News・Anthropic News・Jules Changelog）を、既存の HTML ソースプロバイダと並列にサポートする。
2. When ニュースページプロバイダが実行された場合, the cc-news-bot shall 一覧ページから記事一覧（タイトル・日付・slug/URL）を抽出し、前回チェック以降の新着記事を特定する。
3. The cc-news-bot shall 各ソースの最終確認済み記事の識別子（slug リスト）を状態管理ファイルに永続化し、新規記事のみを通知する差分検出を可能にする。
4. When 初回実行時（状態ファイルに該当ソースの記録がない場合）, the cc-news-bot shall 最新3件の記事を通知対象として処理する。
5. If HTML コンテンツの取得に失敗した場合, the cc-news-bot shall エラーを記録し、該当ソースの通知をスキップする。

### Requirement 2: OpenAI News プロバイダ

**目的:** ボット管理者として、OpenAI の企業ニュース更新情報を日本語で Slack に通知したい。

#### 受け入れ基準

1. The OpenAI News プロバイダ shall `https://openai.com/ja-JP/news/company-announcements/` から記事一覧（タイトル・日付・slug）を抽出する。
2. When 新着記事が検出された場合, the OpenAI News プロバイダ shall 各記事の個別ページ（`https://openai.com/ja-JP/index/{slug}/`）にアクセスし、本文コンテンツを取得する。
3. The OpenAI News プロバイダ shall 記事の slug を差分検出の識別子として使用する。
4. When 記事コンテンツの取得に成功した場合, the OpenAI News プロバイダ shall コンテンツを `data/html-current/openai-news.json` に書き出す。
5. If 個別記事ページの取得に失敗した場合, the OpenAI News プロバイダ shall エラーを記録し、該当記事の通知をスキップする。

### Requirement 3: Anthropic News プロバイダ

**目的:** ボット管理者として、Anthropic のニュース更新情報を日本語で Slack に通知したい。

#### 受け入れ基準

1. The Anthropic News プロバイダ shall `https://www.anthropic.com/news` から記事一覧（タイトル・日付・カテゴリ・slug）を抽出する。
2. When 新着記事が検出された場合, the Anthropic News プロバイダ shall 各記事の個別ページ（`https://www.anthropic.com/news/{slug}`）にアクセスし、本文コンテンツを取得する。
3. The Anthropic News プロバイダ shall 記事の slug を差分検出の識別子として使用する。
4. When 記事コンテンツの取得に成功した場合, the Anthropic News プロバイダ shall コンテンツを `data/html-current/anthropic-news.json` に書き出す。
5. If 個別記事ページの取得に失敗した場合, the Anthropic News プロバイダ shall エラーを記録し、該当記事の通知をスキップする。

### Requirement 4: Jules Changelog プロバイダ

**目的:** ボット管理者として、Jules（Google）の changelog 更新情報を日本語で Slack に通知したい。

#### 受け入れ基準

1. The Jules Changelog プロバイダ shall `https://jules.google/docs/changelog/` から記事一覧（タイトル・日付・コンテンツ）を `<article>` 要素から抽出する。
2. The Jules Changelog プロバイダ shall 一覧ページに全コンテンツが展開されているため、個別記事ページへのアクセスは行わない。
3. The Jules Changelog プロバイダ shall 記事の日付ベース URL パス（例: `2026-02-19`）を差分検出の識別子として使用する。
4. When 新着記事が検出された場合, the Jules Changelog プロバイダ shall コンテンツを `data/html-current/jules-changelog.json` に書き出す。
5. If HTML コンテンツの取得に失敗した場合, the Jules Changelog プロバイダ shall エラーを記録し、通知をスキップする。

### Requirement 5: Claude Code Action による翻訳・要約

**目的:** チームメンバーとして、全ソースの記事を日本語で読みたい。英語記事は翻訳し、既に日本語の記事はそのまま通知されるようにしたい。また、長文記事は要約も生成し、Slack の Block Kit 上限に収まるようにしたい。

#### 受け入れ基準

1. The cc-news-bot shall 全てのニュースページプロバイダに対して Claude Code Action による翻訳・要約パイプラインを適用する。
2. When 記事コンテンツが英語の場合, the Claude Code Action shall コンテンツを日本語に翻訳する。
3. When 記事コンテンツが既に日本語の場合, the Claude Code Action shall コンテンツを翻訳せずそのまま保持する。
4. When OpenAI News または Anthropic News の記事を処理する場合, the Claude Code Action shall Slack Block Kit の上限を考慮した要約（`summaryJa`）と、要約せずに翻訳した本文全文（`fullTextJa`）の両方を生成する。
5. When Jules Changelog の記事を処理する場合, the Claude Code Action shall 記事が短いため要約は不要とし、翻訳済み本文（`fullTextJa`）のみを生成する。
6. The Claude Code Action shall 翻訳・要約結果を `data/html-summaries/{source}.json` に書き出す。
7. The Claude Code Action のプロンプト shall 「英語の場合は日本語に翻訳し、日本語の場合はそのまま出力する」旨の条件付き指示を含む。

### Requirement 6: Slack Block Kit 通知フォーマット

**目的:** チームメンバーとして、各ソースの新着記事が構造化された見やすい形式で Slack に通知されるようにしたい。長文記事は要約で概要を把握し、詳細はスレッド返信で確認できるようにしたい。

#### 受け入れ基準

1. The cc-news-bot shall 新着記事ごとに1つの独立した Slack Block Kit メッセージを投稿する。
2. When OpenAI News または Anthropic News の記事を通知する場合, the cc-news-bot shall 親メッセージに要約（ソース名・記事タイトル・日付・要約文）を投稿し、スレッド返信に要約していない翻訳済み本文全文を投稿する（Gemini CLI パターン踏襲）。
3. When Jules Changelog の記事を通知する場合, the cc-news-bot shall 記事が短いため親メッセージのみ（ソース名・記事タイトル・日付・翻訳済み本文）で通知を完結する（単一スレッド形式）。
4. The cc-news-bot shall 画像を通知に含めない。
5. When 新着記事が複数ある場合, the cc-news-bot shall 記事ごとに個別のメッセージとして投稿する。

### Requirement 7: エラーハンドリング

**目的:** ボット管理者として、取得エラー発生時に問題を追跡可能にしたい。

#### 受け入れ基準

1. The cc-news-bot shall エラー発生時にエラー内容・対象ソース・タイムスタンプをログに記録する。
2. If 一覧ページの取得に失敗した場合, the cc-news-bot shall 該当ソースの全処理をスキップし、`has_changes=false` を出力する。
3. If 個別記事ページの取得に失敗した場合（OpenAI・Anthropic）, the cc-news-bot shall 該当記事のみをスキップし、他の新着記事の処理を継続する。

### Requirement 8: GitHub Actions ワークフロー構成

**目的:** ボット管理者として、各プロバイダを独立したワークフローで管理し、6時間ごとに自動実行したい。

#### 受け入れ基準

1. The cc-news-bot shall 各ニュースページプロバイダ（OpenAI News・Anthropic News・Jules Changelog）に対して独立した GitHub Actions ワークフローファイルを持つ。
2. The cc-news-bot shall 各ワークフローの cron スケジュールを6時間ごと（`0 */6 * * *`）に設定する。
3. The cc-news-bot shall 各ワークフローに `workflow_dispatch` トリガーを設け、手動実行を可能にする。
4. The cc-news-bot shall 各ソースに対して個別の Slack チャンネル ID を GitHub Actions Secrets から取得する（`SLACK_CHANNEL_ID_OPENAI_NEWS`・`SLACK_CHANNEL_ID_ANTHROPIC_NEWS`・`SLACK_CHANNEL_ID_JULES_CHANGELOG`）。
