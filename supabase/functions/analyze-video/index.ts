/**
 * Supabase Edge Function: analyze-video (v2)
 * Receives: frames (base64) + isolationPrompt + presetId
 * Claude Vision isolates the target element, extracts physics,
 * generates AE expression template, saves to physics_presets.
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.36.3";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const PHYSICS_SCHEMA = `{
  "type": "spring|bounce|inertia|ease",
  "tension": <0_to_1>,
  "friction": <0_to_1>,
  "mass": <0.1_to_10>,
  "amplitude": <pixels_max_displacement>,
  "frequency": <Hz_oscillation>,
  "decay": <0_to_1_exponential_decay>,
  "easing": { "bezier": [<cx1>, <cy1>, <cx2>, <cy2>] }
}`;

function buildAnalysisPrompt(frameCount: number, isolationPrompt: string): string {
  return `You are a motion physics expert for the Kinetia animation system.

TARGET ELEMENT TO ANALYZE:
"${isolationPrompt}"

Analyze the ${frameCount} sequential video frames provided.

YOUR TASK:
1. Isolate ONLY the element described in the target prompt above
2. Track its movement (position, scale, rotation, opacity) across frames
3. Extract the mathematical physics skeleton:
   - Spring tension (how stiff/rigid the motion is: 0=loose, 1=rigid)
   - Friction/damping (how fast oscillation dies: 0=no damping, 1=overdamped)
   - Mass (inertia — how heavy the motion feels: 0.1=feather, 10=boulder)
   - Amplitude (max displacement from rest position in pixels, estimate from visual scale)
   - Frequency (oscillation frequency in Hz, 0 if no oscillation)
   - Decay (exponential decay rate: 0=infinite, 1=instant stop)
   - Easing bezier (cubic bezier control points approximating the motion curve)
4. Generate the After Effects expression template for this physics

OUTPUT: Return ONLY valid JSON with this exact structure:
{
  "physics": ${PHYSICS_SCHEMA},
  "expressionTemplate": "<javascript_string_for_ae_expression>",
  "category": "entrance|exit|bounce|inertia|loop|custom",
  "durationMs": <number>,
  "confidence": <0_to_1>
}

The expressionTemplate must be a valid After Effects JavaScript expression string.
Use these AE expression variables: time, thisComp, value, thisLayer
Use pseudo effect controls named: "Kinetia: Tensión", "Kinetia: Fricción", "Kinetia: Amplitud", "Kinetia: Decaimiento"

Example template for spring position:
"var t = time - thisLayer.inPoint;\\nvar tension = effect(\\"Kinetia: Tensión\\")(\\"Slider\\").value;\\nvar friction = effect(\\"Kinetia: Fricción\\")(\\"Slider\\").value;\\nvar amplitude = effect(\\"Kinetia: Amplitud\\")(\\"Slider\\").value;\\nvar decay = effect(\\"Kinetia: Decaimiento\\")(\\"Slider\\").value;\\nif (t <= 0) { value; } else {\\n  var w = Math.sqrt(tension) * (1 - friction * friction);\\n  var spring = amplitude * Math.exp(-friction * decay * t) * Math.cos(w * 2 * Math.PI * t);\\n  value + [0, spring];\\n}"

No explanation. No markdown. Pure JSON only.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const {
      frames, frameCount, fps,
      presetId, userId, presetName, isolationPrompt,
    } = await req.json() as {
      frames: string[];
      frameCount: number;
      fps: number;
      presetId: string;
      userId: string;
      presetName?: string;
      isolationPrompt: string;
    };

    if (!frames?.length || !presetId || !isolationPrompt) {
      return Response.json({ error: "frames, presetId, isolationPrompt required" }, { status: 400, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build image blocks — send up to 10 frames
    const validFrames = frames.filter((f) => f && f.length > 100);
    if (!validFrames.length) {
      return Response.json({ error: "No valid frames" }, { status: 400, headers: CORS });
    }
    const maxFrames = Math.min(validFrames.length, 10);
    const step = Math.max(1, Math.floor(validFrames.length / maxFrames));
    const selected = validFrames.filter((_, i) => i % step === 0).slice(0, maxFrames);

    const imageBlocks = selected.map((base64) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data: base64 },
    }));

    // Call Claude Vision
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: buildAnalysisPrompt(selected.length, isolationPrompt) },
        ],
      }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Parse AI response
    let result: {
      physics: Record<string, unknown>;
      expressionTemplate: string;
      category: string;
      durationMs: number;
      confidence: number;
    };

    try {
      const match = rawText.match(/\{[\s\S]+\}/);
      if (!match) throw new Error("No JSON in response");
      result = JSON.parse(match[0]);
    } catch {
      await supabase
        .from("physics_presets")
        .update({ status: "failed", error_message: "Failed to parse Claude response" })
        .eq("id", presetId);
      return Response.json({ error: "Failed to parse AI response" }, { status: 500, headers: CORS });
    }

    // Save to physics_presets
    const { error: updateErr } = await supabase
      .from("physics_presets")
      .update({
        name: presetName ?? "Preset sin nombre",
        category: result.category ?? "custom",
        physics: result.physics,
        expression_template: result.expressionTemplate ?? "",
        duration_ms: result.durationMs ?? 1000,
        fps: fps ?? 30,
        confidence: result.confidence ?? 0,
        status: "ready",
      })
      .eq("id", presetId);

    if (updateErr) throw updateErr;

    return Response.json({ presetId, status: "ready" }, { headers: CORS });

  } catch (err) {
    console.error("[analyze-video]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: CORS }
    );
  }
});
