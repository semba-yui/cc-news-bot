import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArticleContent, parseArticleList } from "../services/openai-news-parser.js";

// What: OpenAI News ページの HTML パーシングをテストする
// Why: openai.com/ja-JP/news/company-announcements/ から取得した HTML から記事一覧と個別記事コンテンツを正確に抽出するため

const listFixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/openai-news-list.html"),
  "utf-8",
);

const articleFixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/openai-news-article.html"),
  "utf-8",
);

describe("openai-news-parser", () => {
  describe("parseArticleList", () => {
    it("一覧ページ HTML から記事エントリを抽出する", () => {
      // What: 一覧ページから記事のslug・タイトル・日付・カテゴリを正しく抽出できるか
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
    });

    it("slug を href パターンから正しく抽出する", () => {
      // What: /ja-JP/index/{slug}/ と /index/{slug}/ の両パターンからslugを抽出できるか
      // Why: 一部記事は /ja-JP/ プレフィクスなしの href を持つため両方に対応が必要

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: slug が正しく抽出される（先頭・末尾のスラッシュを含まない）
      const slugs = result.map((e) => e.slug);
      expect(slugs).toContain("introducing-gpt-5-4");
      expect(slugs).toContain("codex-security-now-in-research-preview");
    });

    it("time[datetime] 属性から日付を ISO 8601 形式で取得する", () => {
      // What: time 要素の datetime 属性から日付を正しく取得できるか
      // Why: 差分検出の日付ソートに必要

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: datetime が存在する記事は ISO 8601 形式の日付を持つ
      const gpt54 = result.find((e) => e.slug === "introducing-gpt-5-4");
      expect(gpt54).toBeDefined();
      expect(gpt54!.date).toBe("2026-03-05T10:00");
    });

    it("datetime が存在しない記事は空文字の日付を返す", () => {
      // What: time[datetime] がない記事（「読了時間」のみの場合）に空文字を返すか
      // Why: 一部記事は日付の代わりに読了時間が表示されるため、欠損を安全に処理する必要がある

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: datetime なしの記事は空文字
      const scalingAi = result.find((e) => e.slug === "scaling-ai-for-everyone");
      expect(scalingAi).toBeDefined();
      expect(scalingAi!.date).toBe("");
    });

    it("カテゴリを正しく抽出する", () => {
      // What: 各記事のカテゴリ（製品・企業など）を抽出できるか
      // Why: 通知時のフィルタリングや表示に使用

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleList を呼び出す
      const result = parseArticleList(listFixtureHtml);

      // Then: カテゴリが正しく抽出される
      const gpt54 = result.find((e) => e.slug === "introducing-gpt-5-4");
      expect(gpt54!.category).toBe("製品");

      const war = result.find((e) => e.slug === "our-agreement-with-the-department-of-war");
      expect(war!.category).toBe("企業");
    });

    it("モバイル/デスクトップ DOM 重複を href でデデュプする", () => {
      // What: 同一 href のリンクが複数存在する場合に重複を除去できるか
      // Why: レスポンシブ対応で同一記事が複数の DOM 要素として存在するため

      // Given: 実際のフィクスチャ HTML（重複を含む可能性あり）
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
      const datesWithValues = result.filter((e) => e.date !== "").map((e) => e.date);
      for (let i = 1; i < datesWithValues.length; i++) {
        expect(datesWithValues[i - 1] >= datesWithValues[i]).toBe(true);
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
      const result = parseArticleContent(articleFixtureHtml, "introducing-gpt-5-4");

      // Then: 本文コンテンツが返される
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(100);
      expect(result).toContain("GPT");
    });

    it("本文が日本語で返される（ja-JP ページのため）", () => {
      // What: 日本語ページからのコンテンツが日本語で返されるか
      // Why: OpenAI News は ja-JP ページを使用するため翻訳不要

      // Given: 実際のフィクスチャ HTML
      // When: parseArticleContent を呼び出す
      const result = parseArticleContent(articleFixtureHtml, "introducing-gpt-5-4");

      // Then: 日本語コンテンツを含む
      expect(result).toContain("リリース");
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
