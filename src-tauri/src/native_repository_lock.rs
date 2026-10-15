use std::fs::{File, OpenOptions};
use std::io;
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};

pub(crate) enum LockError {
    Busy,
    Io(io::Error),
}

pub(crate) fn exclusive(path: &Path) -> Result<File, LockError> {
    crate::asset_storage::io::checked_metadata(path)
        .map_err(|message| LockError::Io(io::Error::other(message)))?;
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    let classify = |error: io::Error| {
        if error.kind() == io::ErrorKind::WouldBlock
            || cfg!(windows) && matches!(error.raw_os_error(), Some(32 | 33))
        {
            LockError::Busy
        } else {
            LockError::Io(error)
        }
    };
    let file = options.open(path).map_err(classify)?;
    #[cfg(unix)]
    {
        use std::os::fd::AsRawFd;
        extern "C" {
            fn flock(
                fd: std::os::raw::c_int,
                operation: std::os::raw::c_int,
            ) -> std::os::raw::c_int;
        }
        if unsafe { flock(file.as_raw_fd(), 2 | 4) } != 0 {
            return Err(classify(io::Error::last_os_error()));
        }
    }
    Ok(file)
}

pub(crate) fn message(error: LockError) -> String {
    match error {
        LockError::Busy => "busy: 仓库已由其他进程占用".into(),
        LockError::Io(error) => format!("io: 仓库锁操作失败：{error}"),
    }
}

// Every owned operation takes this mutex before its repository mutex. The OS
// handles live with the access capability, including TaskHost's retained Arc.
pub(crate) struct OwnedLocks {
    _journal: File,
    _assets: File,
    _snapshot: File,
    _owner: File,
    transaction: Mutex<()>,
}
impl OwnedLocks {
    pub(crate) fn new(owner: File, snapshot: File, assets: File, journal: File) -> Arc<Self> {
        Arc::new(Self {
            _owner: owner,
            _snapshot: snapshot,
            _assets: assets,
            _journal: journal,
            transaction: Mutex::new(()),
        })
    }
    pub(crate) fn access(self: &Arc<Self>) -> RepositoryAccess {
        RepositoryAccess::Owned(Arc::clone(self))
    }
}

pub(crate) enum RepositoryAccess {
    Standalone,
    Owned(Arc<OwnedLocks>),
}
pub(crate) enum Transaction<'a> {
    Standalone {
        _file: File,
        _repository: MutexGuard<'a, ()>,
    },
    Owned {
        _guard: MutexGuard<'a, ()>,
        _repository: MutexGuard<'a, ()>,
    },
}
impl RepositoryAccess {
    pub(crate) fn begin<'a>(
        &'a self,
        repository: &'a Mutex<()>,
        standalone: impl FnOnce() -> Result<File, String>,
    ) -> Result<Transaction<'a>, String> {
        let local = || {
            repository
                .lock()
                .map_err(|_| "io: 仓库事务锁不可用".to_string())
        };
        match self {
            Self::Standalone => {
                let guard = local()?;
                Ok(Transaction::Standalone {
                    _file: standalone()?,
                    _repository: guard,
                })
            }
            Self::Owned(locks) => {
                let guard = locks
                    .transaction
                    .lock()
                    .map_err(|_| "io: 仓库事务锁不可用".to_string())?;
                Ok(Transaction::Owned {
                    _guard: guard,
                    _repository: local()?,
                })
            }
        }
    }
}
