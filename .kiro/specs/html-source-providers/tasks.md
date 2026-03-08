# 実装計画

- [x] 1. HTML ソースプロバイダの共通基盤を構築する
  - 既存のソース設定の型システムに「HTML スクレイピング」と「HTML ヘッドレス」の2つの取得方式を追加する
  - 状態管理にバージョン文字列による差分検出の仕組みを追加する（`latestVersion` フィールド）
  - HTML 取得コンテンツと翻訳結果の保存先ディレクトリを設定に追加し、初期化処理に含める
  - cheerio と playwright の依存ライブラリをプロジェクトに追加する
  - _Requirements: 1.1, 1.3_

- [x] 2. HTML 取得サービスを実装する
- [x] 2.1 (P) 静的 HTML ページの取得サービスを実装する
  - 指定 URL から HTML コンテンツを取得し文字列として返す機能を実装する
  - タイムアウト制御と User-Agent ヘッダーの設定を含める
  - HTTP エラーやタイムアウト時に適切なエラーをスローする
  - msw を使用した HTTP モックテスト（200 応答・非 200 応答・タイムアウト）を作成する
  - _Requirements: 1.2_
  - _Contracts: html-fetch-service_

- [x] 2.2 (P) ヘッドレスブラウザによる HTML 取得サービスを実装する
  - Playwright Chromium を使用して JavaScript レンダリング後の HTML を取得する機能を実装する
  - ブラウザ起動・ナビゲーション・HTML 取得・終了のライフサイクルを管理する
  - ネットワーク安定待機（networkidle）でレンダリング完了を確認する
  - Playwright のモックを使用したテスト（成功・エラーケース）を作成する
  - _Requirements: 4.2_
  - _Contracts: playwright-service_

- [x] 3. HTML パーサを実装する
  - テストでは `src/__tests__/fixtures/` に保存済みの実サイト HTML フィクスチャを使用する
- [x] 3.1 (P) Gemini CLI の HTML パーサを実装する
  - changelog ページの HTML から最新バージョン（v0.x.x 形式）を抽出する機能を実装する
  - 指定バージョンの要約コンテンツ（テキスト・画像 URL）を抽出する機能を実装する
  - 見出しタグの ID 属性パターンからバージョンを正規表現でマッチする
  - `src/__tests__/fixtures/gemini-cli-changelog.html` をフィクスチャとして使用したテスト（バージョン抽出・コンテンツ抽出・異常系）を作成する
  - _Requirements: 2.1, 2.2_
  - _Contracts: gemini-cli-parser_

- [x] 3.2 (P) Cursor の HTML パーサを実装する
  - changelog ページの HTML から最新バージョン（major.minor 形式）を抽出する機能を実装する
  - 指定バージョンのコンテンツ（テキスト・画像 URL・Mux 動画情報）を抽出する機能を実装する
  - Mux の playbackId からサムネイル URL と HLS ストリーミング URL を生成する
  - `src/__tests__/fixtures/cursor-changelog.html` をフィクスチャとして使用したテスト（バージョン抽出・メディア抽出を含む）を作成する
  - _Requirements: 3.1, 3.2, 3.4_
  - _Contracts: cursor-parser_

- [x] 3.3 (P) Antigravity の HTML パーサを実装する
  - レンダリング済み HTML から最新バージョン（X.Y.Z 形式、v プレフィックスなし）を抽出する機能を実装する
  - 指定バージョンの更新内容を Improvements・Fixes・Patches の固定3カテゴリに分類して抽出する
  - 空カテゴリは空配列で返し、null は使用しない
  - `src/__tests__/fixtures/antigravity-changelog.html`（Playwright 取得済み、`<details>/<summary>` で展開不要）をフィクスチャとして使用したテスト（3カテゴリ抽出・空カテゴリ・バージョン抽出）を作成する
  - _Requirements: 4.1, 4.3_
  - _Contracts: antigravity-parser_

- [x] 4. Slack 通知基盤を拡張する
- [x] 4.1 Slack サービスに画像ブロック型と汎用投稿関数を追加する
  - Block Kit の image ブロック型を既存の Slack ブロック型の Union に追加する
  - 事前ビルド済みの Block Kit ブロック配列を受け取って Slack に投稿する汎用関数を追加する
  - _Requirements: 5.1, 5.3_
  - _Contracts: slack-service 拡張_

- [x] 4.2 HTML プロバイダ用の Block Kit メッセージビルダーを実装する
  - Gemini CLI 用: 翻訳済み要約テキストと画像ブロックを組み合わせた親スレッド用メッセージを生成する
  - Cursor 用: 日本語コンテンツと画像ブロック・Mux 動画サムネイル/リンクを含む単一スレッド用メッセージを生成する
  - Antigravity 用: Improvements・Fixes・Patches の3セクション構成を維持した単一スレッド用メッセージを生成する
  - 各ビルダーの出力（ソース名・バージョン・更新内容・画像ブロックの URL 等）を検証するテストを作成する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Contracts: html-slack-builder_

- [x] 5. 取得スクリプトを実装する
- [x] 5.1 (P) Gemini CLI の取得スクリプトを実装する
  - changelog ページからの取得・解析と GitHub Releases API からのリリース詳細取得を統合する
  - 新バージョン検出時にコンテンツを JSON ファイルに書き出し、状態を更新する
  - geminicli.com 取得失敗時は GitHub Releases のみで継続するフォールバック動作を実装する
  - GitHub Releases 取得失敗時は null として記録し、通知側で親スレッドのみ投稿とする
  - 初回実行（既存バージョンなし）時はバージョンの記録のみ行い通知をスキップする
  - エラー発生時はソース名・メッセージ・タイムスタンプを構造化ログとして記録する
  - 依存性注入パターンで全依存をモック化したテスト（フルモード・フォールバック・エラー・初回実行）を作成する
  - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.5, 2.6, 6.1, 6.2_
  - _Contracts: fetch-html-gemini-cli_

- [x] 5.2 (P) Cursor の取得スクリプトを実装する
  - changelog ページからの取得・解析を行い、新バージョン検出時にコンテンツを JSON ファイルに書き出す
  - 状態管理ファイルのバージョンを更新し、GitHub Actions 出力変数で変更有無を通知する
  - 取得失敗時はエラーをログ記録し、通知をスキップする
  - 依存性注入パターンで全依存をモック化したテスト（成功・エラー・初回実行）を作成する
  - _Requirements: 1.2, 1.4, 3.1, 3.2, 3.5, 6.1_
  - _Contracts: fetch-html-cursor_

- [x] 5.3 (P) Antigravity の取得スクリプトを実装する
  - ヘッドレスブラウザ経由で changelog ページを取得・解析し、新バージョン検出時にコンテンツを JSON ファイルに書き出す
  - 3カテゴリ（Improvements・Fixes・Patches）の構成を維持してコンテンツを保存する
  - Playwright 取得失敗時はエラーをログ記録し、通知をスキップする
  - 依存性注入パターンで全依存をモック化したテスト（成功・エラー・初回実行）を作成する
  - _Requirements: 1.2, 1.4, 4.1, 4.2, 4.3, 4.5, 6.1_
  - _Contracts: fetch-html-antigravity_

- [x] 6. 通知スクリプトを実装する
- [x] 6.1 (P) Gemini CLI の通知スクリプトを実装する
  - 翻訳済みコンテンツの JSON ファイルを読み取り、Block Kit メッセージを生成して Slack 親スレッドに投稿する
  - GitHub Releases テキストが存在する場合は返信スレッドに詳細を投稿する
  - GitHub Releases テキストが null の場合は親スレッドのみで通知を完了する
  - 依存性注入パターンでのテストを作成する
  - _Requirements: 2.3, 2.4, 2.6, 5.1, 5.2, 5.3_
  - _Contracts: notify-html-gemini-cli_

- [x] 6.2 (P) Cursor の通知スクリプトを実装する
  - 取得済みコンテンツの JSON ファイルを読み取り（翻訳不要）、画像・動画を含む Block Kit メッセージを生成して Slack に単一スレッドで投稿する
  - 依存性注入パターンでのテストを作成する
  - _Requirements: 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_
  - _Contracts: notify-html-cursor_

- [x] 6.3 (P) Antigravity の通知スクリプトを実装する
  - 翻訳済みコンテンツの JSON ファイルを読み取り、Improvements・Fixes・Patches の構成を維持した Block Kit メッセージを生成して Slack に単一スレッドで投稿する
  - 依存性注入パターンでのテストを作成する
  - _Requirements: 4.4, 5.1, 5.2, 5.4_
  - _Contracts: notify-html-antigravity_

- [x] 7. GitHub Actions ワークフローを作成する
- [x] 7.1 (P) Gemini CLI 用ワークフローを作成する
  - 6時間ごとの cron スケジュールと手動実行トリガーを設定する
  - 取得→ Claude Code Action 翻訳→ Slack 通知→ 状態コミットの4ステップで構成する
  - concurrency グループで同時実行を防止する
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.2 (P) Cursor 用ワークフローを作成する
  - 毎日 06:00 UTC の cron スケジュールと手動実行トリガーを設定する
  - 取得→ Slack 通知→ 状態コミットの3ステップで構成する（翻訳不要）
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.3 (P) Antigravity 用ワークフローを作成する
  - 毎日 06:00 UTC の cron スケジュールと手動実行トリガーを設定する
  - Playwright インストール→ 取得→ Claude Code Action 翻訳→ Slack 通知→ 状態コミットの5ステップで構成する
  - _Requirements: 7.1, 7.2, 7.3_
