import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArticleList } from "../services/jules-changelog-parser.js";

// What: Jules Changelog ページの HTML パーシングをテストする
// Why: jules.google/docs/changelog/ から取得した HTML から記事一覧（タイトル・日付・dateSlug・コンテンツ）を正確に抽出するため

const fixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/jules-changelog.html"),
  "utf-8",
);

describe("jules-changelog-parser", () => {
  describe("parseArticleList", () => {
    it("一覧ページ HTML から記事エントリを抽出する", () => {
      // What: 一覧ページから記事の dateSlug・タイトル・日付・コンテンツを正しく抽出できるか
      // Why: 差分検出で dateSlug 一覧を使うため、一覧パースの正確性が必須

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: 複数の記事エントリが返される
      expect(result.length).toBeGreaterThan(0);

      // 最初の記事のフィールドが正しく抽出される
      const firstEntry = result[0];
      expect(firstEntry.dateSlug).toBeTruthy();
      expect(firstEntry.title).toBeTruthy();
      expect(firstEntry.date).toBeTruthy();
      expect(firstEntry.contentEn).toBeTruthy();
    });

    it("dateSlug をサイドバーリンクの URL パスから正しく抽出する", () => {
      // What: サイドバーの /docs/changelog/{dateSlug} パターンから dateSlug を取得できるか
      // Why: dateSlug は差分検出の識別子として使用される（設計書 4.3）

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: dateSlug が正しく抽出される
      const slugs = result.map((e) => e.dateSlug);
      expect(slugs).toContain("2026-02-19");
      expect(slugs).toContain("2026-02-02");
      expect(slugs).toContain("2026-01-30");
    });

    it("タイトルを article > header > h2 から抽出する", () => {
      // What: 各記事のタイトルが h2 要素から正しく抽出されるか
      // Why: 通知時の表示に使用

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: タイトルが正しく抽出される
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry).toBeDefined();
      expect(entry!.title).toContain("Auto-Fixing CI Failures");
    });

    it("日付テキストを ISO 8601 形式に変換する", () => {
      // What: "February 19, 2026" 形式のテキストを ISO 8601 に変換できるか
      // Why: 設計書で ISO 8601 形式が要求されている

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: 日付が ISO 8601 形式で返される
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.date).toBe("2026-02-19");

      const entry2 = result.find((e) => e.dateSlug === "2026-02-02");
      expect(entry2!.date).toBe("2026-02-02");
    });

    it("コンテンツを Markdown 形式で抽出する", () => {
      // What: article 内の p, h3, ul, ol 要素が Markdown に変換されるか
      // Why: 翻訳入力として構造化されたテキストが必要（設計書 4.1）

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: コンテンツが Markdown 形式で含まれる
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.contentEn).toContain("### CI Fixer");
      expect(entry!.contentEn).toContain("Jules now automatically detects and fixes CI failures");
    });

    it("コンテンツにリスト要素が Markdown リスト形式で含まれる", () => {
      // What: ul/ol 要素が Markdown の - リスト形式に変換されるか
      // Why: 構造化されたコンテンツ抽出が必要

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: Markdown リストが含まれる
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.contentEn).toContain("- ");
    });

    it("画像要素はコンテンツに含まれない", () => {
      // What: img 要素がコンテンツから除外されるか
      // Why: 要件 6.4 で画像を通知に含めないと規定されている

      // Given: 実際のフィクスチャ HTML（img 要素を含む記事がある）
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: コンテンツに img タグや画像 URL が含まれない
      for (const entry of result) {
        expect(entry.contentEn).not.toContain("<img");
        expect(entry.contentEn).not.toContain(".webp");
      }
    });

    it("個別ページアクセスは不要（parseArticleContent が存在しない）", async () => {
      // What: Jules パーサーには parseArticleContent が存在しないことを確認
      // Why: 設計書 4.2 で個別ページアクセスは不要と規定されている

      // Given: jules-changelog-parser モジュール
      // When: モジュールの export を確認
      const mod = await import("../services/jules-changelog-parser.js");

      // Then: parseArticleContent は export されていない
      expect(mod).not.toHaveProperty("parseArticleContent");
    });

    it("日付降順でソートされた配列を返す", () => {
      // What: 結果が日付の新しい順にソートされているか
      // Why: 設計書の Postconditions で日付降順ソートが要求されている

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: 日付が降順（新しい順）
      const dates = result.map((e) => e.date);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1] >= dates[i]).toBe(true);
      }
    });

    it("dateSlug が一意である", () => {
      // What: dateSlug の重複がないか
      // Why: 設計書の Invariants で dateSlug の一意性が要求されている

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: dateSlug が一意であること
      const slugs = result.map((e) => e.dateSlug);
      const uniqueSlugs = [...new Set(slugs)];
      expect(slugs.length).toBe(uniqueSlugs.length);
    });

    it("空の HTML では空配列を返す", () => {
      // What: 空の HTML に対する防御的動作
      // Why: 取得結果が空の場合にクラッシュしないことを保証するため

      // Given: 空の HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList("");

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });

    it("contentHtml に HTML 構造が保持される", () => {
      // What: article 内の HTML タグ構造（p, h3, ul, ol）が contentHtml に保持されるか
      // Why: Claude が HTML を直接 Slack Block Kit に変換するため、HTML 構造の保持が必須

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: contentHtml に HTML タグが含まれる
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.contentHtml).toContain("<p>");
      expect(entry!.contentHtml).toContain("<h3");
      expect(entry!.contentHtml).toContain("<ul>");
      expect(entry!.contentHtml).toContain("<ol>");
    });

    it("contentHtml にヘッダー要素が含まれない", () => {
      // What: article 内の header 要素が contentHtml から除外されるか
      // Why: title と date は別フィールドで抽出済みなので重複を避ける

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: contentHtml に header タグが含まれない
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.contentHtml).not.toContain("<header");
    });

    it("contentHtml に video 要素が含まれない", () => {
      // What: video 要素が contentHtml から除外されるか
      // Why: Slack Block Kit では video を扱わないため

      // Given: 実際のフィクスチャ HTML（video 要素を含む記事がある）
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: contentHtml に video タグが含まれない
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.contentHtml).not.toContain("<video");
    });

    it("contentHtml から画像のみの p 要素が除外される", () => {
      // What: img のみを含む p 要素が contentHtml から除外されるか
      // Why: 画像は通知に含めないため

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(fixtureHtml);

      // Then: contentHtml に img タグが含まれない
      const entry = result.find((e) => e.dateSlug === "2026-02-19");
      expect(entry!.contentHtml).not.toContain("<img");
    });

    it("article 要素が存在しない HTML では空配列を返す", () => {
      // What: article 要素がない HTML に対して空配列を返すか
      // Why: DOM 構造が変更された場合のフォールバック動作を保証するため

      // Given: article 要素を含まない HTML
      const html = "<html><body><main><h1>No articles</h1></main></body></html>";

      // When: parseArticleList を呼び出す
      const result = parseArticleList(html);

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });
  });
});
