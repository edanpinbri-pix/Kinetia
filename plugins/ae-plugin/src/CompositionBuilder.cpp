/**
 * CompositionBuilder.cpp
 * Reads a .kinetia package and reconstructs a full AE composition.
 *
 * Package structure:
 *   manifest.json      — project metadata (width, height, fps, duration)
 *   preset-map.json    — MicroJSON for each layer mapping
 *   expressions/       — Pre-compiled .jsx files (one per layer)
 *   assets/            — PNG / SVG source files
 *   preview.mp4        — Web preview for fidelity validation
 */

#include "CompositionBuilder.h"
#include "ExpressionInjector.h"
#include "AEGP_SuiteHandler.h"
#include "rapidjson/document.h"
#include "rapidjson/istreamwrapper.h"

#include <fstream>
#include <sstream>
#include <filesystem>

namespace fs = std::filesystem;
using namespace rapidjson;

// Helper: read entire file to string
static std::string readFile(const fs::path& p) {
    std::ifstream f(p);
    std::ostringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

A_Err CompositionBuilder::buildFromPackage(const std::string& packagePath) {
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);
    fs::path pkgDir(packagePath);

    // ── Parse manifest ────────────────────────────────────────────────────────
    fs::path manifestPath = pkgDir / "manifest.json";
    if (!fs::exists(manifestPath)) {
        return A_Err_GENERIC;
    }

    Document manifest;
    std::string manifestStr = readFile(manifestPath);
    manifest.Parse(manifestStr.c_str());

    std::string projectName = manifest.HasMember("name") ? manifest["name"].GetString() : "Kinetia Project";
    A_long width    = manifest.HasMember("width")    ? manifest["width"].GetInt()    : 1920;
    A_long height   = manifest.HasMember("height")   ? manifest["height"].GetInt()   : 1080;
    double fps      = manifest.HasMember("fps")      ? manifest["fps"].GetDouble()   : 30.0;
    double durMs    = manifest.HasMember("duration") ? manifest["duration"].GetDouble() : 3000.0;

    // ── Create composition ────────────────────────────────────────────────────
    AEGP_CompH compH = nullptr;
    ERR(createComposition(projectName, width, height, fps, durMs, &compH));
    if (err || !compH) return err;

    // ── Parse preset-map and apply per layer ──────────────────────────────────
    fs::path presetMapPath = pkgDir / "preset-map.json";
    if (!fs::exists(presetMapPath)) return err;

    Document presetMap;
    presetMap.Parse(readFile(presetMapPath).c_str());

    if (!presetMap.IsArray()) return err;

    ExpressionInjector injector(pica_);

    for (SizeType i = 0; i < presetMap.Size(); ++i) {
        const auto& mapping = presetMap[i];

        std::string layerId   = mapping.HasMember("layerId") ? mapping["layerId"].GetString() : "";
        std::string layerName = mapping.HasMember("layerName") ? mapping["layerName"].GetString() : layerId;

        // Import asset for this layer
        fs::path assetPath = pkgDir / "assets" / (layerId + ".png");
        if (!fs::exists(assetPath)) {
            assetPath = pkgDir / "assets" / (layerId + ".svg");
        }
        if (!fs::exists(assetPath)) continue;

        AEGP_ItemH itemH = nullptr;
        ERR(importAsset(assetPath.string(), &itemH));
        if (err || !itemH) continue;

        AEGP_LayerH layerH = nullptr;
        ERR(addLayerToComp(compH, itemH, layerName, (A_long)i, &layerH));
        if (err || !layerH) continue;

        // Apply preset (use pre-compiled expression file if available)
        fs::path exprPath = pkgDir / "expressions" / (layerId + ".jsx");
        if (fs::exists(exprPath)) {
            std::string expr = readFile(exprPath);
            // Inject expression to position property (simplified — full impl in Sprint 6)
            // TODO: map expression to correct property per track
        } else if (mapping.HasMember("microJson")) {
            // Parse inline MicroJSON and inject
            std::string microJsonStr;
            // Serialize back to string for parser
            // Full implementation in Sprint 6
        }
    }

    return err;
}

A_Err CompositionBuilder::createComposition(
    const std::string& name,
    A_long width, A_long height,
    double fps, double durationMs,
    AEGP_CompH* outCompH)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);

    AEGP_ItemH parentFolderH = nullptr;  // nullptr = root project

    A_Time duration;
    duration.value = static_cast<A_long>(durationMs / 1000.0 * fps);
    duration.scale = static_cast<A_u_long>(fps);

    A_Ratio pixelAspect = {1, 1};

    ERR(suites.CompSuite10()->AEGP_CreateComp(
        parentFolderH,
        name.c_str(),
        width, height,
        &pixelAspect,
        &duration,
        (A_Ratio){static_cast<A_long>(fps * 100), 100},
        outCompH
    ));

    return err;
}

A_Err CompositionBuilder::importAsset(
    const std::string& assetPath,
    AEGP_ItemH* outItemH)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);

    AEGP_FootageH footageH = nullptr;
    ERR(suites.FootageSuite5()->AEGP_NewFootage(
        0,
        assetPath.c_str(),
        nullptr, nullptr,
        FALSE, nullptr,
        &footageH
    ));

    if (!err && footageH) {
        ERR(suites.FootageSuite5()->AEGP_AddFootageToProject(
            footageH, nullptr, outItemH
        ));
    }

    return err;
}

A_Err CompositionBuilder::addLayerToComp(
    AEGP_CompH    compH,
    AEGP_ItemH    itemH,
    const std::string& layerName,
    A_long        orderIndex,
    AEGP_LayerH*  outLayerH)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);

    ERR(suites.LayerSuite8()->AEGP_AddLayer(itemH, compH, outLayerH));

    if (!err && *outLayerH) {
        ERR(suites.LayerSuite8()->AEGP_SetLayerName(*outLayerH, layerName.c_str()));
    }

    return err;
}
