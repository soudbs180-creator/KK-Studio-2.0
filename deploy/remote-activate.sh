#!/bin/sh
set -eu

# Activate one immutable static release. This script never removes an external
# directory and never starts the provider or generation gateway.
ROOT=${1:?remote root is required}
RELEASE=${2:?release id is required}
ARCHIVE=${3:?archive path is required}
EXPECTED_SHA=${4:?expected archive SHA-256 is required}

case "$ROOT" in
  /*) ;;
  *) echo "root must be absolute" >&2; exit 2 ;;
esac
ROOT=$(cd -P "$ROOT" && pwd -P) || {
  echo "root does not exist" >&2
  exit 2
}
if [ "$ROOT" = / ] || [ "$ROOT" = // ]; then
  echo "root must not be /" >&2
  exit 2
fi

case "$RELEASE" in
  ''|*[!A-Za-z0-9._-]*) echo "invalid release id" >&2; exit 2 ;;
esac
case "$EXPECTED_SHA" in
  *[!a-f0-9]*|'') echo "invalid archive SHA-256" >&2; exit 2 ;;
esac
if [ "${#EXPECTED_SHA}" -ne 64 ]; then
  echo "invalid archive SHA-256" >&2
  exit 2
fi

BASE="$ROOT/releases/$RELEASE"
TEMP="$ROOT/releases/.incoming-$RELEASE-$$"
CURRENT="$ROOT/current"
PREVIOUS="$ROOT/previous"
LOCK="$ROOT/.release.lock"
if [ -L "$LOCK" ]; then
  echo "release lock is a symlink; refusing activation" >&2
  exit 3
fi
exec 9>>"$LOCK"
flock -x 9

if [ -L "$ROOT/releases" ] || [ -L "$ROOT/incoming" ]; then
  echo "release directories must not be symlinks" >&2
  exit 3
fi
if [ -e "$PREVIOUS" ] && [ ! -L "$PREVIOUS" ]; then
  echo "previous is not a symlink; refusing activation" >&2
  exit 3
fi

if [ -e "$BASE" ] || [ -L "$BASE" ]; then
  echo "release already exists: $RELEASE" >&2
  exit 3
fi
actual_sha=$(sha256sum "$ARCHIVE" | cut -d ' ' -f 1)
if [ "$actual_sha" != "$EXPECTED_SHA" ]; then
  echo "archive SHA-256 changed before activation" >&2
  exit 3
fi
mkdir -p "$ROOT/releases" "$ROOT/incoming" "$TEMP"
tar -xzf "$ARCHIVE" -C "$TEMP"
test -f "$TEMP/index.html"
test -f "$TEMP/manifest.json"
test -f "$TEMP/manifest.sha256"
(cd "$TEMP" && sha256sum -c manifest.sha256)
mv "$TEMP" "$BASE"

if [ -L "$CURRENT" ]; then
  old_target=$(readlink "$CURRENT")
elif [ -e "$CURRENT" ]; then
  echo "current exists but is not a symlink; refusing to replace it" >&2
  exit 4
fi
next_link="$ROOT/.current.$$"
next_previous="$ROOT/.previous-activate-$$"
if [ -e "$next_link" ] || [ -L "$next_link" ] ||
   [ -e "$next_previous" ] || [ -L "$next_previous" ]; then
  echo "temporary release path already exists" >&2
  exit 4
fi
trap 'rm -f "$next_link" "$next_previous"' 0
trap 'exit 1' 1 2 3 15
ln -s "releases/$RELEASE" "$next_link"
if [ -n "${old_target:-}" ]; then
  ln -s "$old_target" "$next_previous"
  mv -Tf "$next_previous" "$PREVIOUS"
fi
mv -Tf "$next_link" "$CURRENT"
echo "activated $RELEASE"
