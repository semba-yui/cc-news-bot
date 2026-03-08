# 調査・設計判断ログ

---

**目的**: 技術設計に影響を与える調査結果・アーキテクチャ検討・設計判断を記録する。

---

## サマリー

- **フィーチャー**: `html-source-providers`
- **調査スコープ**: 複雑な統合（Complex Integration）— 既存アーキテクチャの拡張 + 新規外部サービス統合
- **主要な発見**:
  1. Antigravity changelog（`https://antigravity.google/changelog`）は完全な JS レンダリングで生成されるため Playwright 必須。静的 fetch では CSS/GTM 初期化コードしか返らない。
  2. Gemini CLI changelog（`https://geminicli.com/docs/changelogs/`）は SSR 形式で、`<h2 id="announcements-v0310---2026-02-27">` パターンの HTML として提供される。画像は imgur.com ホスト（公開 URL）。
  3. Cursor changelog（`https://cursor.com/ja/changelog`）は既に日本語の SSR ページ。翻訳不要。動画は Mux（`playbackId` ベース）で Slack image block のサムネイル URL として利用可能。
  4. 既存の Claude Code Action ワークフローパターン（fetch → Claude Code Action で翻訳 → notify）を踏襲することで、追加の Anthropic SDK 依存なしに翻訳を実現できる。

---

## 調査ログ

### HTML ページ構造の調査

- **調査契機**: 各プロバイダの HTML 構造を把握してパーサ設計に反映する必要があった
- **参照元**:
  - `https://geminicli.com/docs/changelogs/` (WebFetch)
  - `https://cursor.com/ja/changelog` (WebFetch)
  - `https://antigravity.google/changelog` (WebFetch — JS レンダリングのため内容取得不可で Playwright 必須を確認)
- **発見事項**:
  - Gemini CLI: `<h2 id="announcements-v0310---2026-02-27">` 形式で `id` 属性にバージョン + 日付を含む。コンテンツは `<ul>` リスト。画像・GIF は `https://i.imgur.com/...` の公開 URL として埋め込み。
  - Cursor: `<article>` 単位で各バージョンを管理。`<time dateTime="YYYY-MM-DDTHH:MM:SS.000Z">` でバージョン識別（ページ内 heading に `major.minor` 形式が表示）。動画は Mux `playbackId` ベース（thumbnail: `https://image.mux.com/{playbackId}/thumbnail.png`）。
  - Antigravity: WebFetch で CSS/GTM コードしか取得できず JS レンダリング確定。Playwright によりレンダリング後の DOM を取得する必要がある。
- **設計への影響**: Gemini CLI・Cursor は cheerio + Node.js fetch で対応可能。Antigravity のみ playwright が必要。ソースタイプを `"html_scraping"` と `"html_headless"` に分離する設計を採用。

### HTML パーサライブラリの選定

- **調査契機**: 静的 HTML パーシングに最適なライブラリを選定する必要があった
- **参照元**:
  - [npm-compare: cheerio vs node-html-parser](https://npm-compare.com/cheerio,jsdom,node-html-parser,parse5)
  - [npmtrends: cheerio vs node-html-parser](https://npmtrends.com/cheerio-vs-node-html-parser)
- **発見事項**:
  - cheerio: 週間 DL 数 1,200 万、GitHub Stars 29,790。jQuery 互換 API で表現力高い。
  - node-html-parser: 週間 DL 数 354 万、シンプル API。
  - cheerio は ESM 対応（v1.0+）で本プロジェクトの ESM-only 構成と互換。
- **設計への影響**: cheerio を採用。jQuery ライクな API により複雑なセレクタが簡潔に記述可能。

### Slack Block Kit image block の制約

- **調査契機**: Gemini CLI の imgur 画像・Cursor の Mux サムネイルを Slack に埋め込む方法を確認する必要があった
- **参照元**:
  - [Slack image block 公式ドキュメント](https://docs.slack.dev/reference/block-kit/blocks/image-block/)
  - [Private image support via slack_file](https://slack.com/blog/developers/uploading-private-images-blockkit)
- **発見事項**:
  - 従来: `image_url` に公開 HTTPS URL が必要
  - 新機能: `slack_file` プロパティでプライベートファイル対応（Slack へアップロード後に file_id で参照）
  - imgur.com の URL は公開 HTTPS URL → `image_url` で直接利用可能
  - Mux サムネイル URL `https://image.mux.com/{playbackId}/thumbnail.png` も公開 HTTPS URL → `image_url` 利用可能
- **設計への影響**: `slack_file` ではなく `image_url` を使用。`SlackBlock` Union に `image` ブロック型を追加する。

### 既存 GitHub Actions ワークフローパターンの分析

- **調査契機**: 翻訳処理を TypeScript 内でやるか Claude Code Action でやるかを決定する必要があった
- **参照元**: `.github/workflows/changelog-notifier.yml`
- **発見事項**:
  - 既存ワークフロー: `fetch-and-diff.ts` → `anthropics/claude-code-action@v1`（要約生成）→ `notify.ts` → git commit
  - Claude Code Action で `data/diffs/` を読み取り `data/summaries/` に要約を書き出す
  - ANTHROPIC_API_KEY 不要（`claude_code_oauth_token` シークレットを使用）
- **設計への影響**: HTML プロバイダも同パターンを採用。`@anthropic-ai/sdk` の依存追加は不要。翻訳は Claude Code Action が担当し、TypeScript スクリプトは fetch・解析・Slack 通知のみに責務を絞れる。

### Antigravity changelog URL の確認

- **調査契機**: 要件定義書に URL が明記されていなかった
- **参照元**: Web 検索 + `https://antigravity.google/changelog`
- **発見事項**: 公式 changelog URL は `https://antigravity.google/changelog`
- **設計への影響**: `HtmlHeadlessSourceConfig.url` に設定する。

---

## アーキテクチャパターン評価

| オプション                        | 説明                                                          | 強み                                           | リスク / 制限                                    | 備考     |
| --------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | -------- |
| A: 既存スクリプト拡張             | `fetch-and-diff.ts` と `notify.ts` に HTML 対応を追加         | ファイル数が増えない                           | 責務混在・既存テストへの影響大                   | 不採用   |
| B: プロバイダごとに独立スクリプト | 各プロバイダ専用の fetch スクリプト + notify スクリプトを新設 | 単一責務・並列実装可能・既存コードへの影響ゼロ | ファイル数増加                                   | **採用** |
| C: 統合 HTML ランナー             | 1つのスクリプトが全 HTML プロバイダを処理                     | スクリプト数が少ない                           | プロバイダ固有ロジックが混在・エラー境界が不明確 | 不採用   |

---

## 設計判断

### 判断: SourceConfig 型の拡張方針

- **背景**: HTML プロバイダには静的 HTML 取得とヘッドレスブラウザ取得の2方式が存在する
- **検討した代替案**:
  1. `"html"` の1種 + `renderMode?: "static" | "headless"` フィールド — インターフェース複雑化
  2. `"html_scraping" | "html_headless"` の2種の Union — 型で取得方式を明示
- **採用方針**: 案2。既存の `"raw_markdown" | "github_releases"` と同様の Union Type パターンで取得方式を型レベルで区別する。
- **根拠**: ステアリングの「`SourceConfig.type` による分岐で取得方式を切り替える（Union Type パターン）」に完全準拠。
- **トレードオフ**: SourceConfig の Union が4種類に増えるが、各型が明確な責務を持つため可読性は維持される。

### 判断: 状態管理における差分検出キー

- **背景**: HTML プロバイダはバージョン番号文字列で差分検出するため、既存の `hash` ベースと異なる
- **検討した代替案**:
  1. `hash` フィールドにバージョン文字列のハッシュを格納 — 既存フィールドを流用するが意味が変わる
  2. `latestVersion?: string` を追加 — 意味が明確
- **採用方針**: 案2。`SourceState` に `latestVersion?: string` を追加し、HTML プロバイダはこのフィールドで差分検出する。`hash` は空文字列とする。
- **根拠**: 既存フィールドの意味を変えず、後方互換性を維持できる。

### 判断: 翻訳の実行場所

- **背景**: Gemini CLI 要約（英語）と Antigravity コンテンツ（英語）を日本語化する必要がある
- **検討した代替案**:
  1. TypeScript スクリプト内で `@anthropic-ai/sdk` を呼び出す — 新依存追加・APIキー管理が必要
  2. 既存の Claude Code Action パターンを踏襲 — 追加依存なし・既存ワークフロー知識を流用
- **採用方針**: 案2。`anthropics/claude-code-action@v1` が `data/html-current/{source}.json` を読み取り `data/html-summaries/{source}.json` に日本語訳を書き出す。
- **根拠**: 既存ワークフローと完全に一致したパターン。`claude_code_oauth_token` シークレットは既に設定済み。

### 判断: Cursor 動画コンテンツの Slack 表示方法

- **背景**: Cursor changelog の動画は Mux の `playbackId` で管理されており、Slack は動画埋め込み非対応
- **採用方針**: Mux サムネイル URL（`https://image.mux.com/{playbackId}/thumbnail.png`）を image block で表示し、動画 URL（`https://stream.mux.com/{playbackId}.m3u8`）をテキストリンクとして section block に含める。
- **根拠**: Slack Block Kit は動画の直接埋め込みに未対応。サムネイル + リンクの組み合わせが最善のユーザー体験。

---

## リスクと対策

- Antigravity changelog の DOM 構造が変更された場合 → パーサが壊れる。バージョン検出失敗時はエラーログを出力してスキップ（Req 4.5 に対応）。
- Gemini CLI の geminicli.com が一時的に取得不可の場合 → Req 2.5 に従い GitHub Releases のみで通知するフォールバックを実装。
- Playwright の GitHub Actions での実行時間増加（ブラウザインストール + 起動） → `--with-deps` フラグで依存を一括インストール。Antigravity は毎日1回のみ実行（低頻度）のため許容範囲内。
- cheerio の ESM 対応 → cheerio v1.0+ は ESM ネイティブ対応。本プロジェクトの `"type": "module"` と互換性あり。

---

## 参照

- [Gemini CLI Changelog](https://geminicli.com/docs/changelogs/)
- [Cursor Changelog (JA)](https://cursor.com/ja/changelog)
- [Google Antigravity Changelog](https://antigravity.google/changelog)
- [Slack image block ドキュメント](https://docs.slack.dev/reference/block-kit/blocks/image-block/)
- [cheerio GitHub](https://github.com/cheeriojs/cheerio)
- [Playwright GitHub Actions 設定](https://playwright.dev/docs/ci-intro)
