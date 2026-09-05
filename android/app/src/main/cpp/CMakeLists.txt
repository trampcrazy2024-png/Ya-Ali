cmake_minimum_required(VERSION 3.22.1)
project(yaali_llama_jni LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
set(LLAMA_CURL OFF CACHE BOOL "" FORCE)
set(LLAMA_OPENSSL OFF CACHE BOOL "" FORCE)
set(GGML_RPC OFF CACHE BOOL "" FORCE)
set(GGML_CCACHE OFF CACHE BOOL "" FORCE)

include(FetchContent)
FetchContent_Declare(
  llama
  GIT_REPOSITORY https://github.com/ggml-org/llama.cpp.git
  GIT_TAG b10516
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(llama)

add_library(yaali_llama_jni SHARED yaali_llama_jni.cpp)
target_include_directories(yaali_llama_jni PRIVATE ${llama_SOURCE_DIR}/include ${llama_SOURCE_DIR}/ggml/include)
target_link_libraries(yaali_llama_jni PRIVATE llama log android)
target_compile_definitions(yaali_llama_jni PRIVATE ANDROID=1)
# Explicit 16 KB ELF page alignment for Android 15/16 class devices; NDK r28 also enables this by default.
target_link_options(yaali_llama_jni PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")
