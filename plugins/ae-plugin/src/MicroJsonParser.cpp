/**
 * MicroJsonParser.cpp
 * Parse MicroJSON preset files using RapidJSON.
 * Converts normalized 0-1 values to actual AE property ranges.
 */

#include "MicroJsonParser.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include <fstream>
#include <sstream>
#include <stdexcept>

using namespace rapidjson;

// ─── AE Property ranges ───────────────────────────────────────────────────────
struct PropertyRange { double min; double max; };

static const std::unordered_map<std::string, PropertyRange> PROPERTY_RANGES = {
    {"position.x",    {-2000.0, 2000.0}},
    {"position.y",    {-2000.0, 2000.0}},
    {"scale.x",       {0.0,     200.0}},
    {"scale.y",       {0.0,     200.0}},
    {"scale.uniform", {0.0,     200.0}},
    {"rotation",      {-360.0,  360.0}},
    {"opacity",       {0.0,     100.0}},
    {"anchorPoint.x", {-1000.0, 1000.0}},
    {"anchorPoint.y", {-1000.0, 1000.0}},
    {"skew",          {-90.0,   90.0}},
    {"skewAxis",      {-90.0,   90.0}},
};

double MicroJsonParser::normalizedToAE(double normalized, const std::string& property) {
    auto it = PROPERTY_RANGES.find(property);
    if (it == PROPERTY_RANGES.end()) return normalized;
    return it->second.min + normalized * (it->second.max - it->second.min);
}

KinetiaPreset MicroJsonParser::parseFile(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        throw std::runtime_error("Cannot open file: " + filePath);
    }
    std::stringstream ss;
    ss << ifs.rdbuf();
    return parseString(ss.str());
}

KinetiaPreset MicroJsonParser::parseString(const std::string& jsonStr) {
    Document doc;
    ParseResult ok = doc.Parse(jsonStr.c_str());
    if (!ok) {
        throw std::runtime_error(
            std::string("JSON parse error: ") + GetParseError_En(ok.Code()) +
            " at offset " + std::to_string(ok.Offset())
        );
    }

    KinetiaPreset preset;

    // Version check
    if (doc.HasMember("version") && doc["version"].IsString()) {
        preset.version = doc["version"].GetString();
    }
    if (preset.version != "1.0.0") {
        throw std::runtime_error("Unsupported MicroJSON version: " + preset.version);
    }

    preset.id = doc.HasMember("id") ? doc["id"].GetString() : "";

    // Meta
    if (doc.HasMember("meta") && doc["meta"].IsObject()) {
        const auto& meta = doc["meta"];
        preset.meta.name     = meta.HasMember("name")     ? meta["name"].GetString()     : "";
        preset.meta.category = meta.HasMember("category") ? meta["category"].GetString() : "";
        preset.meta.duration = meta.HasMember("duration") ? meta["duration"].GetDouble() : 0.0;
        preset.meta.fps      = meta.HasMember("fps")      ? meta["fps"].GetDouble()      : 30.0;
        preset.meta.confidence = meta.HasMember("confidence") ? meta["confidence"].GetDouble() : 0.0;
    }

    // Physics
    if (doc.HasMember("physics") && doc["physics"].IsObject()) {
        const auto& ph = doc["physics"];
        preset.physics.tension       = ph.HasMember("tension")       ? ph["tension"].GetDouble()       : 0.5;
        preset.physics.friction      = ph.HasMember("friction")      ? ph["friction"].GetDouble()      : 0.6;
        preset.physics.mass          = ph.HasMember("mass")          ? ph["mass"].GetDouble()          : 1.0;
        preset.physics.bounciness    = ph.HasMember("bounciness")    ? ph["bounciness"].GetDouble()    : 0.0;
        preset.physics.velocityDecay = ph.HasMember("velocityDecay") ? ph["velocityDecay"].GetDouble() : 0.8;
        preset.physics.randomness    = ph.HasMember("randomness")    ? ph["randomness"].GetDouble()    : 0.0;
    }

    // Tracks
    if (doc.HasMember("tracks") && doc["tracks"].IsArray()) {
        for (const auto& t : doc["tracks"].GetArray()) {
            KinetiaTrack track;
            track.property = t.HasMember("property") ? t["property"].GetString() : "";
            track.expression = t.HasMember("expression") ? t["expression"].GetString() : "";

            if (t.HasMember("keyframes") && t["keyframes"].IsArray()) {
                for (const auto& kf : t["keyframes"].GetArray()) {
                    KinetiaKeyframe keyframe;
                    keyframe.timeMs      = kf.HasMember("time")  ? kf["time"].GetDouble()  : 0.0;
                    keyframe.normalized  = kf.HasMember("value") ? kf["value"].GetDouble() : 0.0;
                    keyframe.aeValue     = normalizedToAE(keyframe.normalized, track.property);
                    keyframe.easingType  = (kf.HasMember("easing") && kf["easing"].HasMember("type"))
                        ? kf["easing"]["type"].GetString() : "linear";
                    track.keyframes.push_back(keyframe);
                }
            }
            preset.tracks.push_back(track);
        }
    }

    return preset;
}
