#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(sed -n 's/^m_EditorVersion: //p' "$ROOT/ProjectSettings/ProjectVersion.txt" | head -n 1)"
APK="$ROOT/Builds/Android/SkylineWebRunner.apk"
LOG="$ROOT/Logs/android-build.log"

print_help() {
  cat <<EOF
Usage: UNITY_PATH=/path/to/Unity $0

Builds Skyline Web Runner as a single Android APK.
Required Unity version: ${VERSION:-6000.0.40f1}
UNITY_PATH may point to the Unity executable, its Editor directory, or Unity.app.
EOF
}

[[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && { print_help; exit 0; }

resolve_unity() {
  local supplied="${UNITY_PATH:-}" candidate=""
  if [[ -n "$supplied" ]]; then
    for candidate in "$supplied" "$supplied/Unity" "$supplied/Editor/Unity" "$supplied/Contents/MacOS/Unity"; do
      [[ -x "$candidate" && ! -d "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
    done
    printf 'UNITY_PATH does not contain an executable Unity Editor: %s\n' "$supplied" >&2
    return 1
  fi

  for candidate in \
    "$(command -v Unity 2>/dev/null || true)" \
    "$(command -v unity-editor 2>/dev/null || true)" \
    "/opt/Unity/Editor/Unity" \
    "/opt/unity/Editor/Unity" \
    "$HOME/Unity/Hub/Editor/${VERSION}/Editor/Unity" \
    "/Applications/Unity/Hub/Editor/${VERSION}/Unity.app/Contents/MacOS/Unity"; do
    [[ -n "$candidate" && -x "$candidate" && ! -d "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
  done
  return 1
}

if ! UNITY="$(resolve_unity)"; then
  cat >&2 <<EOF
Unity ${VERSION:-6000.0.40f1} was not found.
Install that Editor with Android Build Support (SDK, NDK and OpenJDK), then run:
  UNITY_PATH=/absolute/path/to/Unity $0
EOF
  exit 127
fi

mkdir -p "$(dirname "$APK")" "$(dirname "$LOG")"
rm -f "$APK" # Never mistake an old artifact for a successful new build.

on_error() {
  local status=$?
  printf 'Android build failed (exit %d). Build log: %s\n' "$status" "$LOG" >&2
  [[ -f "$LOG" ]] && tail -n 80 "$LOG" >&2 || true
  exit "$status"
}
trap on_error ERR

"$UNITY" \
  -batchmode \
  -nographics \
  -quit \
  -projectPath "$ROOT" \
  -buildTarget Android \
  -executeMethod ProjectBootstrap.BuildAndroid \
  -logFile "$LOG"

if [[ ! -s "$APK" ]]; then
  echo "Unity exited successfully but did not create a non-empty APK. See: $LOG" >&2
  exit 1
fi

magic="$(od -An -tx1 -N4 "$APK" | tr -d ' \n')"
if [[ "$magic" != "504b0304" ]]; then
  echo "Build output is not an APK/ZIP container (magic: $magic). See: $LOG" >&2
  exit 1
fi

trap - ERR
echo "APK: $APK"
if command -v sha256sum >/dev/null 2>&1; then sha256sum "$APK"; else shasum -a 256 "$APK"; fi
