#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$ROOT/dist/output"
OUTPUT_RESOURCE="$ROOT/dist/output_resource"
OUTPUT_STATIC="$ROOT/dist/output_static"
SITE_OUTPUT="$ROOT/dist/site"

export NODE_ENV="${NODE_ENV:-production}"

# 清理
rm -rf "$ROOT/dist"

# 1. 独立静态构建。避免妙搭托管模板注入未解析的 {{appName}} 等占位符。
npx vite build --config "$ROOT/vite.standalone.config.ts" --outDir "$SITE_OUTPUT" --emptyOutDir

# 2. HTML → dist/output/
mkdir -p "$OUTPUT"
find "$SITE_OUTPUT" -maxdepth 1 \( -name '*.html' -o -name 'routes.json' \) -exec cp {} "$OUTPUT/" \;

# 3. assets/ → dist/output_resource/（JS/CSS/字体，上传到 CDN）
if [ -d "$SITE_OUTPUT/assets" ]; then
  mkdir -p "$OUTPUT_RESOURCE"
  cp -r "$SITE_OUTPUT/assets" "$OUTPUT_RESOURCE/"
fi

# 4. 私有静态资源 → dist/output_static/（排除代码文件）
if [ -d "$ROOT/shared/static" ]; then
  mkdir -p "$OUTPUT_STATIC"
  rsync -a --exclude='*.ts' --exclude='*.tsx' --exclude='*.js' --exclude='*.jsx' "$ROOT/shared/static/" "$OUTPUT_STATIC/"
fi

# 5. capability 配置 → dist/output_capabilities/
if [ -d "$ROOT/shared/capabilities" ]; then
  mkdir -p "$ROOT/dist/output_capabilities"
  cp -r "$ROOT/shared/capabilities/." "$ROOT/dist/output_capabilities/"
fi

echo "Build complete"
echo "  Static site  → dist/site/"
echo "  HTML         → dist/output/"
[ -d "$OUTPUT_RESOURCE" ] && echo "  Resource     → dist/output_resource/" || true
[ -d "$OUTPUT_STATIC" ] && echo "  Static       → dist/output_static/" || true
[ -d "$ROOT/dist/output_capabilities" ] && echo "  Capabilities → dist/output_capabilities/" || true
