use std::fs::{File, OpenOptions};
use std::path::Path;

pub fn lock(directory: &Path) -> Result<File, String> {
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    let file = options
        .open(directory.join("desktop-owner.lock"))
        .map_err(|_| "另一个桌面实例正在使用此 Agent 数据目录，或目录不可写。".to_string())?;
    #[cfg(unix)]
    {
        use std::os::fd::AsRawFd;
        // flock is tied to this open-file description; closing a parent's copy
        // must not unlock the inherited guardian copy.
        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            return Err("另一个桌面实例正在使用此 Agent 数据目录，或目录不可写。".into());
        }
    }
    #[cfg(not(any(windows, unix)))]
    return Err("当前平台没有已支持的 Agent 数据目录锁。".into());
    Ok(file)
}

#[cfg(unix)]
pub fn inherit_for_guardian(
    command: &mut tokio::process::Command,
    owner: &File,
) -> Result<File, String> {
    use std::os::fd::{AsRawFd, FromRawFd};
    // Reserve a descriptor >=3 before spawn. Standard streams may be closed in
    // a GUI launch, and Command later allocates its own pipes around this lease.
    let fd = unsafe { libc::fcntl(owner.as_raw_fd(), libc::F_DUPFD_CLOEXEC, 3) };
    if fd < 0 {
        return Err("无法继承 Agent 数据目录归属。".into());
    }
    let inherited = unsafe { File::from_raw_fd(fd) };
    command
        .env("KK_AGENT_OWNER_FD", fd.to_string())
        .process_group(0);
    // Only async-signal-safe syscalls are allowed between fork and exec.
    unsafe {
        command.pre_exec(move || {
            // Keep the already-reserved descriptor number. Replacing an arbitrary
            // fd 3 here could close Command's exec-error pipe in a multithreaded app.
            let flags = libc::fcntl(fd, libc::F_GETFD);
            if flags < 0 || libc::fcntl(fd, libc::F_SETFD, flags & !libc::FD_CLOEXEC) < 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }
    Ok(inherited)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture_namespace() -> String {
        format!(
            "kk-agent-owner-lock-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        )
    }

    fn reserve_fixture_directory(parent: &Path, namespace: &str) -> std::io::Result<PathBuf> {
        for suffix in 0u64.. {
            let name = if suffix == 0 {
                namespace.to_string()
            } else {
                format!("{namespace}-{suffix}")
            };
            let directory = parent.join(name);
            match std::fs::create_dir(&directory) {
                Ok(()) => return Ok(directory),
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(error),
            }
        }
        unreachable!("fixture directory reservation exhausted")
    }

    #[test]
    fn existing_fixture_directory_is_preserved_and_a_new_directory_is_reserved() {
        let root = reserve_fixture_directory(&std::env::temp_dir(), &fixture_namespace()).unwrap();
        let existing = root.join("existing-fixture");
        std::fs::create_dir(&existing).unwrap();
        std::fs::write(existing.join("marker"), b"previous fixture").unwrap();

        let reserved = reserve_fixture_directory(&root, "existing-fixture");
        let marker = std::fs::read(existing.join("marker")).unwrap();
        if let Ok(directory) = &reserved {
            if directory != &existing {
                std::fs::remove_dir(directory).unwrap();
            }
        }
        std::fs::remove_file(existing.join("marker")).unwrap();
        std::fs::remove_dir(&existing).unwrap();
        std::fs::remove_dir(&root).unwrap();

        assert_ne!(
            reserved.expect("an existing fixture must not block a fresh reservation"),
            existing
        );
        assert_eq!(marker, b"previous fixture");
    }

    #[test]
    fn owner_lock_excludes_other_open_files_and_recovers_after_drop() {
        #[cfg(unix)]
        {
            const CHILD: &str = "KK_AGENT_OWNER_LOCK_TEST_CHILD";
            if std::env::var(CHILD).as_deref() != Ok("yes") {
                // Other parallel tests fork while holding their own guardian leases.
                // Even CLOEXEC descriptors are copied until those children exec, so
                // an immediate drop/relock contract needs a process with no other forks.
                let output = std::process::Command::new(std::env::current_exe().unwrap())
                    .args([
                        "--exact",
                        "agent_owner::tests::owner_lock_excludes_other_open_files_and_recovers_after_drop",
                        "--nocapture",
                    ])
                    .env(CHILD, "yes")
                    .output()
                    .unwrap();
                assert!(
                    output.status.success(),
                    "isolated owner lifecycle failed:\n{}\n{}",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                );
                return;
            }
        }
        let directory =
            reserve_fixture_directory(&std::env::temp_dir(), &fixture_namespace()).unwrap();
        let first = lock(&directory).unwrap();
        assert!(lock(&directory).is_err());
        drop(first);
        let second = lock(&directory).unwrap();
        drop(second);
        std::fs::remove_file(directory.join("desktop-owner.lock")).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }
}

#[cfg(all(test, unix))]
#[path = "unix_guardian_tests.rs"]
mod unix_tests;
