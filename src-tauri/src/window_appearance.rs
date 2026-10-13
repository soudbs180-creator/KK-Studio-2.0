use serde::Serialize;
use std::future::Future;
use std::time::Duration;
use tauri::{Manager, WebviewWindow};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceState {
    supported: bool,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<String>,
}

fn state(enabled: bool) -> AppearanceState {
    AppearanceState {
        supported: true,
        enabled,
        reason: None,
    }
}

fn unsupported(reason: &str) -> AppearanceState {
    AppearanceState {
        supported: false,
        enabled: false,
        reason: Some(reason.into()),
    }
}

// Serialize writes through the readback so two overlapping toggles cannot
// acknowledge each other's state. No JavaScript preference is a native truth.
static CHANGE: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

async fn transition<W, R, F>(
    enabled: bool,
    mut write: W,
    mut read: R,
) -> Result<AppearanceState, String>
where
    W: FnMut(u8) -> Result<(), String>,
    R: FnMut() -> F,
    F: Future<Output = Result<AppearanceState, String>>,
{
    let previous = read().await?;
    if !previous.supported || previous.enabled == enabled {
        return Ok(previous);
    }
    if let Err(error) = write(if enabled { 0 } else { 255 }) {
        let _ = write(if previous.enabled { 0 } else { 255 });
        return Err(error);
    }
    match read().await {
        Ok(actual) if actual.supported && actual.enabled == enabled => Ok(actual),
        _ => {
            write(if previous.enabled { 0 } else { 255 })?;
            let restored = read().await?;
            if !restored.supported || restored.enabled != previous.enabled {
                return Err("窗口背景状态无法确认，请重新读取设置。".into());
            }
            Err("原生窗口未应用背景设置，已恢复之前状态。".into())
        }
    }
}

fn native_snapshot(webview: tauri::webview::PlatformWebview) -> Result<AppearanceState, String> {
    #[cfg(windows)]
    {
        use webview2_com::Microsoft::Web::WebView2::Win32::{
            ICoreWebView2Controller2, COREWEBVIEW2_COLOR,
        };
        use windows_core::Interface;
        let mut composed = 0;
        if unsafe { windows_sys::Win32::Graphics::Dwm::DwmIsCompositionEnabled(&mut composed) } < 0
            || composed == 0
        {
            return Ok(unsupported("当前 Windows 未提供桌面合成能力。"));
        }
        let Ok(controller) = webview.controller().cast::<ICoreWebView2Controller2>() else {
            return Ok(unsupported("当前 WebView2 不支持透明背景。"));
        };
        let mut color = COREWEBVIEW2_COLOR::default();
        unsafe { controller.DefaultBackgroundColor(&mut color) }
            .map_err(|_| "无法读取原生窗口背景。")?;
        return Ok(state(color.A == 0));
    }
    #[cfg(target_os = "macos")]
    {
        let window = webview.ns_window() as *const objc2_app_kit::NSWindow;
        if window.is_null() {
            return Err("无法读取原生窗口背景。".into());
        }
        // with_webview runs this on AppKit's main thread and owns the NSWindow.
        let alpha = unsafe { (&*window).backgroundColor().alphaComponent() };
        return Ok(state(alpha <= 0.001));
    }
    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::WidgetExt;
        use webkit2gtk::prelude::WebViewExt;
        let view = webview.inner();
        let Some(screen) = view.screen() else {
            return Ok(unsupported("当前桌面没有可用的窗口合成环境。"));
        };
        if !screen.is_composited() || screen.rgba_visual().is_none() {
            return Ok(unsupported("当前 Linux 窗口管理器未提供透明合成能力。"));
        }
        return Ok(state(view.background_color().alpha() <= 0.001));
    }
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        let _ = webview;
        Ok(unsupported("此平台尚未提供原生透明窗口能力。"))
    }
}

async fn read(window: &WebviewWindow) -> Result<AppearanceState, String> {
    if window.label() != "main" {
        return Ok(unsupported("当前窗口不支持此外观设置。"));
    }
    let (send, receive) = tokio::sync::oneshot::channel();
    window
        .with_webview(move |view| {
            let _ = send.send(native_snapshot(view));
        })
        .map_err(|_| "无法读取原生窗口背景。")?;
    tokio::time::timeout(Duration::from_secs(3), receive)
        .await
        .map_err(|_| "读取原生窗口背景超时。")?
        .map_err(|_| "无法读取原生窗口背景。".to_string())?
}

pub fn initialize_opaque(app: &tauri::App) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        // transparent:true creates a capable surface; the user's default remains
        // opaque. Wry otherwise initializes a transparent WebView automatically.
        window.set_background_color(Some(tauri::window::Color(13, 13, 13, 255)))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn window_appearance_get(window: WebviewWindow) -> Result<AppearanceState, String> {
    read(&window).await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn window_appearance_set(
    window: WebviewWindow,
    enabled: bool,
) -> Result<AppearanceState, String> {
    let _change = CHANGE.lock().await;
    transition(
        enabled,
        |alpha| {
            window
                .set_background_color(Some(tauri::window::Color(13, 13, 13, alpha)))
                .map_err(|_| "无法更改原生窗口背景。".to_string())
        },
        || read(&window),
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicU8, Ordering},
        Arc,
    };

    #[tokio::test]
    async fn acknowledged_write_without_native_change_is_not_success() {
        let result = transition(true, |_| Ok(()), || async { Ok(state(false)) }).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn unsupported_environment_never_receives_native_writes() {
        let result = transition(
            true,
            |_| panic!("unsupported environment must not be mutated"),
            || async {
                Ok(AppearanceState {
                    supported: false,
                    enabled: false,
                    reason: Some("compositor unavailable".into()),
                })
            },
        )
        .await
        .unwrap();
        assert!(!result.supported);
        assert!(!result.enabled);
    }

    #[tokio::test]
    async fn write_failure_is_error_and_never_changes_actual_state() {
        let result = transition(
            true,
            |_| Err("native write failed".into()),
            || async { Ok(state(false)) },
        )
        .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn enabled_state_tracks_native_alpha_and_opaque_can_be_restored() {
        let alpha = Arc::new(AtomicU8::new(255));
        for enabled in [true, false] {
            let writer = alpha.clone();
            let reader = alpha.clone();
            let actual = transition(
                enabled,
                move |color| {
                    writer.store(color, Ordering::SeqCst);
                    Ok(())
                },
                move || {
                    let reader = reader.clone();
                    async move { Ok(state(reader.load(Ordering::SeqCst) == 0)) }
                },
            )
            .await
            .unwrap();
            assert_eq!(actual.enabled, enabled);
            assert_eq!(alpha.load(Ordering::SeqCst), if enabled { 0 } else { 255 });
        }
    }

    #[tokio::test]
    async fn uncertain_readback_rolls_back_before_returning_error() {
        let alpha = Arc::new(AtomicU8::new(255));
        let writer = alpha.clone();
        let reader = alpha.clone();
        let mut reads = 0;
        let result = transition(
            true,
            move |value| {
                writer.store(value, Ordering::SeqCst);
                Ok(())
            },
            move || {
                reads += 1;
                let read = reads;
                let reader = reader.clone();
                async move {
                    if read == 2 {
                        Err("native readback timed out".into())
                    } else {
                        Ok(state(reader.load(Ordering::SeqCst) == 0))
                    }
                }
            },
        )
        .await;
        assert!(result.is_err());
        assert_eq!(alpha.load(Ordering::SeqCst), 255);
    }
}
