use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// --- Data Structures ---

#[derive(Serialize)]
pub struct FileInfo {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub virtual_file: bool,
}

#[derive(Serialize)]
pub struct WorkspaceInfo {
    pub path: String,
    pub files: Vec<FileInfo>,
}

#[derive(Deserialize)]
pub struct ReadFileRequest {
    pub filename: String,
    pub subfolder: Option<String>,
}

#[derive(Serialize)]
pub struct ReadFileResult {
    pub success: bool,
    pub content: Option<String>,
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct WriteFileRequest {
    pub filename: String,
    pub subfolder: Option<String>,
    pub content: Option<String>,
}

pub type WriteFileResult = Result<(), String>;

#[derive(Deserialize)]
pub struct MoveRequest {
    pub from_name: String,
    pub from_subfolder: Option<String>,
    pub to_subfolder: Option<String>,
}

// --- Helper Functions ---

/// Parses any image format and re-encodes it strictly as an RGBA PNG.
/// This prevents the `drag=0.4.1` panic caused by optimized/grayscale PNGs.
pub fn ensure_rgba_png_bytes(raw_bytes: &[u8]) -> Result<Vec<u8>, String> {
    let mut img = image::load_from_memory(raw_bytes)
        .map_err(|e| format!("Failed to parse image: {}", e))?
        .into_rgba8();
        
    // CRITICAL FIX: The `drag` crate has a bug where it calls `.as_rgba8().unwrap()`.
    // If the image crate optimizes the PNG to RGB8 (because no pixels are transparent),
    // the app will panic! We force an alpha channel here to prevent optimization.
    let mut pixel = *img.get_pixel(0, 0);
    if pixel[3] == 255 {
        pixel[3] = 254; 
        img.put_pixel(0, 0, pixel);
    }
        
    let mut safe_png_bytes = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut safe_png_bytes);
    img.write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to re-encode image: {}", e))?;
        
    Ok(safe_png_bytes)
}

/// Gets the root of the toolbox workspace using the home directory
fn get_workspace_dir() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("Toolbox_Workspace");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

/// Resolves requested paths securely. Allows absolute paths (like mapped drives or NAS).
pub fn resolve_path(filename: Option<String>, subfolder: Option<String>) -> Result<PathBuf, String> {
    let mut path = get_workspace_dir();
    
    // Construct the path manually to avoid verbatim prefixes from canonicalize
    if let Some(sub) = subfolder {
        let sub_path = PathBuf::from(&sub);
        if sub_path.is_absolute() {
            path = sub_path;
        } else {
            path = path.join(sub);
        }
    }

    if let Some(name) = filename {
        path.push(name);
    }

    Ok(path)
}


// --- Workspace Operations ---

pub fn get_workspace_info(subfolder: Option<String>) -> Result<WorkspaceInfo, String> {
    let path = resolve_path(None, subfolder)?;
    
    if !path.exists() {
        return Err(format!("Path does not exist: {:?}", path));
    }

    let mut files = Vec::new();

    if path.is_dir() {
        if let Ok(entries) = fs::read_dir(&path) {
            for entry in entries.flatten() {
                let meta = entry.metadata().map_err(|e| e.to_string())?;
                files.push(FileInfo {
                    name: entry.file_name().to_string_lossy().to_string(),
                    is_dir: meta.is_dir(),
                    size: meta.len(),
                    virtual_file: false,
                });
            }
        }
    }

    Ok(WorkspaceInfo {
        path: path.to_string_lossy().to_string(),
        files,
    })
}

pub fn read_workspace_file(req: ReadFileRequest) -> ReadFileResult {
    let path = match resolve_path(Some(req.filename), req.subfolder) {
        Ok(p) => p,
        Err(e) => return ReadFileResult { success: false, content: None, error: Some(e) },
    };
    match fs::read_to_string(path) {
        Ok(content) => ReadFileResult {
            success: true,
            content: Some(content),
            error: None,
        },
        Err(e) => ReadFileResult {
            success: false,
            content: None,
            error: Some(e.to_string()),
        },
    }
}

pub fn write_workspace_file(req: WriteFileRequest) -> WriteFileResult {
    let path = resolve_path(Some(req.filename), req.subfolder)?;
    let content = req.content.unwrap_or_default();
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn delete_workspace_item(filename: String, subfolder: Option<String>) -> Result<(), String> {
    let path = resolve_path(Some(filename), subfolder)?;
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

pub fn move_workspace_item(req: MoveRequest) -> Result<(), String> {
    let from_path = resolve_path(Some(req.from_name.clone()), req.from_subfolder)?;
    let mut to_path = resolve_path(None, req.to_subfolder)?;
    to_path.push(&req.from_name);

    // Network drives often have delayed lock releases after a drag operation.
    // Retry rename a few times to give the SMB server time to close the handle.
    let mut rename_result = fs::rename(&from_path, &to_path);
    let mut retries = 0;
    while let Err(ref e) = rename_result {
        // ERROR_NOT_SAME_DEVICE (17) means cross-drive move. 
        // It will never succeed via rename, so skip the 1-second retry penalty immediately.
        if e.raw_os_error() == Some(17) || retries >= 5 {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
        rename_result = fs::rename(&from_path, &to_path);
        retries += 1;
    }

    if let Err(e) = rename_result {
        // Fallback for cross-device moves
        if let Err(copy_err) = fs::copy(&from_path, &to_path) {
            return Err(format!("Failed to move: {} (Copy fallback failed: {})", e, copy_err));
        }
        
        // Also retry remove_file in case the lock was just read-lock
        let mut del_result = fs::remove_file(&from_path);
        let mut del_retries = 0;
        while del_result.is_err() && del_retries < 5 {
            std::thread::sleep(std::time::Duration::from_millis(200));
            del_result = fs::remove_file(&from_path);
            del_retries += 1;
        }

        if let Err(del_err) = del_result {
            return Err(format!("Copied successfully but failed to delete original: {}", del_err));
        }
    }
    
    Ok(())
}

pub fn create_workspace_dir(subfolder: String) -> Result<(), String> {
    let path = resolve_path(None, Some(subfolder))?;
    fs::create_dir_all(path).map_err(|e| e.to_string())
}