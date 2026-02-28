# コントリビューションガイド

プロジェクトの概要・アーキテクチャ・セットアップについては [README.md](./README.md) を参照してください。
このファイルでは、開発に参加するための情報をまとめています。

## 開発環境のセットアップ

### 前提ツール

- [Devbox](https://www.jetify.com/devbox)（Node.js 24 の管理に使用）
- pnpm 10+（Devbox 内で Corepack 経由で自動有効化）

### セットアップ手順

```bash
# Devbox シェルを起動（Node.js 24 + Corepack が有効になる）
devbox shell

# 依存パッケージをインストール
pnpm install
```

### ローカル実行時の環境変数

スクリプトをローカルで手動実行する場合に必要です。

```bash
export GITHUB_TOKEN=...       # GitHub Releases API 用（任意、レート制限緩和）
export SLACK_BOT_TOKEN=...    # notify.ts 実行時に必要
```

## 開発コマンド

| コマンド              | 説明                          |
| --------------------- | ----------------------------- |
| `pnpm fmt`            | oxfmt でフォーマット          |
| `pnpm fmt:check`      | フォーマットチェックのみ      |
| `pnpm lint`           | oxlint で静的解析             |
| `pnpm lint:fix`       | oxlint で自動修正             |
| `pnpm lint:typecheck` | type-aware な静的解析         |
| `pnpm test`           | vitest で全テスト実行         |
| `pnpm test:watch`     | vitest をウォッチモードで実行 |

スクリプトの直接実行:

```bash
npx tsx src/scripts/fetch-and-diff.ts
npx tsx src/scripts/notify.ts
```

## コード規約

### 命名規則

| 対象             | 規則             | 例                                  |
| ---------------- | ---------------- | ----------------------------------- |
| ファイル名       | kebab-case       | `fetch-service.ts`                  |
| Interface / Type | PascalCase       | `SourceConfig`, `DiffResult`        |
| 関数             | camelCase        | `fetchRawMarkdown`, `detectChanges` |
| 定数             | UPPER_SNAKE_CASE | `DATA_DIR`, `MAX_MESSAGE_LENGTH`    |

### import の記述順

```typescript
// 1. Node.js built-in（node: プレフィクス必須）
import { readFileSync } from "node:fs";
// 2. 外部パッケージ
import { createPatch } from "diff";
// 3. 内部モジュール（.js 拡張子必須）
import { DATA_DIR } from "../config/sources.js";
```

### ESM ルール

- `"type": "module"` + NodeNext。CommonJS は使わない
- 内部モジュールの import は必ず `.js` 拡張子付き

### 副作用の注入パターン

サービス関数はディレクトリパスや外部依存をデフォルト引数で受け取り、テスト時にオーバーライド可能にします。

```typescript
// Good: パスを引数で受け取る
export async function loadSnapshot(
  source: string,
  snapshotsDir: string = DATA_DIR.snapshots,
): Promise<string | null> { ... }

// Bad: パスをハードコード
export async function loadSnapshot(source: string) {
  const path = "/some/hardcoded/path";
}
```

## テストガイドライン

### ファイル配置

全テストは `src/__tests__/` に `*.test.ts` パターンで配置します。サービスごとにファイルを分けてください。

### HTTP モック（MSW）

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("https://raw.githubusercontent.com/...", () => {
    return HttpResponse.text("# Changelog\n## v1.0.0\n...");
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### DI パターンを活用したテスト

副作用注入パターンにより、テスト用の一時ディレクトリやスタブを渡せます。

```typescript
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const testDir = mkdtempSync(join(tmpdir(), "test-"));
const result = await loadSnapshot("claude-code", testDir);
```

### テスト命名

```typescript
describe("detectChanges", () => {
  it("初回実行時は hasChanges: false を返す", () => { ... });
  it("コンテンツが同一の場合は hasChanges: false を返す", () => { ... });
  it("コンテンツが変わった場合は hasChanges: true と diffText を返す", () => { ... });
});
```

## Git ワークフロー

### コミットメッセージ（Conventional Commits）

commitlint により以下の prefix が必須です。

| prefix      | 用途             |
| ----------- | ---------------- |
| `feat:`     | 新機能           |
| `fix:`      | バグ修正         |
| `chore:`    | ビルド・設定変更 |
| `docs:`     | ドキュメントのみ |
| `test:`     | テストのみ       |
| `refactor:` | リファクタリング |

### secretlint

シークレットの誤コミットを防止するため、secretlint が導入されています。`SLACK_BOT_TOKEN` などのトークンを `.ts` ファイルにハードコードしないでください。

## 新しい changelog ソースの追加方法

### 1. `src/config/sources.ts` にソースを追加

```typescript
export const SOURCES: SourceConfig[] = [
  // ...既存ソース...

  // Raw Markdown の場合
  {
    name: "new-tool",
    type: "raw_markdown",
    url: "https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md",
  },

  // GitHub Releases の場合
  {
    name: "new-tool",
    type: "github_releases",
    url: "https://api.github.com/repos/owner/repo/releases",
    owner: "owner",
    repo: "repo",
  },
];
```

### 2. 取得方式の選択

- **`raw_markdown`** — 公開 URL から Markdown テキストを直接取得できる場合
- **`github_releases`** — GitHub Releases API から最新リリースを取得する場合

### 3. テストの追加

`src/__tests__/` にテストファイルを作成し、MSW で HTTP モックした上で取得・差分検出が正しく動くことを確認してください。

## Spec-Driven Development (Kiro / AI-DLC)

このプロジェクトは Kiro スタイルの AI-DLC（AI Development Life Cycle）で開発されています。

### 仕様の構成

```
.kiro/
├── steering/                          # プロジェクト全体のルール・コンテキスト
│   ├── product.md                     # プロダクト概要
│   ├── tech.md                        # 技術スタック・開発標準
│   └── structure.md                   # ディレクトリ構成・命名規則
└── specs/
    └── changelog-slack-notifier/      # 機能仕様
        ├── requirements.md            # 要件定義
        ├── design.md                  # 設計ドキュメント
        ├── tasks.md                   # 実装タスク一覧
        └── spec.json                  # フェーズ管理メタデータ
```

### 新機能追加時のワークフロー

```
1. /kiro:spec-init "機能の説明"          # 新しい spec を作成
2. /kiro:spec-requirements {feature}    # 要件を生成・レビュー
3. /kiro:spec-design {feature}          # 設計を生成・レビュー
4. /kiro:spec-tasks {feature}           # タスクを生成・レビュー
5. /kiro:spec-impl {feature}            # 実装
```

仕様ドキュメントは日本語で記述してください（`spec.json` の `language: "ja"`）。各フェーズは人間のレビューと承認が必要です。
