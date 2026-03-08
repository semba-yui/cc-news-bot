# 要件定義書

## はじめに

本仕様は、cc-news-bot に HTML ページを情報ソースとする新しいプロバイダ群を追加するための要件を定義する。
対象は **Gemini CLI**・**Cursor**・**Antigravity** の3ソースであり、既存の CHANGELOG.md・GitHub Releases 形式プロバイダとは異なる、HTML スクレイピングおよびヘッドレスブラウザを活用した取得アーキテクチャを採用する。

## Requirements

### Requirement 1: HTML ソースプロバイダ共通基盤

**目的:** ボット管理者として、HTML ページから更新情報を取得する共通の仕組みが欲しい。これにより、新たな HTML ベースのソースを容易に追加できるようにしたい。

#### 受け入れ基準

1. The cc-news-bot shall HTML ベースのソースプロバイダを既存の CHANGELOG.md・GitHub Releases プロバイダと並列に、拡張可能なプロバイダタイプとしてサポートする。
2. When HTML プロバイダが設定されている場合, the cc-news-bot shall 指定 URL から HTML コンテンツを取得し、更新情報を抽出する。
3. The cc-news-bot shall 各 HTML ソースの最終確認済みバージョンまたは識別子を状態管理ファイルに永続化し、新規更新のみを通知する差分検出を可能にする。
4. If HTML コンテンツの取得に失敗した場合, the cc-news-bot shall エラーを記録し、該当ソースの通知をスキップする。

### Requirement 2: Gemini CLI プロバイダ

**目的:** ボット管理者として、Gemini CLI の更新情報を要約（親スレッド）と詳細（返信スレッド）の2段階で Slack に通知したい。

#### 受け入れ基準

1. The Gemini CLI プロバイダ shall バージョン番号（`v0.x.x` 形式）を差分検出の識別子として使用する。
2. When Gemini CLI の新バージョンが検出された場合, the Gemini CLI プロバイダ shall `geminicli.com/docs/changelogs/` からそのバージョンの要約コンテンツ（テキスト・画像・GIF リンク）を取得する。
3. When `geminicli.com/docs/changelogs/` の取得に成功した場合, the Gemini CLI プロバイダ shall 要約コンテンツを日本語に翻訳し、画像・GIF を含む Block Kit メッセージとして Slack 親スレッドに投稿する。
4. When 親スレッドへの投稿に成功した場合, the Gemini CLI プロバイダ shall `github.com/google-gemini/gemini-cli/releases` から対応するバージョンのリリース詳細を取得し、Slack 返信スレッドに投稿する。
5. If `geminicli.com/docs/changelogs/` の取得に失敗した場合, the Gemini CLI プロバイダ shall エラーを記録し、GitHub Releases のコンテンツのみを使用して通知を行う。
6. If `github.com/google-gemini/gemini-cli/releases` の取得に失敗した場合, the Gemini CLI プロバイダ shall エラーを記録し、親スレッドのみで通知を完了する。

### Requirement 3: Cursor プロバイダ

**目的:** ボット管理者として、Cursor の更新情報を画像・動画付きで Slack に通知したい。

#### 受け入れ基準

1. The Cursor プロバイダ shall バージョン番号（`major.minor` 形式、例: `2.5`）を差分検出の識別子として使用する。
2. When Cursor の新バージョンが検出された場合, the Cursor プロバイダ shall `cursor.com/ja/changelog` から該当バージョンのコンテンツ（テキスト・画像・動画）を取得する。
3. When Cursor のコンテンツ取得に成功した場合, the Cursor プロバイダ shall 取得したコンテンツを翻訳せずそのまま、1スレッドの Slack Block Kit メッセージとして投稿する。
4. Where Cursor のページに画像または動画が含まれる場合, the Cursor プロバイダ shall それらを親スレッドの Slack メッセージに含める。
5. If Cursor のコンテンツ取得に失敗した場合, the Cursor プロバイダ shall エラーを記録し、該当バージョンの通知をスキップする。

### Requirement 4: Antigravity プロバイダ

**目的:** ボット管理者として、Google Antigravity の更新情報を HTML の構成を維持しつつ日本語で Slack に通知したい。

#### 受け入れ基準

1. The Antigravity プロバイダ shall バージョン番号（`X.Y.Z` 形式・`v` プレフィックスなし、例: `1.19.6`）を差分検出の識別子として使用する。
2. The Antigravity プロバイダ shall コンテンツが JavaScript レンダリングによって生成されるため、ヘッドレスブラウザ（Playwright または Puppeteer 等）を使用してページを取得する。
3. When Antigravity の新規バージョンが検出された場合, the Antigravity プロバイダ shall ヘッドレスブラウザを用いて更新内容（Improvements・Fixes・Patches の固定3カテゴリ）を取得する。
4. When Antigravity のコンテンツ取得に成功した場合, the Antigravity プロバイダ shall 各カテゴリ構成を維持したまま日本語に翻訳し、1スレッドの Slack Block Kit メッセージとして投稿する。
5. If ヘッドレスブラウザによる取得に失敗した場合, the Antigravity プロバイダ shall エラーを記録し、該当バージョンの通知をスキップする。

### Requirement 5: Slack Block Kit 通知フォーマット

**目的:** チームメンバーとして、各ソースの更新情報が見やすい構造化された形式で Slack に表示されるようにしたい。

#### 受け入れ基準

1. The cc-news-bot shall 全ての HTML ソースプロバイダからの通知を Slack Block Kit 形式で投稿する。
2. The cc-news-bot shall 各通知にソース名・バージョン・更新内容を含める。
3. Where 画像または GIF が含まれる場合（Gemini CLI・Cursor）, the cc-news-bot shall それらを Block Kit の image block または attachment として通知に含める。
4. When Cursor または Antigravity の通知を行う場合, the cc-news-bot shall 全コンテンツを1スレッドに集約した Block Kit メッセージとして投稿する。

### Requirement 6: エラーハンドリング

**目的:** ボット管理者として、取得エラー発生時に問題を追跡可能にしたい。

#### 受け入れ基準

1. The cc-news-bot shall エラー発生時にエラー内容・対象ソース・タイムスタンプをログに記録する。
2. Where Gemini CLI のプライマリソース（`geminicli.com`）が利用不可の場合, the Gemini CLI プロバイダ shall GitHub Releases のみを使用するフォールバック動作を行う。

### Requirement 7: GitHub Actions ワークフロー構成

**目的:** ボット管理者として、各プロバイダの更新頻度に合わせた柔軟なスケジュールで実行できるよう、ワークフローをプロバイダごとに独立して管理したい。

#### 受け入れ基準

1. The cc-news-bot shall 各 HTML ソースプロバイダ（Gemini CLI・Cursor・Antigravity）に対して独立した GitHub Actions ワークフローファイルを持つ。
2. The cc-news-bot shall 各ワークフローの cron スケジュールをプロバイダごとに個別に設定可能にする。
3. The cc-news-bot shall 各ワークフローに `workflow_dispatch` トリガーを設け、手動実行を可能にする。
