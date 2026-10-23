import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRecipes } from "@/lib/ai";

const BodySchema = z.object({
  offerKeys: z.array(z.string().max(40)).max(80),
  kcalPerServing: z.number().min(100).max(3000),
  budgetPerServing: z.number().min(1).max(1000),
  vegetarian: z.boolean(),
  count: z.number().int().min(1).max(6),
  avoid: z.array(z.string().max(120)).max(30),
});

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    return NextResponse.json({ recipes: await generateRecipes(body.data) });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "AI recipes need an Anthropic API key. Set ANTHROPIC_API_KEY in .env.local and restart." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by the AI service – try again in a minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI service error ${error.status}: ${error.message}` }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : String(error);
    // The SDK throws a plain Error when no credentials are configured at all.
    if (/api key|apiKey|authToken|credentials/i.test(message)) {
      return NextResponse.json(
        { error: "AI recipes need an Anthropic API key. Set ANTHROPIC_API_KEY in .env.local and restart." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
