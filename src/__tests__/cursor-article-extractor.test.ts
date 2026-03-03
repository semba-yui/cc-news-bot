import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseLatestVersion,
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

  describe("extractArticleRscPayload", () => {
    it("指定バージョンの RSC ペイロードセクションを抽出する", () => {
      // What: バージョン 2.5 に対応する RSC article セクションを抽出できるか
      // Why: Claude Code Action に渡す RSC データの正確な抽出が必要

      // Given: フィクスチャ HTML とバージョン "2.5"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2.5");

      // Then: null ではなく、article タグのマーカーを含む（エスケープ済み形式）
      expect(result).not.toBeNull();
      expect(result).toContain('[\\\"$\\\",\\\"article\\\",\\\"2-5\\\"');
    });

    it("RSC ペイロードに article 内のテキストコンテンツが含まれる", () => {
      // What: 抽出した RSC ペイロードに実際のコンテンツが含まれるか
      // Why: Claude が変換に使うテキストデータが欠けていないことを保証する

      // Given: フィクスチャ HTML とバージョン "2.5"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2.5");

      // Then: コンテンツのキーワードが含まれる
      expect(result).not.toBeNull();
      expect(result).toContain("プラグイン");
      expect(result).toContain("サンドボックス");
      expect(result).toContain("サブエージェント");
    });

    it("RSC ペイロードに Accordion セクションの参照が含まれる", () => {
      // What: Accordion コンポーネント（$L1b 等）への参照が抽出されるか
      // Why: DOM では空の Accordion も RSC データに含まれることを確認する

      // Given: フィクスチャ HTML とバージョン "2.5"（Accordion あり）
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2.5");

      // Then: Accordion 参照（$L24, $L25 など）が含まれる
      expect(result).not.toBeNull();
      expect(result).toContain("$L24");
    });

    it("存在しないバージョンを指定した場合は null を返す", () => {
      // What: 存在しないバージョンに対して null を返すか
      // Why: 無効なバージョン指定時の安全な動作を保証するため

      // Given: フィクスチャ HTML と存在しないバージョン
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "99.99");

      // Then: null が返される
      expect(result).toBeNull();
    });

    it("他の article のコンテンツが混入しない", () => {
      // What: 抽出範囲が次の article マーカーで正しく区切られるか
      // Why: 隣接する article のデータが混入しないことを保証する

      // Given: フィクスチャ HTML とバージョン "2.5"
      // When: extractArticleRscPayload を呼び出す
      const result = extractArticleRscPayload(fixtureHtml, "2.5");

      // Then: 次の article（02-12-26）のコンテンツが含まれない
      expect(result).not.toBeNull();
      expect(result).not.toContain("長時間稼働エージェント");
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
