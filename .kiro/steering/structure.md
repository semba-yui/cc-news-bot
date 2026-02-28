# Project Structure

## Organization Philosophy

レイヤー分離型。`config/` で設定・定数を、`services/` でビジネスロジックを分離。テストは `__tests__/` に集約。

## Directory Patterns

### Config

**Location**: `src/config/`
**Purpose**: ソース定義、ディレクトリパス、初期化処理などの設定
**Example**: `sources.ts`（監視対象定義 + DATA_DIR パス定数）

### Services

**Location**: `src/services/`
**Purpose**: 単一責務のビジネスロジック。各サービスは独立してテスト可能
**Example**: `fetch-service.ts`（取得）、`diff-service.ts`（差分検出）、`slack-service.ts`（通知）、`state-service.ts`（状態管理）

### Tests

**Location**: `src/__tests__/`
**Purpose**: 全テストを集約。サービスごとに `*.test.ts` ファイルを作成
**Example**: `fetch-github-releases.test.ts`、`diff-service.test.ts`

### Data

**Location**: `data/`（実行時生成、gitignore 対象）
**Purpose**: スナップショット、差分ファイル、状態ファイルの永続化
**Subdirs**: `snapshots/`、`diffs/`、`summaries/`、`current/`

## Naming Conventions

- **Files**: kebab-case（`fetch-service.ts`、`init-dirs.ts`）
- **Interfaces/Types**: PascalCase（`SourceConfig`、`DiffResult`）
- **Functions**: camelCase（`fetchRawMarkdown`、`detectChanges`）
- **Constants**: UPPER_SNAKE_CASE（`DATA_DIR`、`MAX_MESSAGE_LENGTH`）

## Import Organization

```typescript
// 1. Node.js built-ins
import { readFileSync } from "node:fs";
// 2. External packages
import { createPatch } from "diff";
// 3. Internal modules (with .js extension)
import { DATA_DIR } from "../config/sources.js";
```

**Import Rules**:

- Node.js built-in は `node:` プレフィクス必須
- 内部モジュールは `.js` 拡張子付き（ESM 要件）
- 相対パスで参照

## Code Organization Principles

- 各サービスは副作用（ディレクトリパス等）をデフォルト引数で受け取り、テストでオーバーライド可能にする
- Interface を export し、サービス間の契約を明確にする
- `SourceConfig.type` による分岐で取得方式を切り替える（Union Type パターン）
