#pragma once
#include "AEConfig.h"
#include "AE_GeneralPlug.h"
#include "AEGP_SuiteHandler.h"
#include <string>
#include <vector>

/**
 * PrecompManager
 * Handles creation of precomposition structure from layer groups.
 * Called by CompositionBuilder when a layer group is encountered in the package.
 */
class PrecompManager {
public:
    PrecompManager(SPBasicSuite* pica) : pica_(pica) {}

    /**
     * Move a list of layers into a new precomp.
     * @param parentCompH  Parent composition
     * @param layerHandles Layers to precompose
     * @param precompName  Name for the new precomp
     * @param outPrecompH  Output precomp handle
     */
    A_Err createPrecomp(
        AEGP_CompH                  parentCompH,
        const std::vector<AEGP_LayerH>& layerHandles,
        const std::string&          precompName,
        AEGP_CompH*                 outPrecompH
    );

private:
    SPBasicSuite* pica_;
};
