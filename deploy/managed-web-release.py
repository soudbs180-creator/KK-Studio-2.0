#!/usr/bin/env python3
"""Restricted SSH command: receive <release-id> <archive-sha256>.

Install this file outside the deploy user's writable tree. authorized_keys must
use restrict,command="/usr/bin/python3 /usr/local/lib/kk-managed-web-release.py".
The user owns only /var/www/kk-studio-next; no sudo or application data access.
Local operator rollback: managed-web-release.py rollback <current-id> <target-id>.
Local one-time adoption: adopt <release-id> <source-commit> <web-version>.
Only local tests may use --test-root (inside the OS temp directory) and
--health-fixture (a local directory replacing HTTPS responses).
"""
import argparse
import gzip
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import stat
import sys
import tarfile
import tempfile
import urllib.parse
import urllib.request
import uuid
from contextlib import contextmanager

ROOT = Path("/var/www/kk-studio-next")
ORIGIN = "https://kkai.plus/"
KIND = "kk-studio-managed-web"
MARKER = ".kk-managed-web.json"
ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}\Z")
SHA = re.compile(r"[a-f0-9]{64}\Z")
MAX_ARCHIVE = 128 * 1024 * 1024
MAX_TOTAL = 512 * 1024 * 1024
MAX_FILE = 128 * 1024 * 1024
MAX_ENTRIES = 25000
MAX_TAR = MAX_TOTAL + MAX_ENTRIES * 1024 + 10240
MAX_METADATA = MAX_ENTRIES * 512 + 4 * 1024 * 1024
READ_CHUNK = 64 * 1024


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def ordinary(path, directory=False):
    info = path.lstat()
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode) and info.st_nlink == 1,
            "Not an ordinary " + ("directory: " if directory else "file: ") + str(path))
    return info


def canonical_directory(path):
    require(path.is_absolute() and path != Path(path.anchor), "Unsafe root")
    require(path.resolve() == path, "Root must be canonical without symlinks")
    ordinary(path, True)
    return path


def safe_name(name):
    require(isinstance(name, str) and name and "\\" not in name and
            not re.search(r"[\x00-\x1f\x7f]", name), "Unsafe archive path")
    value = PurePosixPath(name)
    require(not value.is_absolute() and all(part not in ("", ".", "..") for part in name.split("/")) and
            str(value) == name, "Unsafe archive path")
    require(name == "manifest.json" or name == "dist" or name.startswith("dist/"), "Unexpected archive root")
    return name


def json_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


def read_json(path):
    require(ordinary(path).st_size <= 4 * 1024 * 1024, "JSON exceeds size limit")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=json_object)


def validate_release(base, release_id, archive_hash=None, adopted=False, legacy_hash=None):
    ordinary(base, True)
    manifest = read_json(base / "manifest.json")
    require(isinstance(manifest, dict) and set(manifest) == {"schemaVersion", "kind", "releaseId", "sourceCommit", "webVersion", "files"}, "Invalid manifest fields")
    require(manifest["schemaVersion"] == 1 and manifest["kind"] == KIND and manifest["releaseId"] == release_id and
            re.fullmatch(r"[a-f0-9]{40}", str(manifest["sourceCommit"])) and re.fullmatch(r"\d+\.\d+\.\d+", str(manifest["webVersion"])), "Invalid manifest identity")
    require(isinstance(manifest["files"], list) and len(manifest["files"]) <= MAX_ENTRIES, "Invalid manifest file list")
    records = {}
    total = 0
    for record in manifest["files"]:
        require(isinstance(record, dict) and set(record) == {"path", "bytes", "sha256"}, "Invalid file record")
        name = safe_name(record["path"])
        require(name.startswith("dist/") and name not in records and type(record["bytes"]) is int and
                0 <= record["bytes"] <= MAX_FILE and isinstance(record["sha256"], str) and SHA.fullmatch(record["sha256"]), "Invalid or duplicate file record")
        total += record["bytes"]
        require(total <= MAX_TOTAL, "Release exceeds size limit")
        records[name] = record
    require("dist/index.html" in records and "dist/build-info.json" in records, "Missing entrypoint or build identity")
    actual = set()
    for directory, dirs, files in os.walk(base, followlinks=False):
        for name in dirs:
            child = Path(directory) / name
            ordinary(child, True)
            relative = child.relative_to(base).as_posix()
            require(relative == "dist" or relative.startswith("dist/"), "Unexpected release directory")
        for name in files:
            file = Path(directory) / name
            relative = file.relative_to(base).as_posix()
            info = ordinary(file)
            if relative in ("manifest.json", MARKER):
                continue
            if relative == "release-manifest.json" and adopted and digest(file.read_bytes()) == legacy_hash:
                continue
            require(relative in records and info.st_size == records[relative]["bytes"] and
                    digest(file.read_bytes()) == records[relative]["sha256"], "File hash or inventory mismatch: " + relative)
            actual.add(relative)
    require(actual == set(records), "Missing manifest file")
    identity = {key: value for key, value in manifest.items() if key != "files"}
    require(read_json(base / "dist/build-info.json") == identity, "Build identity mismatch")
    if archive_hash is not None or adopted:
        marker = read_json(base / MARKER)
        expected_marker = {"schemaVersion": 1, "kind": KIND, "releaseId": release_id,
                           "archiveSha256": archive_hash, "manifestSha256": digest((base / "manifest.json").read_bytes())}
        if adopted:
            expected_marker.update(adopted=True, legacyManifestSha256=legacy_hash)
        require(marker == expected_marker, "Invalid managed release marker")
    return manifest


def managed(base):
    try:
        marker = read_json(base / MARKER)
        require(isinstance(marker, dict), "Invalid marker")
        adopted = marker.get("adopted") is True
        require((adopted and marker.get("archiveSha256") is None) or SHA.fullmatch(str(marker.get("archiveSha256", ""))), "Invalid marker hash")
        legacy_hash = marker.get("legacyManifestSha256")
        require(legacy_hash is None or SHA.fullmatch(str(legacy_hash)), "Invalid legacy metadata hash")
        validate_release(base, base.name, marker["archiveSha256"], adopted, legacy_hash)
        return marker
    except (OSError, ValueError, TypeError, KeyError):
        return None


@contextmanager
def locked(root):
    lock = root / ".managed-web.lock"
    fd = os.open(lock, os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600)
    try:
        require(stat.S_ISREG(os.fstat(fd).st_mode) and os.fstat(fd).st_nlink == 1, "Unsafe lock file")
        if os.name == "nt":
            import msvcrt
            os.write(fd, b"0")
            os.lseek(fd, 0, 0)
            msvcrt.locking(fd, msvcrt.LK_LOCK, 1)
        else:
            import fcntl
            fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


def pointer(root, name):
    file = root / name
    if not file.is_symlink():
        require(not file.exists(), name + " is not a symlink")
        return None
    target = os.readlink(file).replace("\\", "/")
    match = re.fullmatch(r"releases/([A-Za-z0-9][A-Za-z0-9._-]{0,63})", target)
    require(match is not None, "Unsafe " + name + " pointer")
    base = root / "releases" / match[1]
    require(managed(base) is not None, "Pointer target is not a valid managed release")
    return target


def set_pointer(root, name, target):
    if target is None:
        (root / name).unlink(missing_ok=True)
        return
    temporary = root / ("." + name + "-" + uuid.uuid4().hex)
    try:
        temporary.symlink_to(target, target_is_directory=True)
        os.replace(temporary, root / name)
    finally:
        temporary.unlink(missing_ok=True)


class EntryAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = set()

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if tag == "script" and values.get("src"):
            self.assets.add(values["src"])
        if tag == "link" and "stylesheet" in values.get("rel", "").split() and values.get("href"):
            self.assets.add(values["href"])


def health(base, manifest, fixture=None):
    files = {record["path"]: record for record in manifest["files"]}
    parser = EntryAssets()
    parser.feed((base / "dist/index.html").read_text(encoding="utf-8"))
    names = {"index.html", "build-info.json"}
    for asset in parser.assets:
        url = urllib.parse.urlsplit(asset)
        require(not url.scheme and not url.netloc and not url.query and not url.fragment, "Entrypoint asset must be local")
        name = urllib.parse.unquote(url.path).lstrip("/")
        safe_name("dist/" + name)
        require("dist/" + name in files, "Entrypoint asset absent from manifest")
        names.add(name)
    require(any(name.endswith(".js") for name in names) and any(name.endswith(".css") for name in names), "Missing main JS/CSS")
    token = uuid.uuid4().hex
    for name in sorted(names):
        record = files["dist/" + name]
        if fixture:
            actual = (fixture / name).read_bytes()
        else:
            url = ORIGIN + ("" if name == "index.html" else urllib.parse.quote(name, safe="/")) + "?kk_release=" + token
            request = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Accept-Encoding": "identity"})
            with urllib.request.urlopen(request, timeout=20) as response:
                require(response.status == 200 and urllib.parse.urlsplit(response.url).netloc == "kkai.plus" and
                        urllib.parse.urlsplit(response.url).scheme == "https", "Invalid health response")
                actual = response.read(record["bytes"] + 1)
        require(len(actual) == record["bytes"] and digest(actual) == record["sha256"], "HTTPS health hash mismatch: " + name)


class TarBudgetReader:
    def __init__(self, source):
        self.source = source
        self.metadata = True
        self.metadata_bytes = 0

    def read(self, size):
        require(0 <= size <= READ_CHUNK, "Tar metadata read exceeds size limit")
        if self.metadata:
            require(self.metadata_bytes + size <= MAX_METADATA, "Tar metadata exceeds total limit")
        content = self.source.read(size)
        if self.metadata:
            self.metadata_bytes += len(content)
        return content

    def seek(self, offset, whence=0):
        return self.source.seek(offset, whence)

    def tell(self):
        return self.source.tell()


@contextmanager
def bounded_tar(archive):
    # Decompress under a hard whole-stream budget before tarfile parses hidden headers.
    with tempfile.TemporaryFile() as expanded:
        total = 0
        with gzip.open(archive, "rb") as compressed:
            while True:
                chunk = compressed.read(min(READ_CHUNK, MAX_TAR - total + 1))
                if not chunk:
                    break
                total += len(chunk)
                require(total <= MAX_TAR, "Expanded archive exceeds size limit")
                expanded.write(chunk)
        expanded.seek(0)
        yield TarBudgetReader(expanded)


def unpack(archive, stage):
    seen = set()
    total = 0
    with bounded_tar(archive) as reader, tarfile.open(fileobj=reader, mode="r:") as contents:
        for member in contents:
            name = safe_name(member.name.removesuffix("/") if member.isdir() else member.name)
            require(name not in seen and len(seen) < MAX_ENTRIES, "Duplicate or excessive archive entries")
            seen.add(name)
            require((member.isdir() or member.isfile()) and not member.issym() and not member.islnk() and member.sparse is None and
                    set(member.pax_headers) <= {"path", "size", "mtime", "atime", "ctime", "hdrcharset"},
                    "Unsupported archive entry")
            require(0 <= member.size <= MAX_FILE and (member.isfile() or member.size == 0), "Archive file exceeds size limit")
            total += member.size
            require(total <= MAX_TOTAL, "Archive exceeds size limit")
            file = stage / name
            if member.isdir():
                require(name == "dist" or name.startswith("dist/"), "Unexpected directory")
                file.mkdir(parents=True, exist_ok=True)
            else:
                require(name != "dist", "dist must be a directory")
                file.parent.mkdir(parents=True, exist_ok=True)
                reader.metadata = False
                try:
                    with contents.extractfile(member) as source, file.open("xb") as target:
                        shutil.copyfileobj(source, target, READ_CHUNK)
                finally:
                    reader.metadata = True
                file.chmod(0o644)


def cleanup(root, keep):
    for base in (root / "releases").iterdir():
        if base.name not in keep and ID.fullmatch(base.name) and managed(base):
            # Only a fully revalidated managed static tree is eligible for removal.
            shutil.rmtree(base)


def receive(root, release_id, expected, stream, dry_run=False, fixture=None):
    require(ID.fullmatch(release_id) and SHA.fullmatch(expected), "Invalid receive identity")
    releases = root / "releases"
    if not releases.exists():
        releases.mkdir()
    ordinary(releases, True)
    current = pointer(root, "current")
    previous = pointer(root, "previous")
    stage = Path(tempfile.mkdtemp(prefix=".incoming-", dir=releases))
    archive = stage / "archive.tar.gz"
    try:
        size = 0
        checksum = hashlib.sha256()
        with archive.open("xb") as target:
            while True:
                chunk = stream.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                require(size <= MAX_ARCHIVE, "Compressed archive exceeds size limit")
                checksum.update(chunk)
                target.write(chunk)
        require(checksum.hexdigest() == expected, "Archive SHA-256 mismatch")
        extracted = stage / "release"
        extracted.mkdir()
        unpack(archive, extracted)
        manifest = validate_release(extracted, release_id)
        if current:
            active = read_json(root / current / "manifest.json")
            require(tuple(map(int, manifest["webVersion"].split("."))) >= tuple(map(int, active["webVersion"].split("."))),
                    "Receive cannot downgrade current webVersion; use explicit operator rollback")
        marker = {"schemaVersion": 1, "kind": KIND, "releaseId": release_id, "archiveSha256": expected,
                  "manifestSha256": digest((extracted / "manifest.json").read_bytes())}
        (extracted / MARKER).write_text(json.dumps(marker) + "\n", encoding="utf-8")
        destination = releases / release_id
        if destination.exists() or destination.is_symlink():
            require(managed(destination) == marker, "Release ID already exists with different or unmanaged content")
        elif not dry_run:
            extracted.rename(destination)
        if dry_run:
            print("validated " + release_id)
            return
        target = "releases/" + release_id
        try:
            if current != target:
                set_pointer(root, "previous", current)
            set_pointer(root, "current", target)
            health(destination, manifest, fixture)
        except BaseException:
            set_pointer(root, "current", current)
            set_pointer(root, "previous", previous)
            raise
        keep = {release_id}
        retained = current if current != target else previous
        if retained:
            keep.add(PurePosixPath(retained).parts[1])
        cleanup(root, keep)
        print("activated " + release_id)
    finally:
        shutil.rmtree(stage)


def rollback(root, expected, target, fixture=None):
    require(ID.fullmatch(expected) and ID.fullmatch(target) and expected != target, "Invalid rollback identity")
    current = pointer(root, "current")
    previous = pointer(root, "previous")
    require(current == "releases/" + expected and previous == "releases/" + target, "Rollback requires current and previous identities")
    base = root / "releases" / target
    marker = managed(base)
    require(marker is not None, "Unsafe rollback release")
    manifest = validate_release(base, target, marker["archiveSha256"], marker.get("adopted") is True, marker.get("legacyManifestSha256"))
    try:
        set_pointer(root, "previous", current)
        set_pointer(root, "current", previous)
        health(base, manifest, fixture)
    except BaseException:
        set_pointer(root, "current", current)
        set_pointer(root, "previous", previous)
        raise
    print("rolled back " + expected + " to " + target)


def adopt(root, release_id, source_commit, web_version):
    require(ID.fullmatch(release_id) and re.fullmatch(r"[a-f0-9]{40}", source_commit) and re.fullmatch(r"\d+\.\d+\.\d+", web_version), "Invalid adoption identity")
    ordinary(root / "releases", True)
    base = root / "releases" / release_id
    ordinary(base, True)
    ordinary(base / "dist", True)
    require({entry.name for entry in base.iterdir()} <= {"dist", "release-manifest.json"}, "Adoption requires an unmanaged static release")
    legacy = base / "release-manifest.json"
    legacy_hash = digest(legacy.read_bytes()) if legacy.exists() and ordinary(legacy) else None
    files = []
    for directory, dirs, names in os.walk(base / "dist", followlinks=False):
        for name in dirs:
            ordinary(Path(directory) / name, True)
        for name in names:
            file = Path(directory) / name
            info = ordinary(file)
            relative = safe_name(file.relative_to(base).as_posix())
            require(info.st_size <= MAX_FILE, "Adoption file exceeds size limit")
            files.append({"path": relative, "bytes": info.st_size, "sha256": digest(file.read_bytes())})
    require(not (base / "dist/build-info.json").exists(), "Adoption will not overwrite existing build identity")
    require(any(file["path"] == "dist/index.html" for file in files) and len(files) < MAX_ENTRIES and sum(file["bytes"] for file in files) <= MAX_TOTAL, "Invalid adoption static inventory")
    identity = {"schemaVersion": 1, "kind": KIND, "releaseId": release_id, "sourceCommit": source_commit, "webVersion": web_version}
    build = (json.dumps(identity) + "\n").encode()
    files.append({"path": "dist/build-info.json", "bytes": len(build), "sha256": digest(build)})
    content = (json.dumps({**identity, "files": sorted(files, key=lambda file: file["path"])}) + "\n").encode()
    marker = {"schemaVersion": 1, "kind": KIND, "releaseId": release_id, "archiveSha256": None,
              "manifestSha256": digest(content), "adopted": True, "legacyManifestSha256": legacy_hash}
    created = []
    try:
        for name, data in (("dist/build-info.json", build), ("manifest.json", content), (MARKER, (json.dumps(marker) + "\n").encode())):
            with (base / name).open("xb") as file:
                file.write(data)
            created.append(base / name)
        require(managed(base) == marker, "Adoption verification failed")
    except BaseException:
        for file in reversed(created):
            file.unlink()
        raise
    print("adopted " + release_id)


def main():
    os.umask(0o022)
    def interrupted(_signal, _frame):
        raise InterruptedError("Deployment interrupted")
    signal.signal(signal.SIGTERM, interrupted)
    if hasattr(signal, "SIGHUP"):
        signal.signal(signal.SIGHUP, interrupted)
    if "SSH_ORIGINAL_COMMAND" in os.environ:
        require(len(sys.argv) == 1, "SSH cannot override controller options")
        match = re.fullmatch(r"receive ([A-Za-z0-9][A-Za-z0-9._-]{0,63}) ([a-f0-9]{64})", os.environ["SSH_ORIGINAL_COMMAND"])
        require(match is not None, "SSH command is not permitted")
        args = argparse.Namespace(command="receive", release_id=match[1], sha256=match[2], dry_run=False, health_fixture=None, test_root=None)
    else:
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("--test-root", type=Path)
        parser.add_argument("--health-fixture", type=Path)
        commands = parser.add_subparsers(dest="command", required=True)
        incoming = commands.add_parser("receive")
        incoming.add_argument("release_id")
        incoming.add_argument("sha256")
        incoming.add_argument("--dry-run", action="store_true")
        back = commands.add_parser("rollback")
        back.add_argument("expected")
        back.add_argument("target")
        existing = commands.add_parser("adopt")
        existing.add_argument("release_id")
        existing.add_argument("source_commit")
        existing.add_argument("web_version")
        args = parser.parse_args()
    root = ROOT
    if args.test_root:
        root = canonical_directory(args.test_root.absolute())
        require(root.is_relative_to(Path(tempfile.gettempdir()).resolve()) and root.name.startswith("kk-managed-web-"), "Test root must be a dedicated OS temporary directory")
    require(not args.health_fixture or args.test_root, "Health fixture is only allowed in local tests")
    canonical_directory(root)
    with locked(root):
        if args.command == "receive":
            receive(root, args.release_id, args.sha256, sys.stdin.buffer, args.dry_run, args.health_fixture)
        elif args.command == "rollback":
            rollback(root, args.expected, args.target, args.health_fixture)
        else:
            adopt(root, args.release_id, args.source_commit, args.web_version)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, tarfile.TarError) as error:
        print("release refused: " + str(error), file=sys.stderr)
        sys.exit(1)
