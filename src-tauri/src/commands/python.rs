use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Deserialize)]
pub struct PythonRequest {
    pub code: String,
}

#[derive(Serialize)]
pub struct PythonResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute Python code using the system Python interpreter.
/// Tries `python` first, then `python3` as fallback.
pub fn execute_python(req: PythonRequest) -> PythonResult {
    let interpreters = ["python", "python3"];
    
    for interp in &interpreters {
        match Command::new(interp)
            .args(["-c", &req.code])
            .output()
        {
            Ok(output) => {
                return PythonResult {
                    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                    stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                    exit_code: output.status.code().unwrap_or(-1),
                };
            }
            Err(_) => continue,
        }
    }

    PythonResult {
        stdout: String::new(),
        stderr: "Python not found. Install Python and ensure it's in your PATH.".to_string(),
        exit_code: -1,
    }
}
