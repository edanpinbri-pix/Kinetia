/**
 * Supabase Edge Function: generate-expression
 * Takes a PhysicsConfig and target AE property,
 * returns a ready-to-inject After Effects expression string
 * + Pseudo Effect XML definition (editable nodes).
 *
 * Called by: AE Plugin when user clicks "Apply"
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

// ─── Expression templates ─────────────────────────────────────────────────────

function springPositionExpression(axis: "x" | "y" | "xy"): string {
  const axisComment = axis === "xy" ? "// Drives both X and Y" : `// Drives position.${axis}`;
  return `${axisComment}
var eff = effect("Kinetia: Spring");
var tensión = eff("Tensión").value;
var fricción = eff("Fricción").value;
var amplitud = eff("Amplitud").value;
var decaimiento = eff("Decaimiento").value;
var inOffset = eff("Entrada (s)").value;

var t = time - thisLayer.inPoint - inOffset;
if (t <= 0) {
  value;
} else {
  var stiffness = tensión * 300 + 20;
  var damp = fricción * 25 + 2;
  var w = Math.sqrt(Math.max(0, stiffness - damp * damp));
  var env = amplitud * Math.exp(-damp * t * decaimiento);
  var osc = (w > 0) ? Math.cos(w * t) : 1;
  var spring = env * osc;
  ${axis === "x" ? "value + [spring, 0];" : axis === "y" ? "value + [0, spring];" : "value + [spring, spring];"}
}`;
}

function bounceExpression(): string {
  return `// Kinetia: Bounce — drives position.y
var eff = effect("Kinetia: Bounce");
var amplitud = eff("Amplitud").value;
var frecuencia = eff("Frecuencia").value;
var decaimiento = eff("Decaimiento").value;
var inOffset = eff("Entrada (s)").value;

var t = time - thisLayer.inPoint - inOffset;
if (t <= 0) {
  value;
} else {
  var bounce = amplitud * Math.exp(-decaimiento * t) * Math.abs(Math.sin(Math.PI * frecuencia * t));
  value + [0, -bounce];
}`;
}

function inertiaExpression(): string {
  return `// Kinetia: Inertia — drives position
var eff = effect("Kinetia: Inercia");
var amplitud = eff("Amplitud").value;
var fricción = eff("Fricción").value;
var masa = eff("Masa").value;
var inOffset = eff("Entrada (s)").value;

var t = time - thisLayer.inPoint - inOffset;
if (t <= 0) {
  value + [amplitud, 0];
} else {
  var decay = Math.exp(-fricción / masa * t);
  value + [amplitud * decay, 0];
}`;
}

function easeExpression(): string {
  return `// Kinetia: Ease — drives opacity/scale
var eff = effect("Kinetia: Ease");
var desde = eff("Desde").value;
var hasta = eff("Hasta").value;
var duración = eff("Duración (s)").value;
var inOffset = eff("Entrada (s)").value;

var t = Math.max(0, Math.min(1, (time - thisLayer.inPoint - inOffset) / duración));
var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
linear(ease, 0, 1, desde, hasta);`;
}

// ─── Pseudo Effect XML templates ─────────────────────────────────────────────

function springPseudoEffectXml(tension: number, friction: number, amplitude: number, decay: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<effects>
  <effectDef matchName="com.kinetia.spring" displayName="Kinetia: Spring">
    <param matchName="com.kinetia.spring.tension" displayName="Tensión" type="slider"
      default="${(tension * 100).toFixed(0)}" min="0" max="100"/>
    <param matchName="com.kinetia.spring.friction" displayName="Fricción" type="slider"
      default="${(friction * 100).toFixed(0)}" min="0" max="100"/>
    <param matchName="com.kinetia.spring.amplitude" displayName="Amplitud" type="slider"
      default="${amplitude.toFixed(0)}" min="0" max="500"/>
    <param matchName="com.kinetia.spring.decay" displayName="Decaimiento" type="slider"
      default="${(decay * 10).toFixed(1)}" min="0" max="20"/>
    <param matchName="com.kinetia.spring.inOffset" displayName="Entrada (s)" type="slider"
      default="0" min="0" max="10"/>
  </effectDef>
</effects>`;
}

function bouncePseudoEffectXml(amplitude: number, frequency: number, decay: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<effects>
  <effectDef matchName="com.kinetia.bounce" displayName="Kinetia: Bounce">
    <param matchName="com.kinetia.bounce.amplitude" displayName="Amplitud" type="slider"
      default="${amplitude.toFixed(0)}" min="0" max="500"/>
    <param matchName="com.kinetia.bounce.frequency" displayName="Frecuencia" type="slider"
      default="${frequency.toFixed(1)}" min="0.1" max="20"/>
    <param matchName="com.kinetia.bounce.decay" displayName="Decaimiento" type="slider"
      default="${(decay * 10).toFixed(1)}" min="0" max="20"/>
    <param matchName="com.kinetia.bounce.inOffset" displayName="Entrada (s)" type="slider"
      default="0" min="0" max="10"/>
  </effectDef>
</effects>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const {
      presetId,
      targetProperty = "position.y",
    } = await req.json() as {
      presetId: string;
      targetProperty?: string;
    };

    if (!presetId) {
      return Response.json({ error: "presetId required" }, { status: 400, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: preset, error } = await supabase
      .from("physics_presets")
      .select("physics, expression_template")
      .eq("id", presetId)
      .single();

    if (error || !preset) {
      return Response.json({ error: "Preset not found" }, { status: 404, headers: CORS });
    }

    const physics = preset.physics as {
      type: string; tension: number; friction: number; mass: number;
      amplitude: number; frequency: number; decay: number;
    };

    // Generate expression based on physics type
    let expression = preset.expression_template as string;
    let pseudoEffectXml = "";

    if (!expression || expression.length < 10) {
      // Generate fresh from physics type
      switch (physics.type) {
        case "spring":
          expression = springPositionExpression(targetProperty.includes(".x") ? "x" : "y");
          pseudoEffectXml = springPseudoEffectXml(physics.tension, physics.friction, physics.amplitude, physics.decay);
          break;
        case "bounce":
          expression = bounceExpression();
          pseudoEffectXml = bouncePseudoEffectXml(physics.amplitude, physics.frequency, physics.decay);
          break;
        case "inertia":
          expression = inertiaExpression();
          pseudoEffectXml = springPseudoEffectXml(physics.tension, physics.friction, physics.amplitude, physics.decay);
          break;
        default:
          expression = easeExpression();
          pseudoEffectXml = springPseudoEffectXml(0.5, 0.6, physics.amplitude ?? 60, physics.decay ?? 0.8);
      }
    }

    return Response.json({
      expression,
      pseudoEffectXml,
      physics,
    }, { headers: CORS });

  } catch (err) {
    console.error("[generate-expression]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers: CORS }
    );
  }
});
