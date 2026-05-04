use serde::{Deserialize, Serialize};
use serde_json::Value;
use csv::ReaderBuilder;
use std::io::Cursor;

#[derive(Deserialize)]
pub struct ValidateRequest {
    pub text: String,
    pub format: String, // "json", "csv"
}

#[derive(Serialize)]
pub struct ValidateResult {
    pub is_valid: bool,
    pub output: String,
    pub data: Option<Value>,
    pub error: Option<String>,
    pub line: Option<usize>,
    pub col: Option<usize>,
}

pub fn validate_data(req: ValidateRequest) -> ValidateResult {
    match req.format.as_str() {
        "json" => validate_json(&req.text),
        "csv" => validate_csv(&req.text),
        _ => ValidateResult {
            is_valid: false,
            output: String::new(),
            data: None,
            error: Some("Unsupported format".into()),
            line: None,
            col: None,
        }
    }
}

fn validate_json(text: &str) -> ValidateResult {
    match serde_json::from_str::<Value>(text) {
        Ok(v) => ValidateResult {
            is_valid: true,
            output: serde_json::to_string_pretty(&v).unwrap_or_else(|_| text.into()),
            data: Some(v),
            error: None,
            line: None,
            col: None,
        },
        Err(e) => {
            ValidateResult {
                is_valid: false,
                output: String::new(),
                data: None,
                error: Some(e.to_string()),
                line: Some(e.line()),
                col: Some(e.column()),
            }
        }
    }
}

fn validate_csv(text: &str) -> ValidateResult {
    let mut reader = ReaderBuilder::new()
        .flexible(true) // Allow flexible for table viewing
        .from_reader(Cursor::new(text));
    
    let mut rows = Vec::new();
    let headers = match reader.headers() {
        Ok(h) => h.iter().map(|s| s.to_string()).collect::<Vec<String>>(),
        Err(e) => {
            return ValidateResult {
                is_valid: false,
                output: String::new(),
                data: None,
                error: Some(format!("CSV Header Error: {}", e)),
                line: None,
                col: None,
            };
        }
    };

    for result in reader.records() {
        match result {
            Ok(record) => {
                let mut row = serde_json::Map::new();
                for (i, field) in record.iter().enumerate() {
                    let header = headers.get(i).cloned().unwrap_or_else(|| format!("column_{}", i));
                    row.insert(header, Value::String(field.to_string()));
                }
                rows.push(Value::Object(row));
            }
            Err(e) => {
                let pos = e.position();
                return ValidateResult {
                    is_valid: false,
                    output: String::new(),
                    data: None,
                    error: Some(format!("CSV Error: {}", e)),
                    line: pos.map(|p| p.line() as usize),
                    col: None,
                };
            }
        }
    }
    
    ValidateResult {
        is_valid: true,
        output: format!("CSV is valid. Processed {} records.", rows.len()),
        data: Some(Value::Array(rows)),
        error: None,
        line: None,
        col: None,
    }
}
