import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseLatestVersion,
  parseAllVersions,
  parseVersionContent,
} from "../services/gemini-cli-parser.js";

// What: Gemini CLI changelog ページの HTML パーシングをテストする
// Why: geminicli.com/docs/changelogs/ から取得した HTML からバージョンとコンテンツを正確に抽出するため

const fixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/gemini-cli-changelog.html"),
  "utf-8",
);

describe("gemini-cli-parser", () => {
  describe("parseLatestVersion", () => {
    it("HTML から最新バージョン文字列を抽出する", () => {
      // What: 最新バージョン（最初に出現する vN.N.N）を正しく抽出できるか
      // Why: 差分検出でバージョン比較を行うため、最新バージョンの特定が必須

      // Given: 実際のフィクスチャ HTML（v0.31.0 が最新）
      // When: parseLatestVersion を呼び出す
      const result = parseLatestVersion(fixtureHtml);

      // Then: 最新バージョン "v0.31.0" が返される
      expect(result).toBe("v0.31.0");
    });

    it("バージョンが見つからない HTML の場合は null を返す", () => {
      // What: バージョン情報がない HTML に対して null を返すか
      // Why: DOM 構造が変更された場合のフォールバック動作を保証するため

      // Given: バージョン情報を含まない HTML
      const html = "<html><body><h1>No changelog</h1></body></html>";

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

  describe("parseAllVersions", () => {
    // What: HTML から全バージョンを降順（最新が先頭）で列挙する
    // Why: cron 間に複数リリースがあった場合に中間バージョンを見逃さないため

    it("HTML から全バージョンを降順（最新が先頭）で返す", () => {
      // Given: 複数バージョンを含むフィクスチャ HTML
      // When: parseAllVersions を呼び出す
      const result = parseAllVersions(fixtureHtml);

      // Then: 配列が返され、先頭が最新バージョン、複数件含まれる
      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toBe("v0.31.0");
      // 古いバージョンも含まれる
      expect(result).toContain("v0.12.0");
    });

    it("バージョンが見つからない HTML では空配列を返す", () => {
      // Given: バージョン情報を含まない HTML
      const html = "<html><body><h1>No changelog</h1></body></html>";

      // When: parseAllVersions を呼び出す
      const result = parseAllVersions(html);

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });

    it("空の HTML では空配列を返す", () => {
      // Given: 空の HTML
      // When: parseAllVersions を呼び出す
      const result = parseAllVersions("");

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });
  });

  describe("parseVersionContent", () => {
    it("指定バージョンの要約コンテンツを抽出する", () => {
      // What: v0.31.0 の要約テキストと画像 URL を正しく抽出できるか
      // Why: 翻訳入力として正確なコンテンツ抽出が必要

      // Given: フィクスチャ HTML と対象バージョン "v0.31.0"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "v0.31.0");

      // Then: version, rawSummaryEn, imageUrls が正しく返される
      expect(result).not.toBeNull();
      expect(result!.version).toBe("v0.31.0");
      expect(result!.rawSummaryEn).toContain("Gemini 3.1 Pro Preview");
      expect(result!.rawSummaryEn).toContain("Experimental Browser Agent");
      expect(result!.rawSummaryEn).toContain("Policy Engine Updates");
      expect(result!.rawSummaryEn).toContain("Web Fetch Improvements");
    });

    it("画像 URL を含むバージョンのコンテンツから画像 URL を抽出する", () => {
      // What: img タグから画像 URL を正しく抽出できるか
      // Why: Slack 通知に画像を含めるため

      // Given: フィクスチャ HTML と画像を含むバージョン "v0.12.0"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "v0.12.0");

      // Then: 画像 URL が抽出される
      expect(result).not.toBeNull();
      expect(result!.imageUrls.length).toBeGreaterThan(0);
      expect(result!.imageUrls).toContain("https://i.imgur.com/4J1njsx.png");
    });

    it("画像を含まないバージョンでは imageUrls が空配列になる", () => {
      // What: 画像がないバージョンで空配列が返されるか
      // Why: imageUrls は常に配列型であることを保証するため

      // Given: フィクスチャ HTML と画像を含まないバージョン "v0.31.0"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "v0.31.0");

      // Then: imageUrls は空配列
      expect(result).not.toBeNull();
      expect(result!.imageUrls).toEqual([]);
    });

    it("存在しないバージョンを指定した場合は null を返す", () => {
      // What: 存在しないバージョンに対して null を返すか
      // Why: 無効なバージョン指定時の安全な動作を保証するため

      // Given: フィクスチャ HTML と存在しないバージョン
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "v99.99.99");

      // Then: null が返される
      expect(result).toBeNull();
    });

    it("要約テキストが Markdown 形式で返される", () => {
      // What: 抽出テキストが Markdown 形式（太字・リンク等）を保持しているか
      // Why: 翻訳・Slack 通知で Markdown 記法を使うため

      // Given: フィクスチャ HTML と v0.31.0
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "v0.31.0");

      // Then: Markdown の太字が含まれる
      expect(result).not.toBeNull();
      expect(result!.rawSummaryEn).toContain("**");
    });
  });
});
