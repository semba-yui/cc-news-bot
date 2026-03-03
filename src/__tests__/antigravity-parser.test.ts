import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseLatestVersion,
  parseAllVersions,
  parseVersionContent,
} from "../services/antigravity-parser.js";

// What: Antigravity changelog ページの HTML パーシングをテストする
// Why: antigravity.google/changelog から Playwright で取得した HTML からバージョンと3カテゴリ（Improvements・Fixes・Patches）を正確に抽出するため

const fixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/antigravity-changelog.html"),
  "utf-8",
);

describe("antigravity-parser", () => {
  describe("parseLatestVersion", () => {
    it("HTML から最新バージョン文字列（X.Y.Z 形式、v プレフィックスなし）を抽出する", () => {
      // What: 最新バージョン（最初に出現する X.Y.Z）を正しく抽出できるか
      // Why: 差分検出でバージョン比較を行うため、最新バージョンの特定が必須

      // Given: 実際のフィクスチャ HTML（1.19.6 が最新）
      // When: parseLatestVersion を呼び出す
      const result = parseLatestVersion(fixtureHtml);

      // Then: 最新バージョン "1.19.6" が返される
      expect(result).toBe("1.19.6");
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
      expect(result[0]).toBe("1.19.6");
      // 古いバージョンも含まれる
      expect(result).toContain("1.18.3");
      expect(result).toContain("1.16.5");
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
    it("指定バージョンの3カテゴリを正しく抽出する（Improvements のみ）", () => {
      // What: Improvements のみにアイテムがあるバージョン（1.19.6）の3カテゴリを正しく抽出できるか
      // Why: 各カテゴリの分類と空カテゴリの空配列返却を保証するため

      // Given: フィクスチャ HTML と対象バージョン "1.19.6"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "1.19.6");

      // Then: version が正しく、Improvements に1件、Fixes・Patches は空配列
      expect(result).not.toBeNull();
      expect(result!.version).toBe("1.19.6");
      expect(result!.improvementsEn).toHaveLength(1);
      expect(result!.improvementsEn[0]).toContain("Account remediation");
      expect(result!.fixesEn).toEqual([]);
      expect(result!.patchesEn).toEqual([]);
    });

    it("複数カテゴリにアイテムがあるバージョンを正しく抽出する", () => {
      // What: Improvements(6) + Fixes(3) + Patches(0) のバージョン（1.18.3）を正しく抽出できるか
      // Why: 複数カテゴリに跨るアイテムの正確な分類を保証するため

      // Given: フィクスチャ HTML と対象バージョン "1.18.3"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "1.18.3");

      // Then: Improvements に6件、Fixes に3件、Patches は空配列
      expect(result).not.toBeNull();
      expect(result!.version).toBe("1.18.3");
      expect(result!.improvementsEn).toHaveLength(6);
      expect(result!.improvementsEn[0]).toContain("Gemini 3.1 Pro");
      expect(result!.fixesEn).toHaveLength(3);
      expect(result!.fixesEn[0]).toContain("external plugins");
      expect(result!.patchesEn).toEqual([]);
    });

    it("Patches にアイテムがあるバージョンを正しく抽出する", () => {
      // What: Improvements(1) + Fixes(0) + Patches(1) のバージョン（1.16.5）を正しく抽出できるか
      // Why: Patches カテゴリの抽出が正しく動作することを保証するため

      // Given: フィクスチャ HTML と対象バージョン "1.16.5"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "1.16.5");

      // Then: Improvements に1件、Fixes は空配列、Patches に1件
      expect(result).not.toBeNull();
      expect(result!.version).toBe("1.16.5");
      expect(result!.improvementsEn).toHaveLength(1);
      expect(result!.fixesEn).toEqual([]);
      expect(result!.patchesEn).toHaveLength(1);
      expect(result!.patchesEn[0]).toContain("Renamed Secure Mode");
    });

    it("空カテゴリは空配列で返す（null は使用しない）", () => {
      // What: 全カテゴリが空の場合でも空配列（null ではない）で返されるか
      // Why: 設計書の制約「空カテゴリは空配列で返し、null は使用しない」の遵守を保証するため

      // Given: フィクスチャ HTML と Fixes のみにアイテムがあるバージョン "1.19.5"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "1.19.5");

      // Then: 各カテゴリが配列型で返される（null ではない）
      expect(result).not.toBeNull();
      expect(Array.isArray(result!.improvementsEn)).toBe(true);
      expect(Array.isArray(result!.fixesEn)).toBe(true);
      expect(Array.isArray(result!.patchesEn)).toBe(true);
    });

    it("存在しないバージョンを指定した場合は null を返す", () => {
      // What: 存在しないバージョンに対して null を返すか
      // Why: 無効なバージョン指定時の安全な動作を保証するため

      // Given: フィクスチャ HTML と存在しないバージョン
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "99.99.99");

      // Then: null が返される
      expect(result).toBeNull();
    });

    it("抽出テキストの前後の空白がトリムされる", () => {
      // What: <li> 内のテキストから余分な空白が除去されているか
      // Why: Slack 通知で見やすいフォーマットを保証するため

      // Given: フィクスチャ HTML と対象バージョン "1.19.6"
      // When: parseVersionContent を呼び出す
      const result = parseVersionContent(fixtureHtml, "1.19.6");

      // Then: テキストの前後に不要な空白がない
      expect(result).not.toBeNull();
      for (const item of result!.improvementsEn) {
        expect(item).toBe(item.trim());
        expect(item.length).toBeGreaterThan(0);
      }
    });
  });
});
