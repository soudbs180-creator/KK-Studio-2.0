use crate::comfy_runtime::launch_plan;
use std::{fs, path::Path, process::Command};
const BRIDGE: &str = include_str!("../../src/features/comfyui/editorBridge.js");

pub fn install(root: &Path) -> Result<String, String> {
    let plan = launch_plan(root)?;
    let output = frontend_probe(&plan.python)
        .output()
        .map_err(|_| "无法定位 ComfyUI 前端，请检查所选环境的 Python")?;
    install_at_frontend(output)
}
fn frontend_probe(python: &Path) -> Command {
    let mut command = Command::new(python);
    command.args(["-I", "-X", "utf8", "-c", "import pathlib,comfyui_frontend_package as p;print(pathlib.Path(p.__file__).parent/'static')"]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
}
fn install_at_frontend(output: std::process::Output) -> Result<String, String> {
    if !output.status.success() {
        return Err("未找到 ComfyUI 前端包，请选择当前运行环境的根目录".into());
    }
    let path = String::from_utf8(output.stdout).map_err(|_| "前端路径无效")?;
    let web = Path::new(path.trim())
        .canonicalize()
        .map_err(|_| "无法读取 ComfyUI 前端目录")?;
    if !web.join("scripts/app.js").is_file() || !web.join("index.html").is_file() {
        return Err("所选环境不是支持扩展的 ComfyUI 前端".into());
    }
    let extensions = web.join("extensions");
    fs::create_dir_all(&extensions).map_err(|_| "无法写入前端扩展目录")?;
    let extensions = extensions
        .canonicalize()
        .map_err(|_| "无法读取前端扩展目录")?;
    if !extensions.starts_with(&web) {
        return Err("扩展目录越出所选前端".into());
    }
    let target = extensions.join("kk-studio-canvas-bridge-v1.js");
    if let Ok(meta) = fs::symlink_metadata(&target) {
        if meta.file_type().is_symlink()
            || !meta.is_file()
            || !fs::read_to_string(&target)
                .map_err(|_| "无法读取已有扩展")?
                .starts_with("// KK Studio canvas bridge v1")
        {
            return Err("已有同名文件，未覆盖任何外部扩展".into());
        }
    }
    fs::write(&target, BRIDGE).map_err(|_| "无法安装编辑器同步扩展")?;
    Ok(target.to_string_lossy().to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn python_probe_uses_utf8_for_non_ascii_frontend_paths() {
        let command = frontend_probe(Path::new("C:/用户/ComfyUI/python.exe"));
        let args: Vec<_> = command.get_args().collect();
        assert_eq!(&args[..4], &["-I", "-X", "utf8", "-c"]);
        assert!(args[4]
            .to_string_lossy()
            .contains("comfyui_frontend_package"));
    }
}
#[tauri::command]
pub async fn comfyui_install_editor_bridge(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || install(Path::new(&path)))
        .await
        .map_err(|_| "编辑器同步安装中断")?
}
