#pragma once
#include "MicroJsonParser.h"
#include "AEConfig.h"
#include "AE_GeneralPlug.h"
#include "AEGP_SuiteHandler.h"

class ExpressionInjector {
public:
    ExpressionInjector(SPBasicSuite* pica) : pica_(pica) {}

    /**
     * Apply all tracks from a preset to a specific AE layer.
     * @param layerH     Target AE layer handle
     * @param preset     Parsed MicroJSON preset
     * @param durationMs Composition duration in ms (for time scaling)
     */
    A_Err applyPresetToLayer(
        AEGP_LayerH         layerH,
        const KinetiaPreset& preset,
        double              durationMs
    );

private:
    SPBasicSuite* pica_;

    A_Err injectExpression(
        AEGP_LayerH         layerH,
        const std::string&  property,
        const std::string&  expression
    );

    A_Err setKeyframes(
        AEGP_LayerH         layerH,
        const KinetiaTrack& track,
        double              durationMs
    );

    static AEGP_LayerStream propertyToStream(const std::string& property);
};
