import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateOpenAINewsSummaries,
  validateAnthropicNewsSummaries,
  validateJulesChangelogSummaries,
} from "../services/news-summary-schema.js";

const SOURCE = process.argv[2];

const validators: Record<
  string,
  {
    file: string;
    validate: (data: unknown) => { success: boolean; data?: unknown; error?: string };
  }
> = {
  "openai-news": {
    file: "data/html-summaries/openai-news.json",
    validate: validateOpenAINewsSummaries,
  },
  "anthropic-news": {
    file: "data/html-summaries/anthropic-news.json",
    validate: validateAnthropicNewsSummaries,
  },
  "jules-changelog": {
    file: "data/html-summaries/jules-changelog.json",
    validate: validateJulesChangelogSummaries,
  },
};

if (!SOURCE || !(SOURCE in validators)) {
  console.error(`Usage: npx tsx src/scripts/validate-news-summary.ts <source>`);
  console.error(`Sources: ${Object.keys(validators).join(", ")}`);
  process.exit(1);
}

const { file, validate } = validators[SOURCE];
const filePath = resolve(file);

try {
  const raw: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
  const result = validate(raw);

  if (result.success) {
    const entries = result.data as unknown[];
    console.log(`Validation passed: ${entries.length} entries for ${SOURCE}`);
    process.exit(0);
  } else {
    console.error(`Validation failed for ${SOURCE}:`);
    console.error(result.error);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed to read or parse ${filePath}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
