#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands {
    pub mod redactor;
    pub mod validator;
    pub mod diff;
    pub mod python;
    pub mod workspace;
}

use commands::redactor::RedactRequest;
use commands::validator::{ValidateRequest, ValidateResult};
use commands::diff::{DiffRequest, DiffResult};
use commands::python::{PythonRequest, PythonResult};
use commands::workspace::{
    WriteFileRequest, WriteFileResult,
    ReadFileRequest, ReadFileResult,
    WorkspaceInfo, MoveRequest,
};
use sysinfo::System;
use serde::Serialize;
use std::sync::Mutex;


#[derive(Serialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub memory_usage_mb: u64,
}

pub struct AppState {
    pub sys: Mutex<System>,
}

// main.rs refactored for stability
#[derive(serde::Serialize)]
struct DragResultPayload {
    dropped: bool,
    x: i32,
    y: i32,
}

#[tauri::command]
async fn drag_file(window: tauri::Window, filename: String, subfolder: Option<String>, is_dir: bool) -> Result<DragResultPayload, String> {
    // 1. Resolve path using the hardened logic (propagating the Result error with?)
    let path = commands::workspace::resolve_path(Some(filename), subfolder)?;

    if path.file_name().is_none() {
        return Err("Cannot drag a drive root or directory share directly.".to_string());
    }

    // 2. Select icon and re-encode to RGBA PNG
    let icon_bytes = if is_dir {
        include_bytes!("../icons/folder.png").to_vec()
    } else {
        include_bytes!("../icons/file.png").to_vec()
    };
    
    // FIX: Pass as reference (&icon_bytes) 
    let rgba_icon_bytes = commands::workspace::ensure_rgba_png_bytes(&icon_bytes)?;
    
    let (tx, rx) = std::sync::mpsc::channel();
    
    // Windows Shell APIs (ILCreateFromPathW) strictly require backslashes for network paths.
    // Ensure the path is completely normalized before passing to drag-fix.
    let clean_path_str = path.to_string_lossy().replace("/", "\\");
    let clean_path = std::path::PathBuf::from(clean_path_str);
    
    window.clone().run_on_main_thread(move || {
        let icon = drag::Image::Raw(rgba_icon_bytes);
        let item = drag::DragItem::Files(vec![clean_path]);

        #[cfg(target_os = "linux")]
        let handle = window.gtk_window().unwrap();
        #[cfg(not(target_os = "linux"))]
        let handle = &window;

        let _ = drag::start_drag(
            handle,
            item,
            icon,
            move |result, cursor_pos| {
                let _ = tx.send((result, cursor_pos));
            },
            drag::Options::default()
        );
    }).map_err(|e| e.to_string())?;

    let (drag_res, cursor_pos) = match rx.recv() {
        Ok(res) => res,
        Err(_) => {
            // The sending half was dropped before a message was sent.
            // This happens if drag::start_drag encounters an OS error (like a missing file)
            // and aborts before the drag loop ever starts.
            (drag::DragResult::Cancel, drag::CursorPosition { x: 0, y: 0 })
        }
    };
    
    let dropped = matches!(drag_res, drag::DragResult::Dropped);
    
    Ok(DragResultPayload { 
        dropped, 
        x: cursor_pos.x, 
        y: cursor_pos.y 
    })
}

#[tauri::command]
async fn redact_pii(req: RedactRequest) -> commands::redactor::RedactResult {
    commands::redactor::run_redaction(req)
}

#[tauri::command]
async fn validate_data(req: ValidateRequest) -> ValidateResult {
    commands::validator::validate_data(req)
}

#[tauri::command]
async fn get_diff(req: DiffRequest) -> DiffResult {
    commands::diff::compare_text(req)
}

#[tauri::command]
async fn run_python(code: String) -> PythonResult {
    commands::python::execute_python(PythonRequest { code })
}

#[tauri::command]
fn workspace_info(subfolder: Option<String>) -> Result<WorkspaceInfo, String> {
    commands::workspace::get_workspace_info(subfolder)
}

#[tauri::command]
fn workspace_create_dir(subfolder: String) -> Result<(), String> {
    commands::workspace::create_workspace_dir(subfolder)
}

#[tauri::command]
fn workspace_delete(filename: String, subfolder: Option<String>) -> Result<(), String> {
    commands::workspace::delete_workspace_item(filename, subfolder)
}

#[tauri::command]
fn workspace_move(req: MoveRequest) -> Result<(), String> {
    commands::workspace::move_workspace_item(req)
}

#[tauri::command]
fn workspace_write(req: WriteFileRequest) -> WriteFileResult {
    commands::workspace::write_workspace_file(req)
}

#[tauri::command]
fn workspace_read(req: ReadFileRequest) -> ReadFileResult {
    commands::workspace::read_workspace_file(req)
}

#[tauri::command]
fn get_system_stats(state: tauri::State<AppState>) -> SystemStats {
    let mut sys = state.sys.lock().unwrap();
    
    // Refresh only what we need for performance
    sys.refresh_cpu();
    sys.refresh_memory();
    
    // In sysinfo 0.30, global_cpu_info() is now global_cpu()
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    
    // sysinfo memory is in bytes in 0.30
    let memory_usage_mb = sys.used_memory() / 1024 / 1024; 

    SystemStats {
        cpu_usage,
        memory_usage_mb,
    }
}

fn main() {
    // In sysinfo 0.30, System::new_all() works but refresh_all() is often better
    let mut sys = System::new_all();
    sys.refresh_all();

    tauri::Builder::default()
        .plugin(tauri_plugin_drag::init())
        .manage(AppState {
            sys: Mutex::new(sys),
        })
        .invoke_handler(tauri::generate_handler![
            redact_pii,
            get_system_stats,
            validate_data,
            get_diff,
            run_python,
            workspace_info,
            workspace_write,
            workspace_read,
            workspace_create_dir,
            workspace_delete,
            workspace_move,
            drag_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}