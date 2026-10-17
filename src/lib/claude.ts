import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
// Bei einer Ablehnung durch Sicherheitsfilter springt automatisch ein Ersatzmodell ein.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function claude() {
  return (client ??= new Anthropic());
}

/** Eine Anfrage mit strukturierter, per Schema geprüfter Antwort. */
export async function askStructured<T extends z.ZodType>(options: {
  schema: T;
  system: string;
  user: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const response = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: options.maxTokens ?? 8000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: options.effort ?? "medium", format: betaZodOutputFormat(options.schema) },
    system: options.system,
    messages: [{ role: "user", content: options.user }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Claude-Antwort unbrauchbar (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output as z.infer<T>;
}
