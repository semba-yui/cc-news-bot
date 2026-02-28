# Requirements Document

## Introduction

本ドキュメントは「cc-news-bot」の要件を定義する。GitHub Actions の cron スケジュールで AI コーディングツール（Claude Code, OpenAI Codex, GitHub Copilot CLI）の changelog を定期的に監視し、更新があった場合に Claude Code Action で日本語要約を生成して Slack に通知するシステムである。

### 収集済み変数

| #   | 項目                | 値                                                                                                                                                                                                            |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 監視対象            | claude-code, openai/codex, github/copilot-cli の 3 つ（固定）                                                                                                                                                 |
| 2   | 監視対象 URL        | `https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md`, `https://github.com/openai/codex/releases`, `https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md` |
| 3   | 実行頻度            | 3時間ごと（UTC 基準、`0 */3 * * *`）                                                                                                                                                                          |
| 4   | Slack 連携方法      | Slack Bot Token（GitHub Secrets: `SLACK_BOT_TOKEN`）                                                                                                                                                          |
| 5   | Slack チャンネル ID | `C0AHQ59G8HJ`                                                                                                                                                                                                 |
| 6   | Claude 認証         | サブスクリプション OAuth トークン（GitHub Secrets: `CLAUDE_CODE_OAUTH_TOKEN`）                                                                                                                                |
| 7   | 状態管理            | リポジトリ内ファイルに前回スナップショットを保存                                                                                                                                                              |
| 8   | 通知構成            | メインメッセージ = Claude による日本語要約、スレッド返信 = 原文 diff                                                                                                                                          |
| 9   | エラー時挙動        | Slack にエラー通知 + 他ソースの処理は継続                                                                                                                                                                     |
| 10  | 通知粒度            | ソースごとに別メッセージとして投稿                                                                                                                                                                            |
| 11  | 初回実行            | スナップショット保存のみ（通知なし）                                                                                                                                                                          |
| 12  | 長文対応            | Slack メッセージ上限超過時は複数メッセージに分割                                                                                                                                                              |
| 13  | 拡張性              | 現時点では 3 ソース固定。将来の追加は別途対応                                                                                                                                                                 |
| 14  | Bot 表示名/アイコン | Slack App 管理画面で設定（コード側対応不要）                                                                                                                                                                  |

### 要約フォーマット

```markdown
## ひとこと

- 差分の中で目玉機能などをピックアップし、どんな変更があったのかをわかりやすくひとことで

## 変更内容

### 新規追加

- xxx

### 修正

- xxx

### 改善

- xxx

## 用語解説

- 特殊な用語などあればピックアップして解説
```

## Requirements

### Requirement 1: 定期スケジュール実行

**Objective:** As a チームメンバー, I want changelog の更新チェックが自動的に定期実行される, so that 手動でチェックする手間なく最新情報を受け取れる

#### Acceptance Criteria

1. The Changelog Notifier shall 3時間ごと（UTC 基準、`0 */3 * * *`）に GitHub Actions の cron スケジュールで自動実行される
2. The Changelog Notifier shall `workflow_dispatch` イベントによる手動実行にも対応する
3. When ワークフローが実行された時, the Changelog Notifier shall 3つの監視対象（claude-code, openai/codex, github/copilot-cli）すべての changelog を取得する

### Requirement 2: Changelog 取得

**Objective:** As a システム, I want 各監視対象の最新 changelog を取得できる, so that 前回との差分を検出できる

#### Acceptance Criteria

1. When changelog 取得が実行された時, the Changelog Notifier shall `https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md` から Claude Code の changelog を取得する
2. When changelog 取得が実行された時, the Changelog Notifier shall GitHub Releases API 経由で `openai/codex` のリリース情報を取得する
3. When changelog 取得が実行された時, the Changelog Notifier shall `https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md` から Copilot CLI の changelog を取得する
4. If changelog の取得に失敗した場合, the Changelog Notifier shall 該当ソースの取得エラーを Slack に通知し、他のソースの処理を継続する

### Requirement 3: 差分検出

**Objective:** As a システム, I want 前回チェック時からの changelog の変更を検出できる, so that 新しい変更のみを通知対象にできる

#### Acceptance Criteria

1. The Changelog Notifier shall 前回チェック時の changelog スナップショットをリポジトリ内ファイルとして保持する
2. When changelog を取得した時, the Changelog Notifier shall 前回スナップショットと比較して差分を検出する
3. When 差分が検出されなかった場合, the Changelog Notifier shall 要約生成および Slack 通知をスキップする
4. When 差分が検出された場合, the Changelog Notifier shall 差分内容を後続の要約ステップに渡す
5. The Changelog Notifier shall 各監視対象ごとに独立して差分を検出する

### Requirement 4: 初回実行

**Objective:** As a システム, I want 初回実行時に安全にベースラインを確立できる, so that 次回以降の差分検出が正しく機能する

#### Acceptance Criteria

1. When スナップショットファイルが存在しない状態で実行された時, the Changelog Notifier shall 現在の changelog をスナップショットとして保存のみ行う
2. When 初回実行の時, the Changelog Notifier shall Slack への通知を行わない
3. When 初回実行が完了した時, the Changelog Notifier shall スナップショットをリポジトリにコミットする

### Requirement 5: Claude Code Action による日本語要約生成

**Objective:** As a チームメンバー, I want changelog の差分が日本語で要約される, so that 英語の changelog を読まなくても変更内容を素早く理解できる

#### Acceptance Criteria

1. When 差分が検出された時, the Changelog Notifier shall Claude Code Action（`anthropics/claude-code-action`）を使用して差分の日本語要約を生成する
2. The Changelog Notifier shall Claude Code Action の認証にサブスクリプション OAuth トークン（`CLAUDE_CODE_OAUTH_TOKEN`）を使用する
3. The Changelog Notifier shall 以下のフォーマットで要約を生成する:
   - 「ひとこと」セクション: 目玉機能をピックアップし変更内容をわかりやすく一言で説明
   - 「変更内容」セクション: 「新規追加」「修正」「改善」のサブセクションに分類
   - 「用語解説」セクション: 特殊な用語があればピックアップして解説
4. The Changelog Notifier shall 各監視対象ごとに個別の要約を生成する

### Requirement 6: Slack 通知

**Objective:** As a チームメンバー, I want changelog の要約が Slack に投稿される, so that チーム全体が変更情報を共有できる

#### Acceptance Criteria

1. When 要約が生成された時, the Changelog Notifier shall Slack Bot Token（`SLACK_BOT_TOKEN`）を使用してチャンネル `C0AHQ59G8HJ` にメインメッセージとして日本語要約を投稿する
2. When メインメッセージが投稿された時, the Changelog Notifier shall 同メッセージのスレッド返信として原文の差分テキストを投稿する
3. The Changelog Notifier shall 変更が検出された監視対象ごとに個別のメッセージとして投稿する（1ソース = 1メッセージ + スレッド返信）
4. If 原文の差分テキストが Slack のメッセージ上限を超える場合, the Changelog Notifier shall 複数のスレッド返信メッセージに分割して投稿する
5. If Slack への投稿に失敗した場合, the Changelog Notifier shall ワークフローのログにエラー内容を記録する

### Requirement 7: エラー通知

**Objective:** As a 開発者, I want エラー発生時に Slack で通知される, so that 問題を早期に検知し対処できる

#### Acceptance Criteria

1. If changelog の取得に失敗した場合, the Changelog Notifier shall チャンネル `C0AHQ59G8HJ` にエラー内容を Slack 通知する
2. When エラーが発生した場合, the Changelog Notifier shall 該当ソースのみスキップし、他のソースの処理を継続する
3. The Changelog Notifier shall エラー通知にソース名とエラー内容を含める

### Requirement 8: 状態管理

**Objective:** As a システム, I want チェック状態が永続化される, so that 次回実行時に前回との差分を正確に検出できる

#### Acceptance Criteria

1. When 処理が完了した時, the Changelog Notifier shall 最新の changelog スナップショットでリポジトリ内のファイルを更新する
2. When スナップショットが更新された時, the Changelog Notifier shall 変更をリポジトリに自動コミットする
3. The Changelog Notifier shall 最終チェック日時を状態ファイルに記録する
4. When 差分が検出されなかった場合, the Changelog Notifier shall スナップショットの更新やコミットを行わない

### Requirement 9: シークレット管理

**Objective:** As a 開発者, I want 機密情報が安全に管理される, so that トークンが漏洩するリスクを最小化できる

#### Acceptance Criteria

1. The Changelog Notifier shall Slack Bot Token を GitHub Secrets（`SLACK_BOT_TOKEN`）から参照する
2. The Changelog Notifier shall Claude Code Action の認証トークンを GitHub Secrets（`CLAUDE_CODE_OAUTH_TOKEN`）から参照する
3. The Changelog Notifier shall 機密情報をワークフローファイルやリポジトリ内のコードにハードコードしない
