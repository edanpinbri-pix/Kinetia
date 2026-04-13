/**
 * KinetiaPlugin.cpp
 * AEGP entry point. Registers menu commands and hooks.
 *
 * Requires: Adobe After Effects SDK headers in include/AE_SDK/
 * Build with CMakeLists.txt using cmake --build build/
 */

#include "KinetiaPlugin.h"
#include "CompositionBuilder.h"
#include "AEGP_SuiteHandler.h"

KinetiaGlobal gKinetia;

static A_Err IdleHook(
    AEGP_GlobalRefcon   /*global_refcon*/,
    AEGP_IdleRefcon     /*idle_refcon*/,
    A_long*             max_sleepPL)
{
    *max_sleepPL = 500;  // ms between idle calls
    return A_Err_NONE;
}

static A_Err CommandHook(
    AEGP_GlobalRefcon   /*global_refcon*/,
    AEGP_CommandRefcon  /*command_refcon*/,
    AEGP_Command        command,
    AEGP_HookPriority   /*priority*/,
    A_Boolean           /*already_handledB*/,
    A_Boolean*          handledPB)
{
    A_Err err = A_Err_NONE;
    *handledPB = FALSE;

    AEGP_SuiteHandler suites(gKinetia.pica);

    if (command == gKinetia.importCmd) {
        *handledPB = TRUE;
        // Open native file picker for .kinetia packages
        // Full implementation: Sprint 6
        AEGP_MemHandle  nameH = nullptr;
        // TODO: show file dialog, call CompositionBuilder::buildFromPackage()
        err = suites.UtilitySuite3()->AEGP_WriteToOSConsole(
            "[Kinetia] Import command triggered"
        );
    } else if (command == gKinetia.openPanelCmd) {
        *handledPB = TRUE;
        // Open UXP panel
        // TODO: launch panel via AEGP_ExecuteScript or UXP host
        err = suites.UtilitySuite3()->AEGP_WriteToOSConsole(
            "[Kinetia] Open panel command triggered"
        );
    }

    return err;
}

static A_Err UpdateMenuHook(
    AEGP_GlobalRefcon   /*global_refcon*/,
    AEGP_UpdateMenuRefcon /*refcon*/,
    AEGP_WindowType     /*active_window*/)
{
    A_Err err = A_Err_NONE;
    AEGP_SuiteHandler suites(gKinetia.pica);

    // Enable both commands whenever the plugin is loaded
    ERR(suites.CommandSuite1()->AEGP_EnableCommand(gKinetia.importCmd));
    ERR(suites.CommandSuite1()->AEGP_EnableCommand(gKinetia.openPanelCmd));

    return err;
}

A_Err EntryPointFunc(
    struct SPBasicSuite*    pica_basicP,
    A_long                  major_versionL,
    A_long                  minor_versionL,
    AEGP_PluginID           aegp_plugin_id,
    AEGP_GlobalRefcon*      global_refconV)
{
    A_Err err = A_Err_NONE;

    gKinetia.pica      = pica_basicP;
    gKinetia.pluginId  = aegp_plugin_id;

    AEGP_SuiteHandler suites(pica_basicP);

    // Register menu commands
    ERR(suites.CommandSuite1()->AEGP_GetUniqueCommand(&gKinetia.importCmd));
    ERR(suites.CommandSuite1()->AEGP_GetUniqueCommand(&gKinetia.openPanelCmd));

    ERR(suites.CommandSuite1()->AEGP_InsertMenuCommand(
        gKinetia.importCmd,
        KINETIA_MENU_LABEL_IMPORT,
        AEGP_Menu_FILE,
        AEGP_MENU_INSERT_SORTED
    ));

    ERR(suites.CommandSuite1()->AEGP_InsertMenuCommand(
        gKinetia.openPanelCmd,
        KINETIA_MENU_LABEL_PANEL,
        AEGP_Menu_WINDOW,
        AEGP_MENU_INSERT_SORTED
    ));

    // Register hooks
    ERR(suites.RegisterSuite5()->AEGP_RegisterCommandHook(
        aegp_plugin_id,
        AEGP_HP_BeforeAE,
        AEGP_Command_ALL,
        CommandHook,
        nullptr
    ));

    ERR(suites.RegisterSuite5()->AEGP_RegisterUpdateMenuHook(
        aegp_plugin_id,
        UpdateMenuHook,
        nullptr
    ));

    ERR(suites.RegisterSuite5()->AEGP_RegisterIdleHook(
        aegp_plugin_id,
        IdleHook,
        nullptr
    ));

    return err;
}
