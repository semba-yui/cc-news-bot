import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateCursorSummaries } from "../services/cursor-summary-schema.js";

const filePath = resolve("data/html-summaries/cursor.json");

try {
  const raw: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
  const result = validateCursorSummaries(raw);

  if (result.success) {
    const versions = result.data.map((e) => e.version).join(", ");
    console.log(
      `Validation passed: ${result.data.length} entries, versions=[${versions}]`,
    );
    process.exit(0);
  } else {
    console.error("Validation failed:");
    console.error(result.error);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed to read or parse ${filePath}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
