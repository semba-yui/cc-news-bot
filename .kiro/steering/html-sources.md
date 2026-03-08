# HTML Source Architecture

HTML ベースのニュースページ・changelog を取得・解析・通知するための設計パターン。

## 3-Phase Pipeline

```
fetch-html-{source}.ts → [CI: Claude Code Action] → notify-html-{source}.ts
     (取得・抽出)          (翻訳/変換)                  (Slack 通知)
```

1. **Fetch**: HTML 取得 → パース → 差分検出 → `data/html-current/{source}.json` に書き出し
2. **Transform**: CI ワークフロー内で `anthropics/claude-code-action` による AI 処理 → `data/html-summaries/{source}.json`
3. **Notify**: サマリー JSON 読み込み → Slack Block Kit 構築 → 投稿

Transform の内容はソースにより異なる（翻訳 / RSC→Block Kit 変換 等）。

## HTML 取得方式

| 方式     | サービス                | 用途                                          |
| -------- | ----------------------- | --------------------------------------------- |
| Static   | `html-fetch-service.ts` | SSR/静的 HTML。Node.js `fetch` で取得         |
| Headless | `playwright-service.ts` | SPA/CSR。Playwright で JS 実行後の DOM を取得 |

**注意**: HTML 系ソースは `src/config/sources.ts` の `SOURCES` 配列には含まれず、各スクリプトが URL を直接定義する。`SourceConfig` の `html_scraping` / `html_headless` type は将来の統合用に定義されている。

## Source-Specific Patterns

各ソースの特徴は、パーサー API・Transform 内容・差分検出方式の 3 点で異なる。

| Source      | 取得     | パーサー API                                   | 差分キー                    | Transform                                       |
| ----------- | -------- | ---------------------------------------------- | --------------------------- | ----------------------------------------------- |
| Antigravity | Headless | `parseAllVersions` + `parseVersionContent`     | `latestVersion`             | 日英翻訳                                        |
| Gemini CLI  | Static   | `parseAllVersions` + `parseVersionContent`     | `latestVersion`             | 日英翻訳                                        |
| Cursor      | Static   | `parseAllEntries` + `extractArticleRscPayload` | `latestDate` + `latestSlug` | RSC → Slack Block Kit 変換 + Zod バリデーション |

Gemini CLI は HTML パース失敗時に GitHub Releases API へのフォールバックを持つ。notify 時にはスレッド返信で Releases テキストを追加投稿する。

## Deps Interface パターン

全スクリプトは副作用を `Deps` interface で注入する:

```typescript
// Antigravity / Gemini CLI 系
export interface FetchHtml{Source}Deps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetch{方式}: (...) => Promise<string>;
  readonly parseAllVersions: (html: string) => string[];
  readonly parseVersionContent: (html: string, version: string) => Content | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}
```

Cursor は `parseAllEntries` / `extractArticleRscPayload` / `extractMuxVideoData` と異なる API を注入する。

**Rationale**: テストで全副作用をモック可能にし、`main()` で実装を注入する。

## 状態管理

- ソースごとに `data/state/{source}.json` に `SourceState` を保存
- CI ワークフローが state ファイルのみ `git commit` + `push` する（中間ファイルは commit しない）
- `SourceState` の差分検出キーはソースにより異なる（`latestVersion` or `latestDate`+`latestSlug`）

## Adding a New HTML Source

1. `src/services/{source}-parser.ts` — パーサー実装
2. `src/scripts/fetch-html-{source}.ts` — Deps interface + fetch フロー
3. `src/scripts/notify-html-{source}.ts` — サマリー読み込み + Slack 投稿
4. `src/services/html-slack-builder.ts` に `build{Source}Blocks` を追加（または Cursor のように AI 生成 blocks を直接使用）
5. `.github/workflows/html-notify-{source}.yml` — CI ワークフロー（fetch → transform → notify → state commit）
6. テスト: パーサー単体テスト + スクリプト統合テスト
