/**
 * Supabase Edge Function: guide-preset
 * Fase 2.5 — Natural Language Direction Layer
 *
 * Receives a user prompt + current physics values.
 * Uses Claude to modify ONLY the 6 physics parameters.
 * Never invents keyframes or new animations.
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.36.3";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const SYSTEM_PROMPT = `You are the physics modifier engine for Kinetia, an AI animation system.

Your ONLY task: interpret a user's natural language animation intent and return a JSON object with modified physics values.

STRICT RULES:
1. You MUST NOT create new keyframes, animation properties, or tracks.
2. You MUST NOT hallucinate animations from scratch.
3. You ONLY return a JSON object modifying these 6 parameters:
   - tension (0–1): spring stiffness. Higher = snappier.
   - friction (0–1): damping. Higher = less bounce, smoother stop.
   - mass (0.1–10): inertia. Higher = heavier, slower to start/stop.
   - bounciness (0–1): elastic rebound amplitude.
   - velocityDecay (0–1): how quickly velocity decays.
   - randomness (0–1): timing jitter.
4. Only include parameters you are EXPLICITLY modifying.
5. Stay within valid ranges. Clamp if needed.

SEMANTIC MAPPING:
- "soft / smooth / elegant / silky" → lower tension (0.2–0.4), raise friction (0.6–0.8), lower bounciness
- "bouncy / elastic / playful / springy" → raise bounciness (0.4–0.8), lower friction (0.2–0.4)
- "snappy / sharp / crisp / quick" → raise tension (0.7–0.9), raise velocityDecay (0.7–0.9)
- "heavy / sluggish / dramatic / slow" → raise mass (3–7), lower tension (0.2–0.4)
- "light / airy / floaty" → lower mass (0.1–0.5), lower tension (0.2–0.4)
- "organic / natural / random" → raise randomness (0.3–0.6)
- "mechanical / robotic / precise" → lower randomness (0), raise tension, raise velocityDecay
- "float at the end / linger" → raise mass (1.5–3), lower velocityDecay (0.3–0.5)

Respond ONLY with a valid JSON object. No explanation. No code block. No markdown.
Example: {"friction": 0.75, "bounciness": 0.1, "mass": 0.4}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { prompt, currentPhysics, projectId, layerId } = await req.json() as {
      prompt: string;
      currentPhysics: Record<string, number>;
      projectId: string;
      layerId?: string;
    };

    if (!prompt?.trim()) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call Claude Haiku (fast + cheap for physics modification)
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current physics:
${JSON.stringify(currentPhysics, null, 2)}

User instruction: "${prompt.trim()}"

Return only the modified physics parameters as a JSON object.`,
        },
      ],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    let overrides: Record<string, number>;
    try {
      const jsonMatch = rawText.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      overrides = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Clamp to valid ranges
    const RANGES: Record<string, [number, number]> = {
      tension:       [0, 1],
      friction:      [0, 1],
      mass:          [0.1, 10],
      bounciness:    [0, 1],
      velocityDecay: [0, 1],
      randomness:    [0, 1],
    };

    const clamped: Record<string, number> = {};
    for (const [key, [min, max]] of Object.entries(RANGES)) {
      if (typeof overrides[key] === "number") {
        clamped[key] = Math.min(max, Math.max(min, overrides[key]!));
      }
    }

    // Apply overrides to project layer mappings in DB
    if (Object.keys(clamped).length > 0 && projectId) {
      let query = supabase
        .from("project_layer_mappings")
        .select("id, overrides")
        .eq("project_id", projectId);

      if (layerId) query = query.eq("layer_id", layerId);

      const { data: mappings } = await query;

      if (mappings?.length) {
        await Promise.all(
          mappings.map((m) =>
            supabase
              .from("project_layer_mappings")
              .update({ overrides: { ...m.overrides, ...clamped } })
              .eq("id", m.id)
          )
        );
      }
    }

    return Response.json(
      { overrides: clamped },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err) {
    console.error("[guide-preset]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
