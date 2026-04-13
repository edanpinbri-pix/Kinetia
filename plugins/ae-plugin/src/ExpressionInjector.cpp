/**
 * ExpressionInjector.cpp
 * Injects AE expressions and keyframes from MicroJSON tracks onto AE layers.
 */

#include "ExpressionInjector.h"
#include "AEGP_SuiteHandler.h"
#include <unordered_map>

static const std::unordered_map<std::string, AEGP_LayerStream> PROPERTY_STREAM_MAP = {
    {"position.x",     AEGP_LayerStream_POSITION},
    {"position.y",     AEGP_LayerStream_POSITION},
    {"scale.x",        AEGP_LayerStream_SCALE},
    {"scale.y",        AEGP_LayerStream_SCALE},
    {"scale.uniform",  AEGP_LayerStream_SCALE},
    {"rotation",       AEGP_LayerStream_ROTATE},
    {"opacity",        AEGP_LayerStream_OPACITY},
    {"anchorPoint.x",  AEGP_LayerStream_ANCHORPOINT},
    {"anchorPoint.y",  AEGP_LayerStream_ANCHORPOINT},
};

AEGP_LayerStream ExpressionInjector::propertyToStream(const std::string& property) {
    auto it = PROPERTY_STREAM_MAP.find(property);
    return (it != PROPERTY_STREAM_MAP.end()) ? it->second : AEGP_LayerStream_POSITION;
}

A_Err ExpressionInjector::applyPresetToLayer(
    AEGP_LayerH         layerH,
    const KinetiaPreset& preset,
    double              durationMs)
{
    A_Err err = A_Err_NONE;

    for (const auto& track : preset.tracks) {
        // If expression string is present, inject it directly
        if (!track.expression.empty()) {
            ERR(injectExpression(layerH, track.property, track.expression));
        } else if (!track.keyframes.empty()) {
            // Otherwise apply keyframes directly
            ERR(setKeyframes(layerH, track, durationMs));
        }
        if (err) break;
    }

    return err;
}

A_Err ExpressionInjector::injectExpression(
    AEGP_LayerH         layerH,
    const std::string&  property,
    const std::string&  expression)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);

    AEGP_StreamRefH streamH = nullptr;
    AEGP_LayerStream stream = propertyToStream(property);

    ERR(suites.StreamSuite5()->AEGP_GetNewLayerStream(
        0,          // plugin id — TODO: pass from global
        layerH,
        stream,
        &streamH
    ));

    if (!err && streamH) {
        ERR(suites.ExpressionSuite2()->AEGP_SetExpression(
            0,
            streamH,
            expression.c_str()
        ));
        suites.StreamSuite5()->AEGP_DisposeStream(streamH);
    }

    return err;
}

A_Err ExpressionInjector::setKeyframes(
    AEGP_LayerH         layerH,
    const KinetiaTrack& track,
    double              durationMs)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(pica_);

    AEGP_StreamRefH streamH = nullptr;
    AEGP_LayerStream stream = propertyToStream(track.property);

    ERR(suites.StreamSuite5()->AEGP_GetNewLayerStream(
        0, layerH, stream, &streamH
    ));

    if (!err && streamH) {
        for (const auto& kf : track.keyframes) {
            A_Time time;
            // Convert ms to AE time (scale = fps denominator)
            time.value = static_cast<A_long>(kf.timeMs / 1000.0 * 30.0);
            time.scale = 30;

            AEGP_StreamValue2 value;
            value.val.one_d = kf.aeValue;

            AEGP_KeyframeIndex kfIdx = 0;
            err = suites.KeyframeSuite4()->AEGP_InsertKeyframe(
                streamH, AEGP_LTimeMode_LayerTime, &time, &kfIdx
            );
            if (!err) {
                suites.KeyframeSuite4()->AEGP_SetKeyframeValue(
                    streamH, kfIdx, &value
                );
            }
        }
        suites.StreamSuite5()->AEGP_DisposeStream(streamH);
    }

    return err;
}
