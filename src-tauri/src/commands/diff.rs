use serde::{Deserialize, Serialize};
use similar::{ChangeTag, TextDiff, Algorithm};

#[derive(Deserialize)]
pub struct DiffRequest {
    pub old_text: String,
    pub new_text: String,
}

#[derive(Serialize, Clone)]
pub struct DiffPart {
    pub tag: String, // "insert", "delete", "equal"
    pub content: String,
}

#[derive(Serialize, Clone)]
pub struct DiffLine {
    pub tag: String, // "insert", "delete", "equal"
    pub old_line: Option<usize>,
    pub new_line: Option<usize>,
    pub parts: Vec<DiffPart>,
}

#[derive(Serialize)]
pub struct DiffResult {
    pub lines: Vec<DiffLine>,
}

pub fn compare_text(req: DiffRequest) -> DiffResult {
    let diff = TextDiff::configure()
        .algorithm(Algorithm::Patience)
        .diff_lines(&req.old_text, &req.new_text);
    
    let mut lines = Vec::new();

    for op in diff.ops() {
        for change in diff.iter_changes(op) {
            let tag = match change.tag() {
                ChangeTag::Delete => "delete",
                ChangeTag::Insert => "insert",
                ChangeTag::Equal => "equal",
            };
            
            lines.push(DiffLine {
                tag: tag.to_string(),
                old_line: change.old_index(),
                new_line: change.new_index(),
                parts: vec![DiffPart {
                    tag: tag.to_string(),
                    content: change.value().to_string(),
                }],
            });
        }
    }

    // Secondary pass: For "delete" followed by "insert", we try to find character-level diffs
    let mut refined_lines = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        if i + 1 < lines.len() && lines[i].tag == "delete" && lines[i+1].tag == "insert" {
            let old_val = &lines[i].parts[0].content;
            let new_val = &lines[i+1].parts[0].content;
            
            let char_diff = TextDiff::from_chars(old_val, new_val);
            
            let mut old_parts = Vec::new();
            let mut new_parts = Vec::new();
            
            for char_change in char_diff.iter_all_changes() {
                match char_change.tag() {
                    ChangeTag::Equal => {
                        old_parts.push(DiffPart { tag: "equal".into(), content: char_change.value().into() });
                        new_parts.push(DiffPart { tag: "equal".into(), content: char_change.value().into() });
                    },
                    ChangeTag::Delete => {
                        old_parts.push(DiffPart { tag: "delete".into(), content: char_change.value().into() });
                    },
                    ChangeTag::Insert => {
                        new_parts.push(DiffPart { tag: "insert".into(), content: char_change.value().into() });
                    }
                }
            }
            
            refined_lines.push(DiffLine {
                tag: "delete".into(),
                old_line: lines[i].old_line,
                new_line: None,
                parts: old_parts,
            });
            refined_lines.push(DiffLine {
                tag: "insert".into(),
                old_line: None,
                new_line: lines[i+1].new_line,
                parts: new_parts,
            });
            i += 2;
        } else {
            refined_lines.push(lines[i].clone());
            i += 1;
        }
    }

    DiffResult { lines: refined_lines }
}
