# Research & Design Decisions

---

**Purpose**: ニュースページプロバイダ追加に関するディスカバリー調査結果と設計判断の記録。

---

## Summary

- **Feature**: `news-page-providers`
- **Discovery Scope**: Extension（既存 HTML ソースプロバイダアーキテクチャの拡張）
- **Key Findings**:
  - OpenAI News は Cloudflare ボット保護により `fetch` では 403 が返る可能性があり、Playwright が必要になるリスクがある
  - Anthropic News は SSR（Next.js RSC）で静的 fetch 可能。CSS クラス名にハッシュが含まれるため構造セレクタを優先すべき
  - Jules Changelog は Astro 静的サイトで全エントリが1ページに展開済み。個別ページアクセス不要

## Research Log

### OpenAI News HTML 構造

- **Context**: `https://openai.com/ja-JP/news/company-announcements/` のスクレイピング可能性調査
- **Sources Consulted**: WebFetch による実ページ取得
- **Findings**:
  - 各記事は `main a[href*="/index/"]` で取得可能
  - タイトル: `a > div > div:first-child` のテキスト
  - 日付: `a > div > p time[datetime]` 属性（ISO 8601 形式）
  - slug: `href` から `/ja-JP/index/{slug}/` パターンで抽出
  - 個別記事ページ URL: `https://openai.com/ja-JP/index/{slug}/`
  - ja-JP ページのため、コンテンツは日本語で提供される
  - Cloudflare ボット保護あり（`fetch` で 403 の可能性）
  - モバイル/デスクトップで DOM が重複する場合あり → `href` でデデュプ必要
- **Implications**: 要件では Static HTML（`fetch`）を前提としているが、Cloudflare 保護により Playwright が必要になる可能性がある。設計では `fetchStaticHtml` を主とし、失敗時に Playwright フォールバックを考慮する

### Anthropic News HTML 構造

- **Context**: `https://www.anthropic.com/news` のスクレイピング可能性調査
- **Sources Consulted**: WebFetch による実ページ取得
- **Findings**:
  - 記事リスト: `li > a[href^="/news/"]` で各記事リンクを取得
  - 日付: `time` 要素のテキスト（"Mar 6, 2026" 形式、`datetime` 属性なし）
  - カテゴリ: `span` 要素のテキスト
  - タイトル: 最後の `span` 要素のテキスト
  - slug: `href` から `/news/{slug}` パターンで抽出
  - 個別記事ページ URL: `https://www.anthropic.com/news/{slug}`
  - CSS クラス名にハッシュ含む（`__KxYrHG__`）→ デプロイごとに変化の可能性
  - RSC payload に CMS データ埋め込みあり（代替スクレイピングソース）
  - Static fetch で取得可能（ボット保護なし）
- **Implications**: 構造セレクタ（`a[href^="/news/"]`）を使用し、ハッシュ付きクラス名への依存を避ける。日付パースが必要（`datetime` 属性なし）

### Jules Changelog HTML 構造

- **Context**: `https://jules.google/docs/changelog/` のスクレイピング可能性調査
- **Sources Consulted**: WebFetch による実ページ取得
- **Findings**:
  - 各エントリ: `article.changelog-entry` で取得
  - タイトル: `article > header > h2` のテキスト、`id` 属性がスラッグ化されたタイトル
  - 日付: `article > header > span.date` のテキスト（"February 19, 2026" 形式）
  - コンテンツ: `<header>` 以降の全兄弟要素（`<p>`, `<div>`, `<video>`, `<ul>` 等）
  - 全エントリが1ページに展開（ページネーションなし）
  - Astro 静的サイト（Starlight テーマ）
  - 個別ページなし → アンカーリンク形式 `#{title-id}`
  - Static fetch で取得可能
- **Implications**: 個別ページアクセス不要。`h2[id]` をスラッグとして使用可能だが、要件では日付ベース URL パス（`2026-02-19`）を識別子とする

### 既存 HTML ソースプロバイダパターン分析

- **Context**: 新プロバイダ設計のための既存アーキテクチャ分析
- **Sources Consulted**: 既存コードベース（`src/services/`, `src/scripts/`, `.github/workflows/`）
- **Findings**:
  - 3-Phase Pipeline: fetch → transform（Claude Code Action）→ notify
  - Deps interface パターンで副作用を注入
  - `SourceState` に `latestVersion` / `latestDate`+`latestSlug` で差分検出
  - Slack Block Kit は `html-slack-builder.ts` にビルダー関数を追加する方式（Cursor 除く）
  - 状態ファイルは `data/state/{source}.json` に個別保存
  - CI ワークフローは state ファイルのみ git commit
- **Implications**: 既存パターンを踏襲。ニュースページは複数記事が同時に新着となるため、slug リストベースの差分検出が必要（既存の単一 version/date 方式とは異なる）

## Architecture Pattern Evaluation

| Option                             | Description                                                | Strengths                                  | Risks / Limitations                    | Notes         |
| ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | -------------------------------------- | ------------- |
| 既存パターン踏襲 + slug リスト拡張 | 既存 3-Phase Pipeline に slug リストベースの差分検出を追加 | 一貫性、学習コスト低、テスト資産再利用可能 | SourceState の拡張が必要               | 選択          |
| 汎用ニュースページプロバイダ基盤   | 全3ソースを1つの汎用フレームワークで処理                   | コード重複削減                             | 過度な抽象化、ソース固有の差異が大きい | 不採用：YAGNI |

## Design Decisions

### Decision: slug リストベースの差分検出

- **Context**: ニュースページは複数記事が同時に追加される。既存の `latestVersion`（単一値）方式では複数記事の追跡に不十分
- **Alternatives Considered**:
  1. 単一 `latestSlug` — 最新1件のみ追跡、間の記事を見逃す可能性
  2. `latestDate` ベース — 同日の複数記事を正しく処理できない
  3. `knownSlugs` リスト — 既知の slug セットを保持し、差集合で新着を検出
- **Selected Approach**: `knownSlugs: string[]` を `SourceState` に追加
- **Rationale**: 複数記事の同時追加に対応可能。slug の一意性が保証されている各ソースに適合
- **Trade-offs**: state ファイルのサイズが記事数に比例して増加するが、ニュースページの記事数は数百程度で問題なし
- **Follow-up**: 初回実行時は最新3件のみを `knownSlugs` に登録する処理が必要

### Decision: OpenAI News の取得方式

- **Context**: OpenAI News は Cloudflare ボット保護の存在が確認された
- **Alternatives Considered**:
  1. `fetchStaticHtml` のみ — シンプルだが 403 リスクあり
  2. Playwright のみ — 確実だが CI 環境で重い
  3. `fetchStaticHtml` 優先 + Playwright フォールバック — Gemini CLI パターン踏襲
- **Selected Approach**: 要件に従い `fetchStaticHtml` で実装。Cloudflare 保護が実際に問題となった場合は Playwright フォールバックを追加（将来対応）
- **Rationale**: 要件では Static HTML を前提としており、ja-JP ページでは保護レベルが異なる可能性もある。まず要件通り実装し、実際の挙動で判断する
- **Trade-offs**: 初回テストで 403 が返る場合は Playwright への切り替えが必要

## Risks & Mitigations

- OpenAI Cloudflare ボット保護 — まず `fetchStaticHtml` で試行し、403 発生時は Playwright フォールバックを追加
- Anthropic CSS クラスハッシュ変更 — 構造セレクタ（`a[href^="/news/"]`）を使用しクラス名に依存しない
- 日付パース精度（Anthropic/Jules） — `datetime` 属性がないため表示テキストをパース。フォーマット変更時にパースエラーとなるリスク → エラーログ出力で検知

## References

- [OpenAI News](https://openai.com/ja-JP/news/company-announcements/) — ja-JP 企業ニュースページ
- [Anthropic News](https://www.anthropic.com/news) — ニュース一覧ページ
- [Jules Changelog](https://jules.google/docs/changelog/) — Astro 静的 changelog
- 既存コード: `src/services/gemini-cli-parser.ts`, `src/scripts/fetch-html-gemini-cli.ts` — 最も類似するパターン
