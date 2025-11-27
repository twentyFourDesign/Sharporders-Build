if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/apple/.gradle/caches/8.13/transforms/2558f87470e54cc7198cb67afc9f3898/transformed/hermes-android-0.78.1-release/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/apple/.gradle/caches/8.13/transforms/2558f87470e54cc7198cb67afc9f3898/transformed/hermes-android-0.78.1-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

