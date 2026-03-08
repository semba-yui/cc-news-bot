# Gap Analysis: news-page-providers

## 分析サマリー

- **スコープ**: OpenAI News・Anthropic News・Jules Changelog の3ソースを既存 HTML ソースプロバイダアーキテクチャに追加
- **既存パターンとの適合性**: 高い。既存の Gemini CLI / Cursor パターン（Deps 注入・7フェーズ fetch・state-service・html-slack-builder）をほぼそのまま踏襲可能
- **主要な差分**: 既存は「バージョンベース」差分検出だが、ニュースページは「slug リストベース」の差分検出が必要。Cursor の `latestDate + latestSlug` に近いが、複数記事の slug 一括管理が求められる
- **最大リスク**: OpenAI News が Cloudflare ボット保護で `fetch` 取得不可の可能性がある。Headless ブラウザ（Playwright）が必要になる場合がある
- **工数見積**: M（3〜7日）— 3ソース × 同一パターンの繰り返し実装。パーサー部分のみソース固有

---

## 1. 要件とアセットのマッピング

### Requirement 1: ニュースページプロバイダ共通基盤

| 技術的ニーズ                           | 既存アセット                                                                           | ギャップ                                                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 記事一覧の抽出（タイトル・日付・slug） | `parseAllVersions()` パターン（Gemini CLI）、`parseAllEntries()` パターン（Cursor）    | **Missing**: 記事リスト型パーサー API（`parseArticleList()`）。Cursor の `parseAllEntries` が最も近いが、各ソース固有の DOM 構造に対応する新規パーサーが必要                       |
| slug リストベースの差分検出            | `SourceState.latestVersion`（単一値）、`SourceState.latestDate + latestSlug`（Cursor） | **Missing**: 複数 slug の一括管理。現在の `SourceState` は単一の `latestVersion` or `latestDate+latestSlug` のみ。要件では「前回チェック済み slug リスト」での差分検出が求められる |
| 初回実行時の最新3件制限                | `MAX_INITIAL_VERSIONS = 5`（Gemini CLI）                                               | **Constraint**: 定数値を3に変更するだけで対応可能                                                                                                                                  |
| エラー時のスキップ                     | 既存パターンで実装済み（fetch-html-cursor.ts の error isolation）                      | ギャップなし — 既存パターンを踏襲                                                                                                                                                  |

### Requirement 2: OpenAI News プロバイダ

| 技術的ニーズ                                                    | 既存アセット                                 | ギャップ                                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `https://openai.com/ja-JP/news/company-announcements/` のパース | なし                                         | **Missing**: `openai-news-parser.ts` 新規作成。`div.group.relative` 内の `a[href*="/index/"]` から記事情報を抽出 |
| 個別記事ページの本文取得                                        | `html-fetch-service.ts`（`fetchStaticHtml`） | **Research Needed**: Cloudflare ボット保護の有無。403 返却時は `playwright-service.ts` へのフォールバックが必要  |
| 日本語日付パース（「2026年3月5日」）                            | なし                                         | **Missing**: 日本語日付文字列の ISO 8601 変換ユーティリティ                                                      |
| モバイル/デスクトップの重複記事排除                             | なし                                         | **Missing**: slug ベースの dedup ロジック（パーサー内で実装）                                                    |

### Requirement 3: Anthropic News プロバイダ

| 技術的ニーズ                              | 既存アセット            | ギャップ                                                                                                                            |
| ----------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `https://www.anthropic.com/news` のパース | なし                    | **Missing**: `anthropic-news-parser.ts` 新規作成。CSS module ハッシュ付きクラス名への対応（`[class*="listItem"]` 部分一致セレクタ） |
| 個別記事ページの本文取得                  | `html-fetch-service.ts` | ギャップなし — Static HTML で取得可能                                                                                               |
| Featured Grid と Publication List の統合  | なし                    | **Missing**: 2セクションからの記事抽出と slug ベース dedup                                                                          |
| 英語日付パース（"Mar 6, 2026"）           | なし                    | **Missing**: 英語日付文字列の ISO 8601 変換（`Date.parse()` で対応可能）                                                            |

### Requirement 4: Jules Changelog プロバイダ

| 技術的ニーズ                                    | 既存アセット                                       | ギャップ                                                                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://jules.google/docs/changelog/` のパース | なし                                               | **Missing**: `jules-changelog-parser.ts` 新規作成。`article.changelog-entry` からの抽出。Astro/Starlight フレームワーク — Gemini CLI パーサーと類似の DOM 構造 |
| インラインコンテンツ抽出（個別ページ不要）      | `parseVersionContent()` パターン（Gemini CLI）     | ギャップ小 — 同一ページ内のコンテンツ抽出パターンを踏襲                                                                                                        |
| 日付ベース識別子（例: `2026-02-19`）            | `SourceState.latestDate`（Cursor）                 | ギャップ小 — 既存フィールドを活用可能                                                                                                                          |
| リッチコンテンツ（video, img, h3, code）        | `convertInlineToMarkdown()`（Gemini CLI パーサー） | **Missing**: video/code block のマークダウン変換。画像は要件上通知に含めないため省略可                                                                         |

### Requirement 5: Claude Code Action による翻訳・要約

| 技術的ニーズ                          | 既存アセット                                          | ギャップ                                                                                  |
| ------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 英語→日本語翻訳パイプライン           | Gemini CLI ワークフローの Claude Code Action ステップ | ギャップなし — 同一パターンを踏襲                                                         |
| 日本語コンテンツのスルー              | なし（既存は全て英語ソース）                          | **Missing**: プロンプトに「日本語の場合はそのまま保持」条件を追加                         |
| `summaryJa` + `fullTextJa` の生成     | `summaryJa` のみ（Gemini CLI）                        | **Missing**: `fullTextJa`（要約なし全文翻訳）フィールドの追加。プロンプト・スキーマの拡張 |
| Jules は要約不要（`fullTextJa` のみ） | なし                                                  | **Missing**: ソース別のプロンプトテンプレート分岐                                         |

### Requirement 6: Slack Block Kit 通知フォーマット

| 技術的ニーズ                               | 既存アセット                                       | ギャップ                                                    |
| ------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| 記事ごとの独立メッセージ                   | 既存パターン（バージョンごとの投稿）               | ギャップなし                                                |
| 親メッセージ（要約）+ スレッド返信（全文） | Gemini CLI の GitHub Releases スレッド返信パターン | ギャップ小 — `postThreadReplies` を `fullTextJa` 投稿に転用 |
| Jules は親メッセージのみ                   | Antigravity の単一メッセージパターン               | ギャップなし                                                |
| 画像を含めない                             | 設定次第                                           | ギャップなし — `imageUrls` を空配列にするだけ               |

### Requirement 7: エラーハンドリング

| 技術的ニーズ                         | 既存アセット                                      | ギャップ     |
| ------------------------------------ | ------------------------------------------------- | ------------ |
| エラーログ（ソース・タイムスタンプ） | 既存の `console.error` パターン                   | ギャップなし |
| 一覧ページ取得失敗時のスキップ       | fetch-html-gemini-cli.ts のフォールバックパターン | ギャップなし |
| 個別記事取得失敗時の部分スキップ     | fetch-html-cursor.ts の error isolation パターン  | ギャップなし |

### Requirement 8: GitHub Actions ワークフロー構成

| 技術的ニーズ                 | 既存アセット                              | ギャップ                                              |
| ---------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| 3ソース × 独立ワークフロー   | `html-notify-gemini-cli.yml` テンプレート | ギャップなし — 既存ワークフローをコピー＆カスタマイズ |
| 6時間ごとの cron             | 既存と同一（`0 */6 * * *`）               | ギャップなし                                          |
| ソース別 Slack チャンネル ID | `SLACK_CHANNEL_ID_GEMINI_CLI` パターン    | ギャップなし — Secrets 名を変更するだけ               |

---

## 2. 状態管理の設計課題（最重要ギャップ）

### 現状

```typescript
// SourceState（現在）
interface SourceState {
  hash: string;
  lastCheckedAt: string;
  latestVersion?: string; // Gemini CLI / Antigravity
  latestDate?: string; // Cursor
  latestSlug?: string; // Cursor
}
```

### 要件との差分

要件では「前回チェック済み slug リスト」で差分検出を行う。現在の `SourceState` は単一値（`latestVersion` or `latestDate+latestSlug`）しか保持できない。

### 選択肢

**Option A: `knownSlugs: string[]` フィールドを `SourceState` に追加**

- slug リストを状態に保存し、新規 slug を検出
- 利点: 確実な差分検出、同日複数記事にも対応
- 欠点: リストが無限に成長 → 上限管理が必要

**Option B: `latestDate` のみで日付比較（Cursor パターン踏襲）**

- 最新記事の日付のみ保存し、それより新しい記事を検出
- 利点: シンプル、既存パターンと整合
- 欠点: 同日投稿の記事を見逃す可能性

**Option C: `latestDate` + `knownSlugs`（直近 N 件）のハイブリッド**

- 日付で大まかにフィルタ + slug リスト（直近50件等）で精密判定
- 利点: 確実かつスケーラブル
- 欠点: 複雑度が上がる

**推奨**: Design フェーズで詳細検討。要件の「slug リスト」表現から **Option A** が最も忠実だが、実用上は **Option C** が堅牢。

---

## 3. 実装アプローチ

### Option A: 既存パターンの拡張（推奨）

既存の Gemini CLI / Cursor パターンを踏襲し、各ソースに専用ファイルを作成する。

**新規作成ファイル（3ソース × 3ファイル + 共通）:**

| ファイル                                            | 目的                           |
| --------------------------------------------------- | ------------------------------ |
| `src/services/openai-news-parser.ts`                | OpenAI News HTML パーサー      |
| `src/services/anthropic-news-parser.ts`             | Anthropic News HTML パーサー   |
| `src/services/jules-changelog-parser.ts`            | Jules Changelog HTML パーサー  |
| `src/scripts/fetch-html-openai-news.ts`             | OpenAI News 取得スクリプト     |
| `src/scripts/fetch-html-anthropic-news.ts`          | Anthropic News 取得スクリプト  |
| `src/scripts/fetch-html-jules-changelog.ts`         | Jules Changelog 取得スクリプト |
| `src/scripts/notify-html-openai-news.ts`            | OpenAI News 通知スクリプト     |
| `src/scripts/notify-html-anthropic-news.ts`         | Anthropic News 通知スクリプト  |
| `src/scripts/notify-html-jules-changelog.ts`        | Jules Changelog 通知スクリプト |
| `.github/workflows/html-notify-openai-news.yml`     | OpenAI News ワークフロー       |
| `.github/workflows/html-notify-anthropic-news.yml`  | Anthropic News ワークフロー    |
| `.github/workflows/html-notify-jules-changelog.yml` | Jules Changelog ワークフロー   |

**既存ファイルの変更:**

| ファイル                             | 変更内容                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `src/services/html-slack-builder.ts` | `buildOpenAiNewsBlocks()`, `buildAnthropicNewsBlocks()`, `buildJulesChangelogBlocks()` 追加 |
| `src/services/state-service.ts`      | `SourceState` に `knownSlugs?: string[]` フィールド追加（必要に応じて）                     |

**トレードオフ:**

- ファイル数が多い（12新規 + 2変更）が、各ソースが独立してテスト・デプロイ可能
- 既存パターンとの一貫性が高く、メンテナンス性が良い
- コード重複が発生するが、各ソースの DOM 構造が異なるため抽象化のメリットは薄い

### Option B: 共通基盤の抽出

3ソース共通の fetch/notify ロジックを汎用化し、ソース固有部分のみプラグインする。

**トレードオフ:**

- ファイル数は減るが、抽象化の設計コストが高い
- 3ソースの微妙な差異（個別記事取得の有無、要約の有無）を汎用化すると複雑になる
- YAGNI: 現時点で3ソースのみなら、抽象化は時期尚早

### Option C: ハイブリッド（パーサーは個別、スクリプトは共通テンプレート）

**トレードオフ:**

- パーサーは DOM 構造に依存するため個別が必須
- fetch/notify スクリプトは共通テンプレートから生成できるが、差異の吸収が煩雑
- 既存ソース（Gemini CLI, Cursor, Antigravity）も将来的に統合する場合は有効

---

## 4. Research Needed（Design フェーズで調査）

| 項目                                        | 理由                                                                         | 優先度                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| OpenAI News の Cloudflare 保護              | `fetch` で 403 返却される可能性。Playwright 必要時の対応策                   | **高**                                       |
| Anthropic News の CSS module ハッシュ安定性 | クラス名のハッシュ部分がデプロイごとに変わる可能性。部分一致セレクタの信頼性 | **中**                                       |
| `SourceState` の slug リスト管理方式        | 無限成長の防止策、上限値の決定                                               | **中**                                       |
| OpenAI News の「さらに読み込む」ボタン      | 初期表示分のみで十分か、全記事のロードが必要か                               | **低**（最新記事のみ監視なら初期表示で十分） |
| Anthropic News の「See more」ボタン         | 同上                                                                         | **低**                                       |

---

## 5. 工数・リスク評価

### 工数: **M（3〜7日）**

- 3ソース × 同一パターンの繰り返し実装
- パーサーのみソース固有（DOM 構造調査 + テスト作成）
- fetch/notify/workflow は既存テンプレートのカスタマイズ
- TDD サイクルでパーサーテストを先行作成

### リスク: **中（Medium）**

- **Cloudflare 保護**（OpenAI News）: `fetch` 取得不可の場合、Playwright への切り替えが必要。既存の `playwright-service.ts` があるため技術的には対応可能だが、CI 環境での Playwright セットアップが追加コスト
- **CSS セレクタの脆弱性**（Anthropic News）: CSS module ハッシュ変更でパーサーが壊れるリスク。部分一致セレクタとテストで緩和
- **状態管理の設計**：slug リスト方式の設計判断が必要。既存パターンからの拡張度合いによりリスクが変動

---

## 6. 推奨事項

### Design フェーズへの推奨

1. **Option A（既存パターンの拡張）** を基本方針とする
2. 状態管理は `knownSlugs` フィールド追加を検討（要件の「slug リスト」に忠実）
3. OpenAI News の Cloudflare 対応を最優先で調査し、Static / Headless の判断を確定する
4. Anthropic News のセレクタ戦略を決定する（CSS module ハッシュ対応）
5. 翻訳プロンプトのテンプレート設計（日本語スルー条件、`summaryJa` + `fullTextJa` 出力スキーマ）
6. Jules Changelog は最もシンプルなため、実装の先行着手候補とする
