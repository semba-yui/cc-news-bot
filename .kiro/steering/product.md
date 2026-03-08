# Product Overview

OSS の changelog を定期的に監視し、変更があれば Slack チャンネルに差分サマリーを通知する CLI ツール。

## Core Capabilities

- **Changelog 取得**: 4方式でソースを取得（Raw Markdown / GitHub Releases / HTML スクレイピング / Headless ブラウザ）
- **差分検出**: スナップショットベースの差分検出（SHA-256 ハッシュ比較 + unified diff 生成）
- **Slack 通知**: 変更サマリーをスレッド形式で Slack に投稿（長文の自動分割対応）
- **HTML ニュースページ解析**: Antigravity・Cursor・Gemini CLI 等のニュースページから記事を抽出・パースし Slack 通知
- **状態管理**: ファイルベースの状態永続化で前回実行との差分を追跡

## Target Use Cases

- 依存ライブラリ・ツールの changelog 変更をチームへリアルタイム共有
- CI/CD スケジュール実行で定期的な更新チェックを自動化

## Value Proposition

複数の OSS プロジェクトの changelog を一元監視し、差分のみを Slack に通知することで、チームの情報キャッチアップコストを削減する。
