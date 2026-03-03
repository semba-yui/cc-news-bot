import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLatestVersion, parseVersionContent } from "../services/cursor-parser.js";

// What: Cursor changelog ページの HTML パーシングをテストする
// Why: cursor.com/ja/changelog から取得した HTML からバージョン・コンテンツ・メディアを正確に抽出するため

const fixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/cursor-changelog.html"),
  "utf-8",
);

describe("cursor-parser", () => {
  describe("parseLatestVersion", () => {
    it("HTML から最新バージョン文字列（major.minor 形式）を抽出する", () => {
      // What: 最新バージョン（<span class="label"> 内の最初の major.minor）を正しく抽出できるか
      // Why: 差分検出でバージョン比較を行うため、最新バージョンの特定が必須

      // Given: 実際のフィクスチャ HTML（2.5 が最新バージョン付きエントリ）
      // When: parseLatestVersion を呼び出す
      const result = parseLatestVersion(fixtureHtml);

      // Then: 最新バージョン "2.5" が返される
      expect(result).toBe("2.5");
    });

    it("バージョンラベルがない HTML の場合は null を返す", () => {
      // What: バージョンラベルを持つ article がない HTML に対して null を返すか
      // Why: DOM 構造が変更された場合のフォールバック動作を保証するため

      // Given: バージョンラベルを含まない HTML
      const html = "<html><body><article><h1>No changelog</h1></article></body></html>";

      // When: parseLatestVersion を呼び出す
      const result = parseLatestVersion(html);

      // Then: null が返される
      expect(result).toBeNull();
    });

    it("空の HTML の場合は null を返す", () => {
      // What: 空の HTML に対する防御的動作
      // Why: 取得結果が空の場合にクラッシュしないことを保証するため

      // Given: 空の HTML
      // When: parseLatestVersion を呼び出す
      const result = parseLatestVersion("");

      // Then: null が返される
      expect(result).toBeNull();
    });
  });

  describe("parseVersionContent", () => {
    it("指定バージョンの日本語コンテンツを抽出する", () => {
      // What: バージョン 2.5 のコンテンツ（contentJa）を正しく抽出できるか
      // Why: Slack 通知で表示する日本語コンテンツの正確な抽出が必要

      // Given: フィクスチャ HTML と対象バージョン "2.5"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "2.5");

      // Then: version, contentJa が正しく返される
      expect(result).not.toBeNull();
      expect(result!.version).toBe("2.5");
      expect(result!.contentJa).toContain("プラグイン");
      expect(result!.contentJa).toContain("サンドボックス");
      expect(result!.contentJa).toContain("サブエージェント");
    });

    it("コンテンツが Markdown 形式で返される", () => {
      // What: 抽出テキストが Markdown 形式（見出し・リンク・コード等）を保持しているか
      // Why: Slack 通知で Markdown 記法を使うため

      // Given: フィクスチャ HTML と 2.5
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "2.5");

      // Then: Markdown の h3 見出しが含まれる
      expect(result).not.toBeNull();
      expect(result!.contentJa).toContain("### ");
    });

    it("画像 URL を Next.js プロキシ URL からデコードして抽出する", () => {
      // What: <img> タグの srcset/src から元の画像 URL を正しくデコードして抽出できるか
      // Why: Slack 通知に画像を含めるため、元の公開 URL が必要

      // Given: フィクスチャ HTML と画像を含むバージョン "2.5"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "2.5");

      // Then: デコード済みの元画像 URL が抽出される
      expect(result).not.toBeNull();
      expect(result!.imageUrls.length).toBeGreaterThan(0);
      expect(result!.imageUrls).toContain(
        "https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/changelog/sandbox-network-02-11-26-1-.png",
      );
    });

    it("Mux 動画の playbackId をRSC データから抽出し URL を生成する", () => {
      // What: RSC（React Server Components）のスクリプトデータから Mux playbackId を抽出できるか
      // Why: Mux 動画のサムネイルとストリーミング URL を Slack 通知に含めるため

      // Given: フィクスチャ HTML と Mux 動画を含むバージョン "2.5"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "2.5");

      // Then: Mux 動画情報が正しく抽出される
      expect(result).not.toBeNull();
      expect(result!.videos.length).toBeGreaterThanOrEqual(2);

      const video = result!.videos[0];
      expect(video.playbackId).toBeTruthy();
      expect(video.thumbnailUrl).toMatch(/^https:\/\/image\.mux\.com\/.+\/thumbnail\.png$/);
      expect(video.hlsUrl).toMatch(/^https:\/\/stream\.mux\.com\/.+\.m3u8$/);
    });

    it("画像を含まないバージョンでは imageUrls が空配列になる", () => {
      // What: 画像がないバージョンで空配列が返されるか
      // Why: imageUrls は常に配列型であることを保証するため

      // Given: フィクスチャ HTML と画像を含まない "Bugbot Autofix" 相当のテスト用 HTML
      const htmlWithoutImages = `
        <html><body>
        <article>
          <div class="grid-cursor">
            <div><p><a href="/changelog/test"><span class="label">9.9</span><time datetime="2026-01-01T00:00:00.000Z">2026年1月1日</time></a></p></div>
            <div class="col-span-full md:col-start-1 md:col-end-19 lg:col-start-1 lg:col-end-17 xl:col-start-7 xl:col-end-19">
              <header class="mb-v2 relative"><h1 class="type-lg text-balance" id="test"><a href="/changelog/test">Test</a></h1></header>
              <div class="prose prose--block"><p>テストコンテンツ</p></div>
            </div>
          </div>
        </article>
        </body></html>
      `;

      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(htmlWithoutImages, "9.9");

      // Then: imageUrls は空配列、videos も空配列
      expect(result).not.toBeNull();
      expect(result!.imageUrls).toEqual([]);
      expect(result!.videos).toEqual([]);
    });

    it("存在しないバージョンを指定した場合は null を返す", () => {
      // What: 存在しないバージョンに対して null を返すか
      // Why: 無効なバージョン指定時の安全な動作を保証するため

      // Given: フィクスチャ HTML と存在しないバージョン
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "99.99");

      // Then: null が返される
      expect(result).toBeNull();
    });
  });
});
