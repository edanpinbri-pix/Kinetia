/**
 * kinetia.jsx — ExtendScript for After Effects
 * Runs inside AE engine. Called via cs.evalScript() from the panel.
 *
 * Functions exposed to CEP panel:
 *   kinetia_getLayerInfo()
 *   kinetia_applyPreset(physicsJson, targetProperty)
 *   kinetia_removeKinetia()
 */

// ─── Layer info ───────────────────────────────────────────────────────────────

function kinetia_getLayerInfo() {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return JSON.stringify({ error: "Sin composición activa" });
  }
  var layers = comp.selectedLayers;
  if (!layers.length) {
    return JSON.stringify({ error: "Selecciona una capa primero" });
  }
  var layer = layers[0];
  return JSON.stringify({
    name: layer.name,
    compName: comp.name,
    index: layer.index,
    duration: comp.duration,
    fps: comp.frameRate
  });
}

// ─── Expression builders ─────────────────────────────────────────────────────

function buildSpringExpression(targetProp) {
  var axis = (targetProp === "position") ? "xy" : "y";
  var vecResult = (axis === "xy")
    ? "value + [spring, spring];"
    : "value + [0, spring];";
  if (targetProp === "rotation" || targetProp === "opacity") {
    vecResult = "value + spring;";
  }

  return (
    "var t = time - thisLayer.inPoint - effect(\"KN Entrada\")(\"Slider\").value;\n" +
    "var tension    = effect(\"KN Tensión\")(\"Slider\").value / 100;\n" +
    "var friction   = effect(\"KN Fricción\")(\"Slider\").value / 100;\n" +
    "var amplitude  = effect(\"KN Amplitud\")(\"Slider\").value;\n" +
    "var decay      = effect(\"KN Decaimiento\")(\"Slider\").value / 10;\n" +
    "if (t <= 0) {\n" +
    "  value;\n" +
    "} else {\n" +
    "  var stiffness = tension * 300 + 20;\n" +
    "  var damp = friction * 25 + 2;\n" +
    "  var w = Math.sqrt(Math.max(0, stiffness - damp * damp));\n" +
    "  var spring = amplitude * Math.exp(-damp * decay * t) * (w > 0 ? Math.cos(w * t) : 1);\n" +
    "  " + vecResult + "\n" +
    "}"
  );
}

function buildBounceExpression(targetProp) {
  var vecResult = (targetProp === "rotation" || targetProp === "opacity")
    ? "value + bounce;"
    : "value + [0, -bounce];";

  return (
    "var t = time - thisLayer.inPoint - effect(\"KN Entrada\")(\"Slider\").value;\n" +
    "var amplitude  = effect(\"KN Amplitud\")(\"Slider\").value;\n" +
    "var frecuencia = effect(\"KN Frecuencia\")(\"Slider\").value;\n" +
    "var decay      = effect(\"KN Decaimiento\")(\"Slider\").value / 10;\n" +
    "if (t <= 0) {\n" +
    "  value;\n" +
    "} else {\n" +
    "  var bounce = amplitude * Math.exp(-decay * t) * Math.abs(Math.sin(Math.PI * frecuencia * t));\n" +
    "  " + vecResult + "\n" +
    "}"
  );
}

function buildInertiaExpression(targetProp) {
  var vecResult = (targetProp === "rotation" || targetProp === "opacity")
    ? "value + amplitude * decay;"
    : "value + [amplitude * decay, 0];";

  return (
    "var t = time - thisLayer.inPoint - effect(\"KN Entrada\")(\"Slider\").value;\n" +
    "var amplitude = effect(\"KN Amplitud\")(\"Slider\").value;\n" +
    "var friction  = effect(\"KN Fricción\")(\"Slider\").value / 100;\n" +
    "var masa      = effect(\"KN Masa\")(\"Slider\").value;\n" +
    "if (t <= 0) {\n" +
    "  " + vecResult + "\n" +
    "} else {\n" +
    "  var decay = Math.exp(-friction / Math.max(0.01, masa) * t);\n" +
    "  " + vecResult + "\n" +
    "}"
  );
}

function buildEaseExpression() {
  return (
    "var desde    = effect(\"KN Desde\")(\"Slider\").value;\n" +
    "var hasta    = effect(\"KN Hasta\")(\"Slider\").value;\n" +
    "var duracion = Math.max(0.01, effect(\"KN Duración\")(\"Slider\").value);\n" +
    "var entrada  = effect(\"KN Entrada\")(\"Slider\").value;\n" +
    "var t = Math.max(0, Math.min(1, (time - thisLayer.inPoint - entrada) / duracion));\n" +
    "var ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;\n" +
    "linear(ease, 0, 1, desde, hasta);"
  );
}

// ─── Apply preset ─────────────────────────────────────────────────────────────

function kinetia_applyPreset(physicsJson, targetProperty) {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "error:no_comp";

    var layers = comp.selectedLayers;
    if (!layers.length) return "error:no_layer";

    var layer = layers[0];
    var physics;
    try { physics = JSON.parse(physicsJson); } catch (e) { return "error:json_parse"; }

    var type = (physics.type || "spring").toLowerCase();

    app.beginUndoGroup("Kinetia: Aplicar Preset");

    // Remove existing KN effects
    for (var i = layer.Effects.numProperties; i >= 1; i--) {
      var eff = layer.Effects.property(i);
      if (eff.name.indexOf("KN ") === 0) eff.remove();
    }

    // Build params based on type
    var params = [];
    var expression = "";

    if (type === "spring") {
      params = [
        { name: "KN Tensión",     value: (physics.tension || 0.5) * 100 },
        { name: "KN Fricción",    value: (physics.friction || 0.5) * 100 },
        { name: "KN Amplitud",    value: physics.amplitude || 60 },
        { name: "KN Decaimiento", value: (physics.decay || 0.5) * 10 },
        { name: "KN Entrada",     value: 0 }
      ];
      expression = buildSpringExpression(targetProperty);

    } else if (type === "bounce") {
      params = [
        { name: "KN Amplitud",    value: physics.amplitude || 80 },
        { name: "KN Frecuencia",  value: physics.frequency || 3 },
        { name: "KN Decaimiento", value: (physics.decay || 0.5) * 10 },
        { name: "KN Entrada",     value: 0 }
      ];
      expression = buildBounceExpression(targetProperty);

    } else if (type === "inertia") {
      params = [
        { name: "KN Amplitud", value: physics.amplitude || 60 },
        { name: "KN Fricción", value: (physics.friction || 0.5) * 100 },
        { name: "KN Masa",     value: physics.mass || 1.0 },
        { name: "KN Entrada",  value: 0 }
      ];
      expression = buildInertiaExpression(targetProperty);

    } else {
      // ease / default
      params = [
        { name: "KN Desde",    value: 0 },
        { name: "KN Hasta",    value: 100 },
        { name: "KN Duración", value: 0.6 },
        { name: "KN Entrada",  value: 0 }
      ];
      expression = buildEaseExpression();
    }

    // Add Slider Controls
    for (var p = 0; p < params.length; p++) {
      var slider = layer.Effects.addProperty("ADBE Slider Control");
      slider.name = params[p].name;
      slider.property("ADBE Slider Control-0001").setValue(params[p].value);
    }

    // Apply expression to target property
    var prop = kinetia_getTargetProperty(layer, targetProperty);
    if (!prop) {
      app.endUndoGroup();
      return "error:property_not_found:" + targetProperty;
    }

    prop.expression = expression;

    app.endUndoGroup();
    return "ok";

  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return "error:" + e.message;
  }
}

// ─── Remove Kinetia effects ───────────────────────────────────────────────────

function kinetia_removeKinetia() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "error:no_comp";
    var layers = comp.selectedLayers;
    if (!layers.length) return "error:no_layer";
    var layer = layers[0];

    app.beginUndoGroup("Kinetia: Eliminar");

    // Clear expressions on transform props
    var props = [
      layer.transform.position,
      layer.transform.scale,
      layer.transform.rotation,
      layer.transform.opacity
    ];
    for (var i = 0; i < props.length; i++) {
      try { props[i].expression = ""; } catch (_) {}
    }

    // Remove KN slider controls
    for (var j = layer.Effects.numProperties; j >= 1; j--) {
      var eff = layer.Effects.property(j);
      if (eff.name.indexOf("KN ") === 0) eff.remove();
    }

    app.endUndoGroup();
    return "ok";
  } catch (e) {
    try { app.endUndoGroup(); } catch (_) {}
    return "error:" + e.message;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kinetia_getTargetProperty(layer, targetProperty) {
  try {
    switch (targetProperty) {
      case "position":   return layer.transform.position;
      case "scale":      return layer.transform.scale;
      case "rotation":   return layer.transform.rotation;
      case "opacity":    return layer.transform.opacity;
      default:           return layer.transform.position;
    }
  } catch (e) {
    return null;
  }
}
