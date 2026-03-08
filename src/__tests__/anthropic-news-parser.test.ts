import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArticleContent, parseArticleList } from "../services/anthropic-news-parser.js";

// What: Anthropic News ページの HTML パーシングをテストする
// Why: anthropic.com/news から取得した HTML から記事一覧と個別記事コンテンツを正確に抽出するため

const listFixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/anthropic-news-list.html"),
  "utf-8",
);

const articleFixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/anthropic-news-article.html"),
  "utf-8",
);

describe("anthropic-news-parser", () => {
  describe("parseArticleList", () => {
    it("一覧ページ HTML から記事エントリを抽出する", () => {
      // What: 一覧ページから記事の slug・タイトル・日付・カテゴリを正しく抽出できるか
      // Why: 差分検出で slug 一覧を使うため、一覧パースの正確性が必須

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: 複数の記事エントリが返される
      expect(result.length).toBeGreaterThan(0);

      // 最初の記事のフィールドが正しく抽出される
      const firstArticle = result[0];
      expect(firstArticle.slug).toBeTruthy();
      expect(firstArticle.title).toBeTruthy();
      expect(firstArticle.category).toBeTruthy();
      expect(firstArticle.date).toBeTruthy();
    });

    it("slug を /news/{slug} パターンから正しく抽出する", () => {
      // What: href="/news/{slug}" からslugを正しく抽出できるか
      // Why: slug は差分検出の識別子として使用されるため正確性が必須

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: slug が正しく抽出される
      const slugs = result.map((e) => e.slug);
      expect(slugs).toContain("claude-sonnet-4-6");
      expect(slugs).toContain("mozilla-firefox-security");
      expect(slugs).toContain("where-stand-department-war");
    });

    it("日付テキストを ISO 8601 形式に変換する", () => {
      // What: "Mar 6, 2026" 形式のテキストを ISO 8601 に変換できるか
      // Why: 設計書で ISO 8601 形式が要求されている

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: 日付が ISO 8601 形式で返される
      const mozilla = result.find((e) => e.slug === "mozilla-firefox-security");
      expect(mozilla).toBeDefined();
      expect(mozilla!.date).toBe("2026-03-06");

      const sonnet = result.find((e) => e.slug === "claude-sonnet-4-6");
      expect(sonnet).toBeDefined();
      expect(sonnet!.date).toBe("2026-02-17");
    });

    it("カテゴリを正しく抽出する", () => {
      // What: 各記事のカテゴリ（Product, Announcements 等）を抽出できるか
      // Why: 通知時の表示に使用

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: カテゴリが正しく抽出される
      const sonnet = result.find((e) => e.slug === "claude-sonnet-4-6");
      expect(sonnet!.category).toBe("Product");

      const mozilla = result.find((e) => e.slug === "mozilla-firefox-security");
      expect(mozilla!.category).toBe("Policy");
    });

    it("FeaturedGrid と PublicationList の重複記事を href でデデュプする", () => {
      // What: Featured セクションと List セクションに同じ記事がある場合に重複を除去できるか
      // Why: ページ構造上、同一記事が FeaturedGrid と PublicationList の両方に存在する

      // Given: 実際のフィクスチャ HTML（claude-sonnet-4-6 等が重複）
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: slug が一意であること
      const slugs = result.map((e) => e.slug);
      const uniqueSlugs = [...new Set(slugs)];
      expect(slugs.length).toBe(uniqueSlugs.length);
    });

    it("日付降順でソートされた配列を返す", () => {
      // What: 結果が日付の新しい順にソートされているか
      // Why: 設計書の Postconditions で日付降順ソートが要求されている

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: 日付が降順（新しい順）
      const dates = result.map((e) => e.date);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1] >= dates[i]).toBe(true);
      }
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

    it("記事リンクが存在しない HTML では空配列を返す", () => {
      // What: 記事リンクがない HTML に対して空配列を返すか
      // Why: DOM 構造が変更された場合のフォールバック動作を保証するため

      // Given: 記事リンクを含まない HTML
      const html = "<html><body><main><h1>No articles</h1></main></body></html>";

      // When: parseArticleList を呼び出す
      const result = parseArticleList(html);

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });
  });

  describe("parseArticleContent", () => {
    it("個別記事ページ HTML から本文コンテンツを抽出する", () => {
      // What: 記事ページから本文テキストを抽出できるか
      // Why: 翻訳・要約の入力として正確なコンテンツ抽出が必要

      // Given: 実際のフィクスチャ HTML と slug
      // When: parseArticleContent を呼び出す
      const result = parseArticleContent(articleFixtureHtml, "claude-sonnet-4-6");

      // Then: 本文コンテンツが返される
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(100);
    });

    it("本文が英語コンテンツとして返される", () => {
      // What: 英語ページからのコンテンツが正しく返されるか
      // Why: Anthropic News は英語ページのため、翻訳フェーズで日本語に変換される

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleContent を呼び出す
      const result = parseArticleContent(articleFixtureHtml, "claude-sonnet-4-6");

      // Then: 英語コンテンツを含む
      expect(result).toContain("Sonnet 4.6");
      expect(result).toContain("coding");
    });

    it("見出しを Markdown 形式で変換する", () => {
      // What: h2 等の見出しが Markdown の ## 形式に変換されるか
      // Why: 翻訳入力として構造化されたテキストが必要

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleContent を呼び出す
      const result = parseArticleContent(articleFixtureHtml, "claude-sonnet-4-6");

      // Then: Markdown 見出しが含まれる
      expect(result).toContain("## ");
    });

    it("複数の段落を改行区切りで返す", () => {
      // What: 複数の p 要素が改行区切りで連結されるか
      // Why: 翻訳入力として段落構造が保持される必要がある

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleContent を呼び出す
      const result = parseArticleContent(articleFixtureHtml, "claude-sonnet-4-6");

      // Then: 複数段落が改行区切りで含まれる
      expect(result).not.toBeNull();
      const paragraphs = result!.split("\n\n");
      expect(paragraphs.length).toBeGreaterThan(3);
    });

    it("article 要素が存在しない HTML では null を返す", () => {
      // What: article 要素がない場合に null を返すか
      // Why: DOM 構造変更時の安全な動作を保証するため

      // Given: article 要素を含まない HTML
      const html = "<html><body><div>No article</div></body></html>";

      // When: parseArticleContent を呼び出す
      const result = parseArticleContent(html, "test-slug");

      // Then: null が返される
      expect(result).toBeNull();
    });

    it("空の HTML では null を返す", () => {
      // What: 空の HTML に対する防御的動作
      // Why: 取得結果が空の場合にクラッシュしないことを保証するため

      // Given: 空の HTML
      // When: parseArticleContent を呼び出す
      const result = parseArticleContent("", "test-slug");

      // Then: null が返される
      expect(result).toBeNull();
    });
  });
});
