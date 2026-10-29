use serde::Serialize;
use std::{
    io::Write,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
};

pub struct LaunchPlan {
    pub python: PathBuf,
    pub entry: PathBuf,
    pub directory: PathBuf,
}
pub fn launch_plan(root: &Path) -> Result<LaunchPlan, String> {
    let root = root
        .canonicalize()
        .map_err(|_| "请选择有效的 ComfyUI 根目录")?;
    let entry = [root.join("main.py"), root.join("ComfyUI/main.py")]
        .into_iter()
        .find(|p| p.is_file())
        .ok_or("未找到 main.py；请选择源码或便携版根目录")?
        .canonicalize()
        .map_err(|_| "无法读取 ComfyUI 入口")?;
    if !entry.starts_with(&root) {
        return Err("ComfyUI 入口越出所选根目录".into());
    }
    if !entry.parent().unwrap().join("folder_paths.py").is_file()
        || !entry.parent().unwrap().join("comfy").is_dir()
    {
        return Err("目录缺少 ComfyUI 的 folder_paths.py 或 comfy 模块".into());
    }
    let python = [
        root.join("python_embeded/python.exe"),
        root.join("python_embedded/python.exe"),
        root.join(".venv/Scripts/python.exe"),
        root.join("venv/Scripts/python.exe"),
        entry.parent().unwrap().join(".venv/Scripts/python.exe"),
    ]
    .into_iter()
    .find(|p| p.is_file())
    .unwrap_or_else(|| PathBuf::from("python"));
    Ok(LaunchPlan {
        python,
        directory: entry.parent().unwrap().to_path_buf(),
        entry,
    })
}

struct OwnedProcess {
    child: Child,
    root: String,
    #[cfg(windows)]
    job: Option<crate::agent_process::OwnedJob>,
}
impl Drop for OwnedProcess {
    fn drop(&mut self) {
        #[cfg(windows)]
        drop(self.job.take());
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}
#[derive(Default)]
pub struct ComfyRuntime {
    process: Mutex<Option<OwnedProcess>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub pid: Option<u32>,
    pub owned: bool,
    pub root: Option<String>,
    pub ready: bool,
}
impl ComfyRuntime {
    pub fn snapshot(&self) -> Result<RuntimeStatus, String> {
        let mut slot = self.process.lock().map_err(|_| "ComfyUI 状态锁不可用")?;
        if let Some(p) = slot.as_mut() {
            if p.child
                .try_wait()
                .map_err(|_| "无法读取 ComfyUI 进程状态")?
                .is_some()
            {
                slot.take();
            }
        }
        Ok(RuntimeStatus {
            pid: slot.as_ref().map(|p| p.child.id()),
            owned: slot.is_some(),
            root: slot.as_ref().map(|p| p.root.clone()),
            ready: false,
        })
    }
    pub fn stop(&self) -> Result<(), String> {
        self.process
            .lock()
            .map_err(|_| "ComfyUI 状态锁不可用")?
            .take();
        Ok(())
    }
    #[cfg(windows)]
    pub async fn start(&self, root: &Path) -> Result<(), String> {
        use std::os::windows::{io::AsRawHandle, process::CommandExt};
        let mut plan = launch_plan(root)?;
        // Windows execution aliases can activate Python outside the launcher's Job.
        let mut probe = tokio::process::Command::new(&plan.python);
        probe
            .args([
                "-I",
                "-S",
                "-X",
                "utf8",
                "-c",
                "import sys;print(sys.executable)",
            ])
            .kill_on_drop(true)
            .creation_flags(0x08000000)
            .env_remove("PYTHONPATH")
            .env_remove("PYTHONSTARTUP")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        let output = tokio::time::timeout(std::time::Duration::from_secs(3), probe.output())
            .await
            .map_err(|_| "Python 环境检测超时")?
            .map_err(|_| "找不到可用的 Python，请检查本地环境")?;
        if !output.status.success() || output.stdout.len() > 4096 {
            return Err("Python 环境检测失败".into());
        }
        let executable = String::from_utf8(output.stdout).map_err(|_| "Python 路径无效")?;
        let python = PathBuf::from(executable.trim());
        if !python.is_absolute() || !python.is_file() {
            return Err("Python 路径无效".into());
        }
        plan.python = python;
        let mut slot = self.process.lock().map_err(|_| "ComfyUI 状态锁不可用")?;
        if let Some(p) = slot.as_mut() {
            if p.child
                .try_wait()
                .map_err(|_| "无法读取已有进程")?
                .is_none()
            {
                return Err("已有托管进程，请先停止后再选择目录".into());
            }
            slot.take();
        }
        if std::net::TcpStream::connect_timeout(
            &"127.0.0.1:8188".parse().unwrap(),
            std::time::Duration::from_millis(200),
        )
        .is_ok()
        {
            return Err("8188 已被占用，未启动或停止任何外部程序".into());
        }
        // Python site hooks and ComfyUI run only after the Windows Job owns the child.
        let bootstrap = "import sys\nif sys.stdin.buffer.read(1)!=b'1': sys.exit(1)\nimport site;site.main()\nimport runpy,os\nsys.argv=sys.argv[1:]\nsys.path.insert(0,os.path.dirname(sys.argv[0]))\nrunpy.run_path(sys.argv[0],run_name='__main__')";
        // Standalone flags belong to ComfyUI, not to the Python interpreter.
        let portable = plan.python.ends_with("python_embeded/python.exe")
            || plan.python.ends_with("python_embedded/python.exe");
        let mut command = Command::new(&plan.python);
        command
            .args(["-S", "-c", bootstrap])
            .arg(&plan.entry)
            .args([
                "--listen",
                "127.0.0.1",
                "--port",
                "8188",
                "--enable-cors-header",
                "http://tauri.localhost",
            ])
            .current_dir(&plan.directory)
            .env_remove("PYTHONPATH")
            .env_remove("PYTHONSTARTUP")
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(0x08000000);
        if portable {
            command.arg("--windows-standalone-build");
        }
        let mut child = command
            .spawn()
            .map_err(|_| "无法后台启动 Python，请检查本地 ComfyUI 环境")?;
        let job = match crate::agent_process::OwnedJob::assign(child.as_raw_handle()) {
            Ok(j) => j,
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(e);
            }
        };
        if child
            .stdin
            .take()
            .ok_or("启动管道缺失")?
            .write_all(b"1")
            .is_err()
        {
            drop(job);
            let _ = child.wait();
            return Err("ComfyUI 启动握手失败".into());
        }
        *slot = Some(OwnedProcess {
            child,
            job: Some(job),
            root: root.to_string_lossy().into(),
        });
        Ok(())
    }
    #[cfg(not(windows))]
    pub async fn start(&self, _root: &Path) -> Result<(), String> {
        Err("当前托管实现仅支持 Windows".into())
    }
}

#[tauri::command]
pub async fn comfyui_start_process(
    state: tauri::State<'_, ComfyRuntime>,
    path: String,
) -> Result<RuntimeStatus, String> {
    let scan =
        tauri::async_runtime::spawn_blocking(move || crate::scan_comfyui_path(Path::new(&path)))
            .await
            .map_err(|_| "ComfyUI 目录扫描中断")??;
    if !scan.detected {
        return Err("所选目录未检测到 ComfyUI".into());
    }
    state.start(Path::new(&scan.root)).await?;
    state.snapshot()
}
#[tauri::command]
pub fn comfyui_stop_process(state: tauri::State<'_, ComfyRuntime>) -> Result<(), String> {
    state.stop()
}
#[tauri::command]
pub async fn comfyui_process_status(
    state: tauri::State<'_, ComfyRuntime>,
) -> Result<RuntimeStatus, String> {
    let mut status = state.snapshot()?;
    if let Ok(Ok(value)) = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        super::comfy_transport::json_request("/system_stats", None),
    )
    .await
    {
        status.ready = value["system"].is_object() && value["devices"].is_array();
    }
    Ok(status)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn validates_root_and_prefers_portable_python_without_shell_interpolation() {
        let root =
            std::env::temp_dir().join(format!("kk-comfy-{} & literal", uuid::Uuid::new_v4()));
        fs::create_dir_all(root.join("ComfyUI")).unwrap();
        fs::create_dir_all(root.join("ComfyUI/comfy")).unwrap();
        fs::write(root.join("ComfyUI/folder_paths.py"), "").unwrap();
        fs::create_dir_all(root.join("python_embeded")).unwrap();
        fs::write(root.join("ComfyUI/main.py"), "pass").unwrap();
        fs::write(root.join("python_embeded/python.exe"), "fixture").unwrap();
        let plan = launch_plan(&root).unwrap();
        assert!(plan.python.ends_with("python_embeded/python.exe"));
        assert!(plan.entry.ends_with("ComfyUI/main.py"));
        assert!(plan.directory.ends_with("ComfyUI"));
        assert!(launch_plan(&root.join("missing")).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn empty_stop_never_claims_or_kills_an_external_service() {
        let runtime = ComfyRuntime::default();
        runtime.stop().unwrap();
        assert!(runtime.snapshot().unwrap().pid.is_none());
        assert!(!runtime.snapshot().unwrap().owned);
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn owned_python_runs_after_the_gate_and_stop_reaps_it() {
        for venv in [false, true] {
            let root = std::env::temp_dir()
                .join(format!("kk-comfy-owned-中文 & {}", uuid::Uuid::new_v4()));
            fs::create_dir_all(&root).unwrap();
            fs::create_dir_all(root.join("comfy")).unwrap();
            fs::write(root.join("folder_paths.py"), "").unwrap();
            fs::write(root.join("main.py"),"from pathlib import Path\nimport time,subprocess,sys\np=subprocess.Popen([sys.executable,'-S','-c','import time;time.sleep(60)'])\nPath('started').write_text(str(p.pid))\ntime.sleep(60)\n").unwrap();
            if venv {
                assert!(Command::new("python")
                    .args(["-I", "-m", "venv", "--without-pip"])
                    .arg(root.join(".venv"))
                    .status()
                    .unwrap()
                    .success());
            }
            let runtime = ComfyRuntime::default();
            runtime.start(&root).await.unwrap();
            for _ in 0..100 {
                if root.join("started").exists() {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            assert!(
                root.join("started").exists(),
                "owned Python never reached the selected main.py"
            );
            let descendant: u32 = fs::read_to_string(root.join("started"))
                .unwrap()
                .parse()
                .unwrap();
            assert!(runtime.snapshot().unwrap().pid.is_some());
            runtime.stop().unwrap();
            assert!(runtime.snapshot().unwrap().pid.is_none());
            use windows_sys::Win32::System::Threading::{
                GetExitCodeProcess, OpenProcess, TerminateProcess,
                PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
            };
            unsafe {
                let handle = OpenProcess(
                    PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE,
                    0,
                    descendant,
                );
                let mut code = 0;
                let alive =
                    !handle.is_null() && GetExitCodeProcess(handle, &mut code) != 0 && code == 259;
                if alive {
                    TerminateProcess(handle, 1);
                }
                if !handle.is_null() {
                    windows_sys::Win32::Foundation::CloseHandle(handle);
                }
                assert!(!alive, "owned Python descendant survived stop");
            }
            assert_eq!(root.parent(), Some(std::env::temp_dir().as_path()));
            fs::remove_dir_all(root).unwrap();
        }
    }
}
