#pragma once

// Adobe After Effects SDK headers
// (must be present in include/AE_SDK/ — not committed to repo)
#include "AEConfig.h"
#include "entry.h"
#include "AE_GeneralPlug.h"
#include "AE_Macros.h"
#include "AEGP_SuiteHandler.h"
#include "AE_AdvEffectSuites.h"

#include <string>
#include <vector>

// ─── Plugin entry point ───────────────────────────────────────────────────────
extern "C" DllExport A_Err EntryPointFunc(
    struct SPBasicSuite*    pica_basicP,
    A_long                  major_versionL,
    A_long                  minor_versionL,
    AEGP_PluginID           aegp_plugin_id,
    AEGP_GlobalRefcon*      global_refconV
);

// ─── Plugin global state ──────────────────────────────────────────────────────
struct KinetiaGlobal {
    AEGP_PluginID       pluginId    = 0;
    AEGP_Command        importCmd   = 0;
    AEGP_Command        openPanelCmd= 0;
    SPBasicSuite*       pica        = nullptr;
};

extern KinetiaGlobal gKinetia;

// ─── Constants ────────────────────────────────────────────────────────────────
constexpr A_long KINETIA_MAJOR_VERSION = 1;
constexpr A_long KINETIA_MINOR_VERSION = 0;
constexpr char   KINETIA_PLUGIN_NAME[] = "Kinetia";
constexpr char   KINETIA_MENU_LABEL_IMPORT[]    = "Import Kinetia Package...";
constexpr char   KINETIA_MENU_LABEL_PANEL[]     = "Open Kinetia Panel";
