#!/bin/sh
set -eu

# Activate one immutable static release. This script never removes an external
# directory and never starts the provider or generation gateway.
ROOT=${1:?remote root is required}
RELEASE=${2:?release id is required}
ARCHIVE=${3:?archive path is required}

case "$ROOT" in
  /*) ;;
  *) echo "root must be absolute" >&2; exit 2 ;;
esac
ROOT=$(cd -P "$ROOT" && pwd -P) || {
  echo "root does not exist" >&2
  exit 2
}
if [ "$ROOT" = / ]; then
  echo "root must not be /" >&2
  exit 2
fi

case "$RELEASE" in
  ''|*[!A-Za-z0-9._-]*) echo "invalid release id" >&2; exit 2 ;;
esac

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

if [ -e "$BASE" ] || [ -L "$BASE" ]; then
  echo "release already exists: $RELEASE" >&2
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
  if [ -n "$old_target" ]; then
    ln -sfn "$old_target" "$PREVIOUS"
  fi
elif [ -e "$CURRENT" ]; then
  echo "current exists but is not a symlink; refusing to replace it" >&2
  exit 4
fi
next_link="$ROOT/.current.$$"
ln -s "releases/$RELEASE" "$next_link"
mv -Tf "$next_link" "$CURRENT"
echo "activated $RELEASE"
