import { z } from "zod/v4";

const SUMMARY_MAX_LENGTH = 400;

const OpenAINewsSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.string(),
  summaryJa: z.string().max(SUMMARY_MAX_LENGTH),
  fullTextJa: z.string(),
});

const OpenAINewsSummariesSchema = z.array(OpenAINewsSummarySchema).min(1);

const AnthropicNewsSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.string(),
  summaryJa: z.string().max(SUMMARY_MAX_LENGTH),
  fullTextJa: z.string(),
});

const AnthropicNewsSummariesSchema = z.array(AnthropicNewsSummarySchema).min(1);

const JulesHeaderBlock = z.object({
  type: z.literal("header"),
  text: z.object({
    type: z.literal("plain_text"),
    text: z.string().max(150),
    emoji: z.literal(true),
  }),
});

const JulesSectionBlock = z.object({
  type: z.literal("section"),
  text: z.object({
    type: z.literal("mrkdwn"),
    text: z.string().max(3000),
  }),
});

const JulesDividerBlock = z.object({
  type: z.literal("divider"),
});

const JulesImageBlock = z.object({
  type: z.literal("image"),
  image_url: z.url(),
  alt_text: z.string(),
});

const JulesSlackBlockSchema = z.discriminatedUnion("type", [
  JulesHeaderBlock,
  JulesSectionBlock,
  JulesDividerBlock,
  JulesImageBlock,
]);

const JulesChangelogSummarySchema = z.object({
  dateSlug: z.string(),
  title: z.string(),
  date: z.string(),
  fallbackText: z.string(),
  blocks: z.array(JulesSlackBlockSchema).min(1),
});

const JulesChangelogSummariesSchema = z.array(JulesChangelogSummarySchema).min(1);

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: z.prettifyError(result.error) };
}

export function validateOpenAINewsSummaries(
  data: unknown,
): ValidationResult<z.infer<typeof OpenAINewsSummariesSchema>> {
  return validate(OpenAINewsSummariesSchema, data);
}

export function validateAnthropicNewsSummaries(
  data: unknown,
): ValidationResult<z.infer<typeof AnthropicNewsSummariesSchema>> {
  return validate(AnthropicNewsSummariesSchema, data);
}

export function validateJulesChangelogSummaries(
  data: unknown,
): ValidationResult<z.infer<typeof JulesChangelogSummariesSchema>> {
  return validate(JulesChangelogSummariesSchema, data);
}
