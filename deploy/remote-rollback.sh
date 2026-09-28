#!/bin/sh
set -eu

# Roll back only this static Web release root. Persistent data is not touched.
ROOT=${1:?remote root is required}
EXPECTED=${2:?expected current release is required}
TARGET=${3:?target release is required}

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
for release in "$EXPECTED" "$TARGET"; do
  case "$release" in
    ''|.|..|*[!A-Za-z0-9._-]*) echo "invalid release id" >&2; exit 2 ;;
  esac
done
if [ "$EXPECTED" = "$TARGET" ]; then
  echo "target already current" >&2
  exit 2
fi

CURRENT="$ROOT/current"
PREVIOUS="$ROOT/previous"
BASE="$ROOT/releases/$TARGET"
LOCK="$ROOT/.release.lock"
if [ -L "$LOCK" ]; then
  echo "release lock is a symlink; refusing rollback" >&2
  exit 3
fi
exec 9>>"$LOCK"
flock -x 9
if [ ! -L "$CURRENT" ] || [ "$(readlink "$CURRENT")" != "releases/$EXPECTED" ]; then
  echo "current release changed; refusing rollback" >&2
  exit 3
fi
if [ -e "$PREVIOUS" ] && [ ! -L "$PREVIOUS" ]; then
  echo "previous is not a symlink; refusing rollback" >&2
  exit 3
fi
if [ ! -d "$BASE" ] || [ -L "$BASE" ] ||
   [ ! -f "$BASE/index.html" ] || [ -L "$BASE/index.html" ] ||
   [ ! -f "$BASE/manifest.sha256" ] || [ -L "$BASE/manifest.sha256" ]; then
  echo "target release is missing or unsafe" >&2
  exit 3
fi
(cd "$BASE" && sha256sum -c manifest.sha256 >/dev/null)

next_current="$ROOT/.current-rollback-$$"
next_previous="$ROOT/.previous-rollback-$$"
if [ -e "$next_current" ] || [ -L "$next_current" ] ||
   [ -e "$next_previous" ] || [ -L "$next_previous" ]; then
  echo "temporary rollback path already exists" >&2
  exit 3
fi
trap 'rm -f "$next_current" "$next_previous"' 0
trap 'exit 1' 1 2 3 15
ln -s "releases/$TARGET" "$next_current"
ln -s "releases/$EXPECTED" "$next_previous"
mv -Tf "$next_previous" "$PREVIOUS"
mv -Tf "$next_current" "$CURRENT"
echo "rolled back $EXPECTED to $TARGET"
