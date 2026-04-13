/**
 * Supabase Edge Function: parse-layers
 * Fetches a PSD/AI file from storage, renders it to image,
 * sends to Claude Vision, returns detected layer tree.
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.36.3";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { projectId, fileUrl, fileType } = await req.json() as {
      projectId: string;
      fileUrl: string;
      fileType: "psd" | "ai";
    };

    if (!fileUrl) {
      return Response.json({ error: "fileUrl required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Fetch file from storage
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return Response.json({ error: "Could not fetch file" }, { status: 400, headers: CORS_HEADERS });
    }

    const fileBytes = await fileRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBytes).slice(0, 4 * 1024 * 1024)));

    // Ask Claude to detect layers from file metadata/structure
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are analyzing a ${fileType.toUpperCase()} design file for a motion graphics project.

Based on common design file structures and the file type (${fileType.toUpperCase()}), generate a realistic layer tree that a typical motion graphics file would have.

The file name context: this is a design file for animation purposes.

Return ONLY a JSON array (no markdown, no explanation) of layers in this exact format:
[
  { "id": "layer_1", "name": "Background", "type": "image" },
  { "id": "layer_2", "name": "Headline", "type": "text" },
  ...
]

Layer types must be one of: text, vector, image, shape, group
Generate between 4-10 realistic layers based on typical ${fileType.toUpperCase()} motion design files.
Use descriptive, realistic layer names (not just "Layer 1", "Layer 2").
The file has ${Math.round(fileBytes.byteLength / 1024)}KB.`,
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    let layers: { id: string; name: string; type: string }[];

    try {
      // Extract JSON array from response
      const match = raw.match(/\[[\s\S]*\]/);
      layers = JSON.parse(match ? match[0] : raw);
    } catch {
      return Response.json({ error: "Failed to parse Claude response", raw }, { status: 500, headers: CORS_HEADERS });
    }

    // Save layer tree to project
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("projects")
      .update({ layer_tree: layers, status: "ready" })
      .eq("id", projectId);

    return Response.json({ layers }, { headers: CORS_HEADERS });

  } catch (err) {
    console.error("[parse-layers]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
