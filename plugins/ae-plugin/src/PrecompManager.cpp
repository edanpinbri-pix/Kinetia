/**
 * PrecompManager.cpp
 * Precomposition management — groups layers into precomps matching
 * the PSD/AI group hierarchy from the .kinetia package.
 */

#include "PrecompManager.h"
#include "AEGP_SuiteHandler.h"

A_Err PrecompManager::createPrecomp(
    AEGP_CompH                  parentCompH,
    const std::vector<AEGP_LayerH>& layerHandles,
    const std::string&          precompName,
    AEGP_CompH*                 outPrecompH)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);

    if (layerHandles.empty()) return err;

    // Build layer index array for AEGP_PrecompLayers
    std::vector<AEGP_LayerIndex> indices;
    for (const auto& lh : layerHandles) {
        AEGP_LayerIndex idx = 0;
        if (!suites.LayerSuite8()->AEGP_GetLayerIndex(lh, &idx)) {
            indices.push_back(idx);
        }
    }

    if (indices.empty()) return err;

    // Precompose
    ERR(suites.CompSuite10()->AEGP_PrecompLayers(
        parentCompH,
        indices.data(),
        static_cast<A_long>(indices.size()),
        precompName.c_str(),
        TRUE,           // Move all attributes
        outPrecompH
    ));

    return err;
}
