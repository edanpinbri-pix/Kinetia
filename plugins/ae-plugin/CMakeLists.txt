cmake_minimum_required(VERSION 3.20)
project(KinetiaAEPlugin VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ─── Adobe After Effects SDK ──────────────────────────────────────────────────
# Place SDK headers in include/AE_SDK/ (not committed to repo).
# Download from: https://developer.adobe.com/after-effects/
set(AE_SDK_DIR "${CMAKE_CURRENT_SOURCE_DIR}/include/AE_SDK")

# ─── RapidJSON (header-only) ─────────────────────────────────────────────────
# Fetched via FetchContent at configure time
include(FetchContent)
FetchContent_Declare(
  rapidjson
  GIT_REPOSITORY https://github.com/Tencent/rapidjson.git
  GIT_TAG        ab1842a2dae061284c0a62dca1cc6d5e7e37e346
  GIT_SHALLOW    ON
)
FetchContent_MakeAvailable(rapidjson)

# ─── Plugin target ───────────────────────────────────────────────────────────
add_library(KinetiaAEPlugin SHARED
  src/KinetiaPlugin.cpp
  src/MicroJsonParser.cpp
  src/CompositionBuilder.cpp
  src/ExpressionInjector.cpp
  src/PrecompManager.cpp
)

target_include_directories(KinetiaAEPlugin PRIVATE
  ${AE_SDK_DIR}/Headers
  ${AE_SDK_DIR}/Headers/SP
  ${AE_SDK_DIR}/Resources
  ${rapidjson_SOURCE_DIR}/include
  src/
)

target_compile_definitions(KinetiaAEPlugin PRIVATE
  $<$<PLATFORM_ID:Windows>:WIN32>
  $<$<PLATFORM_ID:Darwin>:OSX>
)

# macOS: output as .plugin bundle
if(APPLE)
  set_target_properties(KinetiaAEPlugin PROPERTIES
    BUNDLE TRUE
    BUNDLE_EXTENSION plugin
    MACOSX_BUNDLE_GUI_IDENTIFIER com.kitifica.kinetia.ae-plugin
    OUTPUT_NAME "Kinetia"
    SUFFIX ""
  )
endif()

# Windows: output as .aex
if(WIN32)
  set_target_properties(KinetiaAEPlugin PROPERTIES
    SUFFIX ".aex"
  )
endif()
