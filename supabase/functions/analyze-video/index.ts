/**
 * Supabase Edge Function: analyze-video
 * Receives video frames (base64) from the browser,
 * sends them to Claude Vision, returns a MicroJSON preset.
 *
 * Called by: apps/web after client-side frame extraction
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.36.3";
import { createClient } from "npm:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "npm:uuid@11";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const MICRO_JSON_SCHEMA = `{
  "version": "1.0.0",
  "id": "<uuid>",
  "meta": {
    "name": "<string>",
    "description": "<string>",
    "category": "entrance|exit|emphasis|transition|loop|text-reveal|kinetic-typography|logo-intro|custom",
    "tags": ["<string>"],
    "duration": <number_ms>,
    "fps": <number>,
    "thumbnailUrl": "",
    "createdAt": "<iso_date>",
    "confidence": <0_to_1>
  },
  "targetConstraints": {
    "layerTypes": ["text"|"vector"|"image"|"shape"|"group"],
    "requiresCenterAnchor": <boolean>
  },
  "tracks": [
    {
      "property": "position.x|position.y|scale.uniform|rotation|opacity",
      "keyframes": [
        {
          "time": <ms_from_start>,
          "value": <normalized_0_to_1>,
          "easing": {
            "type": "linear|easeOutCubic|easeOutElastic|easeOutBounce|easeInOutQuad|custom",
            "bezier": [<cx1>,<cy1>,<cx2>,<cy2>]
          }
        }
      ]
    }
  ],
  "physics": {
    "tension": <0_to_1>,
    "friction": <0_to_1>,
    "mass": <0.1_to_10>,
    "bounciness": <0_to_1>,
    "velocityDecay": <0_to_1>,
    "randomness": <0_to_1>
  }
}`;

const ANALYSIS_PROMPT = `You are a motion analysis expert for the Kinetia animation system.

Analyze the ${"{frameCount}"} sequential video frames provided and extract the motion skeleton.

YOUR TASK:
1. Identify what elements are moving (text, vector/logo, image)
2. Track their position, scale, rotation, and opacity changes across frames
3. Identify the easing curve type (ease-out cubic, elastic, bounce, etc.)
4. Detect physics characteristics: spring tension, friction, bounciness, mass
5. Generate a MicroJSON preset that captures this "movement skeleton"

RULES:
- Focus on the MATHEMATICAL STRUCTURE of the motion, not pixel content
- Normalize all values to 0-1 range (they will be mapped to actual AE ranges at apply time)
- Include 4-12 keyframes per track (use Douglas-Peucker simplification mentally)
- time values are in milliseconds from start
- confidence: how confident you are in the extraction (0-1)

OUTPUT: Return ONLY valid JSON matching this schema exactly:
${MICRO_JSON_SCHEMA}

No explanation. No code blocks. Pure JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  try {
    const { frames, frameCount, fps, jobId, userId, presetName } = await req.json() as {
      frames: string[];       // base64 PNG frames
      frameCount: number;
      fps: number;
      jobId: string;
      userId: string;
      presetName?: string;
    };

    if (!frames?.length) {
      return Response.json({ error: "No frames provided" }, { status: 400 });
    }

    // Init Supabase admin client for DB writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update job: processing
    await supabase
      .from("training_jobs")
      .update({ status: "processing", progress: 10 })
      .eq("id", jobId);

    // Build Claude Vision message — send up to 10 frames (API limit aware)
    const validFrames = frames.filter((f) => f && f.length > 100);
    if (!validFrames.length) {
      return Response.json({ error: "No valid frames extracted from video" }, { status: 400 });
    }
    const maxFrames = Math.min(validFrames.length, 10);
    const step = Math.max(1, Math.floor(validFrames.length / maxFrames));
    const selectedFrames = validFrames.filter((_, i) => i % step === 0).slice(0, maxFrames);

    const imageBlocks = selectedFrames.map((base64) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/png" as const,
        data: base64,
      },
    }));

    await supabase
      .from("training_jobs")
      .update({ progress: 30 })
      .eq("id", jobId);

    // Call Claude Vision
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: ANALYSIS_PROMPT.replace("{frameCount}", String(selectedFrames.length)),
            },
          ],
        },
      ],
    });

    await supabase
      .from("training_jobs")
      .update({ progress: 75 })
      .eq("id", jobId);

    // Parse response
    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let preset: Record<string, unknown>;
    try {
      // Extract JSON from response (handles any surrounding text)
      const jsonMatch = rawText.match(/\{[\s\S]+\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      preset = JSON.parse(jsonMatch[0]);
    } catch {
      await supabase
        .from("training_jobs")
        .update({ status: "failed", error_message: "Failed to parse Claude response" })
        .eq("id", jobId);
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Assign a proper ID and name
    preset.id = uuidv4();
    if (presetName && preset.meta) {
      (preset.meta as Record<string, unknown>).name = presetName;
    }

    // Save preset to DB
    const { data: savedPreset, error: presetError } = await supabase
      .from("presets")
      .insert({
        user_id: userId,
        name: (preset.meta as Record<string, unknown>)?.name ?? "Untitled Preset",
        category: (preset.meta as Record<string, unknown>)?.category ?? "custom",
        tags: (preset.meta as Record<string, unknown>)?.tags ?? [],
        micro_json: preset,
        confidence: (preset.meta as Record<string, unknown>)?.confidence ?? 0,
        duration: (preset.meta as Record<string, unknown>)?.duration ?? 0,
      })
      .select()
      .single();

    if (presetError) throw presetError;

    // Mark job complete
    await supabase
      .from("training_jobs")
      .update({
        status: "completed",
        progress: 100,
        result_preset_id: savedPreset.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return Response.json(
      { preset: savedPreset },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err) {
    console.error("[analyze-video]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
