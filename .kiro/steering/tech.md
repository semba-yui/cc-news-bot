# Technology Stack

## Architecture

サービス分離型の CLI アプリケーション。各サービスが単一責務を持ち、副作用（ファイル I/O、ネットワーク）を関数引数で注入可能にしてテスタビリティを確保。

## Core Technologies

- **Language**: TypeScript（strict mode）
- **Runtime**: Node.js 24+（ES2024 target、ESM native）
- **Module System**: NodeNext（`.js` 拡張子付き import）
- **Package Manager**: pnpm 10+（catalog 機能で依存バージョン管理）
- **Environment**: Devbox（Node.js 24 + Corepack 有効）

## Key Libraries

- **diff**: unified diff 生成
- **msw**: テストでの HTTP モック

## Development Standards

### Type Safety

- TypeScript strict mode
- `noEmit: true`（トランスパイルは tsx で実行）

### Code Quality

- **Linter**: oxlint（type-aware チェック対応）
- **Formatter**: oxfmt
- **Commit**: commitlint（conventional commits）
- **Secrets**: secretlint

### Testing

- **Runner**: vitest
- **HTTP Mock**: msw
- テストファイルは `src/__tests__/` に `*.test.ts` パターンで配置

## Development Environment

### Required Tools

- Devbox（Node.js 24 管理）
- pnpm（Corepack 経由）

### Common Commands

```bash
# Format: pnpm fmt
# Lint: pnpm lint
# Type-aware lint: pnpm lint:typecheck
# Test: pnpm test
# Test (watch): pnpm test:watch
```

## Key Technical Decisions

- **ESM only**: `"type": "module"` + NodeNext。CJS は使わない
- **副作用の注入**: ディレクトリパスやトークンを関数引数にし、テストでの差し替えを容易にする
- **`fetch` API 直接使用**: HTTP クライアントライブラリを使わず、Node.js 標準の `fetch` を使用
- **oxc ツールチェーン**: ESLint/Prettier の代わりに oxlint/oxfmt を採用（高速）
