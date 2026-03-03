import { z } from "zod/v4";

const HeaderBlock = z.object({
  type: z.literal("header"),
  text: z.object({
    type: z.literal("plain_text"),
    text: z.string().max(150),
    emoji: z.literal(true),
  }),
});

const SectionBlock = z.object({
  type: z.literal("section"),
  text: z.object({
    type: z.literal("mrkdwn"),
    text: z.string().max(3000),
  }),
});

const DividerBlock = z.object({
  type: z.literal("divider"),
});

const ImageBlock = z.object({
  type: z.literal("image"),
  image_url: z.url(),
  alt_text: z.string(),
});

const SlackBlockSchema = z.discriminatedUnion("type", [
  HeaderBlock,
  SectionBlock,
  DividerBlock,
  ImageBlock,
]);

const CursorSummarySchema = z.object({
  version: z.string(),
  fallbackText: z.string(),
  blocks: z.array(SlackBlockSchema).min(1),
});

export interface ValidationSuccess {
  success: true;
  data: z.infer<typeof CursorSummarySchema>;
}

export interface ValidationFailure {
  success: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateCursorSummary(data: unknown): ValidationResult {
  const result = CursorSummarySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: z.prettifyError(result.error) };
}
