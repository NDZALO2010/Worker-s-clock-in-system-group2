# Fetches the face-recognition ONNX models (gitignored — see FacialRecognitionService.cs)
# from the official InsightFace release so they're baked into the image.
FROM alpine:3.20 AS models
RUN apk add --no-cache curl unzip
WORKDIR /models
RUN curl -L -o buffalo_l.zip https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip \
    && unzip -o buffalo_l.zip w600k_r50.onnx det_10g.onnx \
    && mv w600k_r50.onnx insightface_arcface.onnx \
    && rm buffalo_l.zip

# OpenCvSharp4's managed package has no Linux native binary of its own (only
# OpenCvSharp4.runtime.win ships in this project, for local Windows dev). This stage
# pulls the official prebuilt libOpenCvSharpExtern.so (OpenCvSharp maintainers' own
# image) plus every shared library it links against, so the runtime stage below doesn't
# need to compile OpenCV from source.
FROM ghcr.io/shimat/opencvsharp/ubuntu24-dotnet8-opencv4.12.0:20250815 AS opencv-libs
RUN mkdir -p /native-libs \
    && cp /usr/lib/libOpenCvSharpExtern.so /native-libs/ \
    && ldd /usr/lib/libOpenCvSharpExtern.so | awk '{print $3}' | grep '^/' | xargs -I{} cp -Ln {} /native-libs/ 2>/dev/null; true

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish BiometricCore.csproj -c Release -o /app/publish

# Ubuntu 24.04 (noble) base, matching the OS the prebuilt OpenCV native library above
# was built against — a glibc/ABI mismatch would make it fail to load.
FROM mcr.microsoft.com/dotnet/aspnet:8.0-noble AS runtime
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=models /models/insightface_arcface.onnx /models/det_10g.onnx ./Models/
COPY --from=opencv-libs /native-libs/ /usr/lib/x86_64-linux-gnu/
RUN cp /usr/lib/x86_64-linux-gnu/libOpenCvSharpExtern.so /app/ && ldconfig
# Disable appsettings.json hot-reload watching: it opens a FileSystemWatcher/inotify
# instance at startup, which can exceed the host's inotify limit in constrained
# container environments (observed on Render) and crash the app before it even binds.
ENV DOTNET_hostBuilder__reloadConfigOnChange=false
ENTRYPOINT ["dotnet", "BiometricCore.dll"]
