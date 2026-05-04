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

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Execute Python code using the system Python interpreter.
/// Tries `python` first, then `python3` as fallback.
pub fn execute_python(req: PythonRequest) -> PythonResult {
    let interpreters = ["python", "python3"];
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    for interp in &interpreters {
        let mut cmd = Command::new(interp);
        cmd.args(["-c", &req.code]);

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.output() {
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
