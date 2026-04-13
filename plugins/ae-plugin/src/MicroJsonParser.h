#pragma once
#include <string>
#include <vector>
#include <unordered_map>

struct KinetiaKeyframe {
    double timeMs       = 0.0;
    double normalized   = 0.0;  // 0-1
    double aeValue      = 0.0;  // Actual AE property value
    std::string easingType;
};

struct KinetiaTrack {
    std::string property;
    std::string expression;
    std::vector<KinetiaKeyframe> keyframes;
};

struct KinetiaPhysics {
    double tension       = 0.5;
    double friction      = 0.6;
    double mass          = 1.0;
    double bounciness    = 0.0;
    double velocityDecay = 0.8;
    double randomness    = 0.0;
};

struct KinetiaMeta {
    std::string name;
    std::string category;
    double duration  = 0.0;
    double fps       = 30.0;
    double confidence= 0.0;
};

struct KinetiaPreset {
    std::string version = "1.0.0";
    std::string id;
    KinetiaMeta meta;
    KinetiaPhysics physics;
    std::vector<KinetiaTrack> tracks;
};

class MicroJsonParser {
public:
    static KinetiaPreset parseFile(const std::string& filePath);
    static KinetiaPreset parseString(const std::string& jsonStr);
    static double normalizedToAE(double normalized, const std::string& property);
};
