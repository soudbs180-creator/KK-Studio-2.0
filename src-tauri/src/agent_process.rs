use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle, RawHandle};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};

pub struct OwnedJob {
    _handle: OwnedHandle,
}

impl OwnedJob {
    pub fn assign(process: RawHandle) -> Result<Self, String> {
        // The child waits on private stdin until this non-inheritable handle owns it.
        // Closing our handle also terminates descendants after an abnormal app exit.
        unsafe {
            let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if job.is_null() {
                return Err("无法创建 Agent 进程归属，请重新启动 KK。".into());
            }
            let handle = OwnedHandle::from_raw_handle(job);
            let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if SetInformationJobObject(
                handle.as_raw_handle(),
                JobObjectExtendedLimitInformation,
                &limits as *const _ as *const _,
                std::mem::size_of_val(&limits) as u32,
            ) == 0
                || AssignProcessToJobObject(handle.as_raw_handle(), process) == 0
            {
                return Err("无法隔离 Agent 进程；未启动服务。".into());
            }
            Ok(Self { _handle: handle })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::windows::io::AsRawHandle;
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};

    #[test]
    fn dropping_job_terminates_owned_process_and_preserves_external_process() {
        fn child() -> std::process::Child {
            Command::new(std::env::var_os("COMSPEC").unwrap_or("cmd.exe".into()))
                .args(["/D", "/Q", "/K"])
                .stdin(Stdio::piped())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .creation_flags(0x08000000)
                .spawn()
                .unwrap()
        }
        let mut owned = child();
        let mut external = child();
        let job = OwnedJob::assign(owned.as_raw_handle()).unwrap();
        drop(job);
        let deadline = Instant::now() + Duration::from_secs(2);
        while owned.try_wait().unwrap().is_none() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
        let terminated = owned.try_wait().unwrap().is_some();
        let external_alive = external.try_wait().unwrap().is_none();
        let _ = owned.kill();
        let _ = owned.wait();
        let _ = external.kill();
        let _ = external.wait();
        assert!(
            terminated,
            "dropping the owner's handle must terminate its process"
        );
        assert!(external_alive, "an unrelated instance must remain alive");
    }
}
