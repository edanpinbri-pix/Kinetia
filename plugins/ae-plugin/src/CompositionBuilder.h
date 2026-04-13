#pragma once
#include "MicroJsonParser.h"
#include "AEConfig.h"
#include "AE_GeneralPlug.h"
#include "AEGP_SuiteHandler.h"
#include <string>

class CompositionBuilder {
public:
    CompositionBuilder(SPBasicSuite* pica) : pica_(pica) {}

    /**
     * Build a full AE composition from a .kinetia package directory.
     * @param packagePath Path to unzipped .kinetia directory
     * @returns Err code
     */
    A_Err buildFromPackage(const std::string& packagePath);

private:
    SPBasicSuite* pica_;

    A_Err createComposition(
        const std::string& name,
        A_long width,
        A_long height,
        double fps,
        double durationMs,
        AEGP_CompH* outCompH
    );

    A_Err importAsset(
        const std::string& assetPath,
        AEGP_ItemH* outItemH
    );

    A_Err addLayerToComp(
        AEGP_CompH    compH,
        AEGP_ItemH    itemH,
        const std::string& layerName,
        A_long        orderIndex,
        AEGP_LayerH*  outLayerH
    );
};
