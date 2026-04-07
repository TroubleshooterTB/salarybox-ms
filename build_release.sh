#!/bin/bash
# Minimal Stroke HR ERP - Flutter Production Build Script
# Usage: chmod +x build_release.sh && ./build_release.sh

echo "🚀 Starting Production Build Pipeline..."

# 1. Clean Environment
echo "🧹 Cleaning project..."
flutter clean
flutter pub get

# 2. Code Quality Check
echo "🧪 Running tests..."
flutter test || { echo "❌ Tests failed. Build aborted."; exit 1; }

# 3. Build Android APK
echo "🤖 Building Android Release APK..."
flutter build apk --release --tree-shake-icons --obfuscate --split-debug-info=./debug-info

# 4. Build iOS (Requires macOS + Xcode)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "🍎 Building iOS Release IPA..."
  flutter build ipa --release --obfuscate --split-debug-info=./debug-info
fi

echo "✅ Build Complete! Check build/app/outputs/flutter-apk/app-release.apk"
