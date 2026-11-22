//! Tauri command surface for ADR-023 local model installation.
use super::{
    catalog::Selection, runtime::RuntimeAuthorization, DirectoryGrant, Inspection, InstallPlan,
    InstallationSummary, LocalModelManager, OperationStatus, RuntimeStatus,
};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, State, Window};
use tauri_plugin_dialog::{DialogExt, FilePath};

fn owner(window: &Window) -> String {
    window.label().to_string()
}

fn path_from_dialog(path: FilePath) -> Result<PathBuf, String> {
    path.into_path()
        .map_err(|_| "permission: 无法解析所选目录".into())
}

#[tauri::command]
pub async fn local_model_choose_directory(
    app: AppHandle,
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
) -> Result<Option<DirectoryGrant>, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("选择本地模型安装目录")
        .blocking_pick_folder();
    let Some(folder) = picked else {
        return Ok(None);
    };
    let path = path_from_dialog(folder)?;
    let grant = manager.grant_directory(&owner(&window), &path)?;
    Ok(Some(grant))
}

#[tauri::command]
pub fn local_model_prepare_install(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    grant_id: String,
    selection: Selection,
) -> Result<InstallPlan, String> {
    manager.prepare(&owner(&window), &grant_id, selection)
}

#[tauri::command]
pub async fn local_model_install(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    operation_id: String,
) -> Result<OperationStatus, String> {
    manager.install(&owner(&window), &operation_id).await
}

#[tauri::command]
pub fn local_model_cancel(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    operation_id: String,
) -> Result<OperationStatus, String> {
    manager.cancel(&owner(&window), &operation_id)
}

#[tauri::command]
pub fn local_model_status(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    operation_id: String,
) -> Result<OperationStatus, String> {
    manager.status(&owner(&window), &operation_id)
}

#[tauri::command]
pub fn local_model_current(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
) -> Result<Option<OperationStatus>, String> {
    manager.current_operation(&owner(&window))
}

#[tauri::command]
pub fn local_model_list_installed(
    manager: State<'_, Arc<LocalModelManager>>,
) -> Result<Vec<InstallationSummary>, String> {
    manager.list_installed()
}

#[tauri::command]
pub fn local_model_inspect(
    manager: State<'_, Arc<LocalModelManager>>,
    installation_id: String,
) -> Result<Inspection, String> {
    manager.inspect(&installation_id)
}

#[tauri::command]
pub fn local_model_associate(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    grant_id: String,
    package_id: String,
) -> Result<Inspection, String> {
    manager.associate(&owner(&window), &grant_id, &package_id)
}

#[tauri::command]
pub async fn local_model_runtime_status(
    manager: State<'_, Arc<LocalModelManager>>,
) -> Result<Option<RuntimeStatus>, String> {
    Ok(manager.runtime_status().await)
}

#[tauri::command]
pub async fn local_model_start(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    installation_id: String,
) -> Result<RuntimeStatus, String> {
    let report = tauri::async_runtime::spawn_blocking(crate::local_hardware::detect)
        .await
        .map_err(|_| "本机硬件检测任务中断".to_string())?;
    let value = serde_json::to_value(&report).map_err(|error| format!("resources: {error}"))?;
    // GPU lease coordination is not wired yet; CUDA backends fail closed inside authorization.
    let authorization = RuntimeAuthorization::from_native_report(&value, None)?;
    manager
        .ensure_started(&owner(&window), &installation_id, authorization)
        .await
}

#[tauri::command]
pub async fn local_model_stop(
    window: Window,
    manager: State<'_, Arc<LocalModelManager>>,
    instance_id: String,
) -> Result<RuntimeStatus, String> {
    manager
        .stop_owned(&owner(&window), &instance_id)
        .await
}
