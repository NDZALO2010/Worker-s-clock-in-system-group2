# Fetches the face-recognition ONNX models (gitignored — see FacialRecognitionService.cs)
# from the official InsightFace release so they're baked into the image.
FROM alpine:3.20 AS models
RUN apk add --no-cache curl unzip
WORKDIR /models
RUN curl -L -o buffalo_l.zip https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip \
    && unzip -o buffalo_l.zip w600k_r50.onnx det_10g.onnx \
    && mv w600k_r50.onnx insightface_arcface.onnx \
    && rm buffalo_l.zip

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish BiometricCore.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=models /models/insightface_arcface.onnx /models/det_10g.onnx ./Models/
# Disable appsettings.json hot-reload watching: it opens a FileSystemWatcher/inotify
# instance at startup, which can exceed the host's inotify limit in constrained
# container environments (observed on Render) and crash the app before it even binds.
ENV DOTNET_hostBuilder__reloadConfigOnChange=false
ENTRYPOINT ["dotnet", "BiometricCore.dll"]
