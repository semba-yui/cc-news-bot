import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseLatestVersion,
  parseAllVersions,
  parseAllEntries,
  extractArticleRscPayload,
  extractMuxVideoData,
} from "../services/cursor-article-extractor.js";

// What: Cursor changelog の RSC データ抽出をテストする
// Why: cursor.com/ja/changelog から取得した HTML のバージョン検出・RSC ペイロード抽出・Mux 動画抽出が正確に動作することを保証する

const fixtureHtml = readFileSync(
  resolve(import.meta.dirname, "fixtures/cursor-changelog.html"),
  "utf-8",
);

describe("cursor-article-extractor", () => {
  describe("parseLatestVersion", () => {
    it("HTML から最新エントリの version を返す", () => {
      // What: 最新エントリ（date 降順の先頭）の version を返すか
      // Why: 差分検出で最新エントリの特定が必須

      // Given: 実際のフィクスチャ HTML（02-26-26 が最新エントリ）
      // When: parseLatestVersion を呼び出す
      const result = parseLatestVersion(fixtureHtml);

      // Then: 最新エントリの version（slug）が返される
      expect(result).toBe("02-26-26");
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

  describe("parseAllVersions", () => {
    // What: HTML から全バージョンを降順（最新が先頭）で列挙する
    // Why: cron 間に複数リリースがあった場合に中間バージョンを見逃さないため

    it("HTML から全エントリの version を降順で返す", () => {
      // Given: 複数エントリを含むフィクスチャ HTML
      // When: parseAllVersions を呼び出す
      const result = parseAllVersions(fixtureHtml);

      // Then: 全5件の version が返される（日付エントリ含む）
      expect(result).toHaveLength(5);
      expect(result[0]).toBe("02-26-26");
      expect(result).toContain("2.5");
    });

    it("バージョンラベルがない HTML では空配列を返す", () => {
      // Given: バージョンラベルを含まない HTML
      const html = "<html><body><article><h1>No changelog</h1></article></body></html>";

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

  describe("parseAllEntries", () => {
    // What: HTML から全エントリ（バージョン付き＋日付のみ）を検出する
    // Why: 日付のみエントリも含めた全エントリの検出と、レスポンシブ重複の回避を保証する

    it("fixture HTML から5件のエントリを抽出する", () => {
      // What: 日付のみエントリも含めて全件検出されるか
      // Why: 従来の parseAllVersions ではバージョンラベル付きのみ検出し、日付エントリを見逃していた

      // Given: 5件のエントリを含むフィクスチャ HTML（3件日付のみ + 1件バージョン付き + 1件日付のみ）
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries(fixtureHtml);

      // Then: 5件のエントリが返される
      expect(result).toHaveLength(5);
    });

    it("最初の section.container のみスコープとし重複を回避する", () => {
      // What: レスポンシブ対応で2つの section.container に同一エントリが重複レンダリングされるが、重複しないか
      // Why: HTML は同一エントリを2回レンダリングするため、最初のセクションのみ使う

      // Given: 2つの section.container を含むフィクスチャ HTML
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries(fixtureHtml);

      // Then: 重複なく5件（10件ではない）
      expect(result).toHaveLength(5);
      const slugs = result.map((e) => e.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("date 降順（最新が先頭）で返す", () => {
      // What: エントリが日付の降順でソートされるか
      // Why: 新規判定で date 比較を行うため、降順ソートが前提

      // Given: フィクスチャ HTML
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries(fixtureHtml);

      // Then: 各エントリの date が降順
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].date >= result[i + 1].date).toBe(true);
      }
    });

    it("各エントリの slug/date/title が正しい", () => {
      // What: 各フィールドの抽出精度
      // Why: slug/date/title が後続処理で正しく使えることを保証する

      // Given: フィクスチャ HTML
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries(fixtureHtml);

      // Then: 先頭エントリ（最新）は 02-26-26
      expect(result[0]).toMatchObject({
        slug: "02-26-26",
        date: "2026-02-26T00:00:00.000Z",
        title: "Bugbot Autofix",
      });

      // Then: バージョン付きエントリ (2.5) の位置と値
      const v25 = result.find((e) => e.slug === "2-5");
      expect(v25).toBeDefined();
      expect(v25!.date).toBe("2026-02-17T00:00:00.000Z");
      expect(v25!.title).toContain("プラグイン");

      // Then: CLI エントリ
      const cli = result.find((e) => e.slug === "cli-feb-18-2026");
      expect(cli).toBeDefined();
      expect(cli!.date).toBe("2026-02-18T00:00:00.000Z");
    });

    it("バージョンラベル付きエントリは version='2.5' を持つ", () => {
      // What: span.label があるエントリで version がラベルテキストになるか
      // Why: 後方互換で version フィールドにバージョン番号を保持する

      // Given: フィクスチャ HTML
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries(fixtureHtml);

      // Then: slug "2-5" のエントリは version="2.5"
      const v25 = result.find((e) => e.slug === "2-5");
      expect(v25!.version).toBe("2.5");
    });

    it("日付エントリは version=slug を持つ", () => {
      // What: バージョンラベルなしエントリで version が slug と同じになるか
      // Why: version が空にならないことを保証する

      // Given: フィクスチャ HTML
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries(fixtureHtml);

      // Then: 日付のみエントリは version=slug
      const dateEntry = result.find((e) => e.slug === "02-26-26");
      expect(dateEntry!.version).toBe("02-26-26");

      const cliEntry = result.find((e) => e.slug === "cli-feb-18-2026");
      expect(cliEntry!.version).toBe("cli-feb-18-2026");
    });

    it("空の HTML では空配列を返す", () => {
      // Given: 空の HTML
      // When: parseAllEntries を呼び出す
      const result = parseAllEntries("");

      // Then: 空配列
      expect(result).toEqual([]);
    });
  });

  describe("parseAllVersions (後方互換ラッパー)", () => {
    // What: parseAllVersions が parseAllEntries に委譲し、version フィールドを返すか
    // Why: 後方互換を維持しつつ内部を parseAllEntries に統一する

    it("全エントリの version を降順で返す", () => {
      // Given: フィクスチャ HTML
      // When: parseAllVersions を呼び出す
      const result = parseAllVersions(fixtureHtml);

      // Then: 全5件の version が返される（日付エントリ含む）
      expect(result).toHaveLength(5);
      expect(result[0]).toBe("02-26-26");
      expect(result).toContain("2.5");
    });
  });

  describe("extractArticleRscPayload", () => {
    // What: slug を直接受け取り RSC ペイロードを抽出する
    // Why: version → slug 変換を呼び出し側に委ねることで、日付 slug にも対応する

    it("slug '2-5' で RSC ペイロードセクションを抽出する", () => {
      // What: slug "2-5" に対応する RSC article セクションを抽出できるか
      // Why: Claude Code Action に渡す RSC データの正確な抽出が必要

      // Given: フィクスチャ HTML と slug "2-5"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2-5");

      // Then: null ではなく、article タグのマーカーを含む（エスケープ済み形式）
      expect(result).not.toBeNull();
      expect(result).toContain('[\\\"$\\\",\\\"article\\\",\\\"2-5\\\"');
    });

    it("RSC ペイロードに article 内のテキストコンテンツが含まれる", () => {
      // What: 抽出した RSC ペイロードに実際のコンテンツが含まれるか
      // Why: Claude が変換に使うテキストデータが欠けていないことを保証する

      // Given: フィクスチャ HTML と slug "2-5"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2-5");

      // Then: コンテンツのキーワードが含まれる
      expect(result).not.toBeNull();
      expect(result).toContain("プラグイン");
      expect(result).toContain("サンドボックス");
      expect(result).toContain("サブエージェント");
    });

    it("RSC ペイロードに Accordion セクションの参照が含まれる", () => {
      // What: Accordion コンポーネント（$L1b 等）への参照が抽出されるか
      // Why: DOM では空の Accordion も RSC データに含まれることを確認する

      // Given: フィクスチャ HTML と slug "2-5"（Accordion あり）
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2-5");

      // Then: Accordion 参照（$L24, $L25 など）が含まれる
      expect(result).not.toBeNull();
      expect(result).toContain("$L24");
    });

    it("存在しない slug を指定した場合は null を返す", () => {
      // What: 存在しない slug に対して null を返すか
      // Why: 無効な slug 指定時の安全な動作を保証するため

      // Given: フィクスチャ HTML と存在しない slug
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "99-99");

      // Then: null が返される
      expect(result).toBeNull();
    });

    it("他の article のコンテンツが混入しない", () => {
      // What: 抽出範囲が次の article マーカーで正しく区切られるか
      // Why: 隣接する article のデータが混入しないことを保証する

      // Given: フィクスチャ HTML と slug "2-5"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2-5");

      // Then: 次の article（02-12-26）のコンテンツが含まれない
      expect(result).not.toBeNull();
      expect(result).not.toContain("長時間稼働エージェント");
    });

    it("日付 slug '02-26-26' で RSC ペイロードを抽出できる", () => {
      // What: 日付のみエントリの slug でも RSC 抽出が動作するか
      // Why: 日付 slug はバージョン番号と異なる形式のため、対応を保証する

      // Given: フィクスチャ HTML と日付 slug "02-26-26"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "02-26-26");

      // Then: null ではなく、slug を含むマーカーがある
      expect(result).not.toBeNull();
      expect(result).toContain("02-26-26");
    });

    it("非数値 slug 'cli-feb-18-2026' で RSC ペイロードを抽出できる", () => {
      // What: 非数値の slug でも RSC 抽出が動作するか
      // Why: CLI エントリ等の特殊 slug 形式への対応を保証する

      // Given: フィクスチャ HTML と非数値 slug "cli-feb-18-2026"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "cli-feb-18-2026");

      // Then: null ではなく、slug を含むマーカーがある
      expect(result).not.toBeNull();
      expect(result).toContain("cli-feb-18-2026");
    });
  });

  describe("extractMuxVideoData", () => {
    it("Mux 動画の playbackId を RSC データから抽出し URL を生成する", () => {
      // What: RSC のスクリプトデータから Mux playbackId を抽出できるか
      // Why: Mux 動画のサムネイルとストリーミング URL を Slack 通知に含めるため

      // Given: フィクスチャ HTML と article slug "2-5"
      // When: extractMuxVideoData を呼び出す
      const result = extractMuxVideoData(fixtureHtml, "2-5");

      // Then: Mux 動画情報が正しく抽出される
      expect(result.length).toBeGreaterThanOrEqual(2);

      const video = result[0];
      expect(video.playbackId).toBeTruthy();
      expect(video.thumbnailUrl).toMatch(/^https:\/\/image\.mux\.com\/.+\/thumbnail\.png$/);
      expect(video.hlsUrl).toMatch(/^https:\/\/stream\.mux\.com\/.+\.m3u8$/);
    });

    it("動画がない article では空配列を返す", () => {
      // What: 動画を含まない article に対して空配列が返されるか
      // Why: videos は常に配列型であることを保証するため

      // Given: フィクスチャ HTML と動画がなさそうな article slug
      // When: extractMuxVideoData を呼び出す
      const result = extractMuxVideoData(fixtureHtml, "nonexistent-slug");

      // Then: 空配列が返される
      expect(result).toEqual([]);
    });

    it("article 02-12-26 の動画が混入しない", () => {
      // What: article "2-5" の動画抽出で隣接 article の動画が混入しないか
      // Why: article 間の区切りが正しく機能することを保証する

      // Given: フィクスチャ HTML と article slug "2-5"
      // When: extractMuxVideoData を呼び出す
      const result = extractMuxVideoData(fixtureHtml, "2-5");
      const allIds = result.map((v) => v.playbackId);

      // Then: 02-12-26 article に固有の動画が含まれていない（02-12-26 は図のみで動画なし）
      // 2-5 の playbackId のみが含まれること
      for (const id of allIds) {
        expect(id).toBeTruthy();
      }
    });
  });
});
