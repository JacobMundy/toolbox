// commands/redactor.rs
// All PII redaction logic runs here in Rust — fast even on 100k+ line documents.

use regex::Regex;
use serde::{Deserialize, Serialize};

// ── Input types ──────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct PrimaryInfo {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub city: Option<String>,
}

#[derive(Deserialize)]
pub struct FamilyMember {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
    pub label: Option<String>,
}

#[derive(Deserialize)]
pub struct UsernameEntry {
    pub value: Option<String>,
    pub plausible: Option<String>,
}

#[derive(Deserialize)]
pub struct CustomRedaction {
    pub find: Option<String>,
    pub label: Option<String>,
    pub plausible: Option<String>, // User-provided plausible alternative
}

#[derive(Deserialize)]
pub struct RedactorSettings {
    pub primary: PrimaryInfo,
    pub family_members: Vec<FamilyMember>,
    pub usernames: Vec<UsernameEntry>,
    pub custom_redactions: Vec<CustomRedaction>,
    pub left_wrap: String,
    pub right_wrap: String,
    pub mode: String, // "labels" or "plausible"
}

#[derive(Deserialize)]
pub struct RedactRequest {
    pub text: String,
    pub settings: RedactorSettings,
}

// ── Output types ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct RedactionEntry {
    pub original: String,
    pub replaced_with: String,
    pub count: usize,
}

#[derive(Serialize)]
pub struct LeakEntry {
    pub severity: String, // "high" | "medium" | "low"
    pub found: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct RedactResult {
    pub output: String,
    pub report: Vec<RedactionEntry>,
    pub leaks: Vec<LeakEntry>,
}

// ── Plausible name pools ──────────────────────────────────────────────────────

const FIRST_NAMES: &[&str] = &[
    "James", "Michael", "Robert", "David", "William", "Richard", "Thomas",
    "Daniel", "Matthew", "Christopher", "Joseph", "Andrew", "Steven", "Kenneth",
    "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Susan", "Dorothy",
    "Lisa", "Nancy", "Karen", "Sarah", "Jessica", "Michelle", "Laura", "Amanda",
    "Sophia", "Emma", "Olivia", "Charlotte", "Amelia", "Natalie",
];

const LAST_NAMES: &[&str] = &[
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson", "Thomas", "Taylor",
    "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark",
    "Torres", "Nguyen", "Hill", "Green", "Adams", "Nelson", "Baker", "Hall",
];

const CITIES: &[&str] = &[
    "Portland", "Austin", "Denver", "Seattle", "Nashville", "Phoenix",
    "Minneapolis", "Charlotte", "Tampa", "Orlando", "Sacramento", "Pittsburgh",
    "Baltimore", "Raleigh", "Memphis", "Louisville", "Omaha", "Boise",
];

fn pick_plausible(pool: &[&str], seed: usize) -> String {
    pool[seed % pool.len()].to_string()
}

// ── Core redaction logic ──────────────────────────────────────────────────────

struct Rule {
    find: String,
    replace: String,
    label: String,
    is_regex: bool,
    case_preserve: bool,
}

fn build_rules(settings: &RedactorSettings) -> Vec<Rule> {
    let l = &settings.left_wrap;
    let r = &settings.right_wrap;
    let plausible = settings.mode == "plausible";
    let mut rules: Vec<Rule> = Vec::new();

    // Helper: get plausible or label replacement
    let fake_first = pick_plausible(FIRST_NAMES, 7);
    let fake_last  = pick_plausible(LAST_NAMES, 13);
    let fake_city  = pick_plausible(CITIES, 5);

    let p = &settings.primary;

    // Full name (must come before individual names to catch full matches first)
    if let (Some(fn_), Some(ln)) = (&p.first_name, &p.last_name) {
        if !fn_.is_empty() && !ln.is_empty() {
            let full = format!("{} {}", fn_, ln);
            let rep = if plausible {
                format!("{} {}", fake_first, fake_last)
            } else {
                format!("{}Full Name{}", l, r)
            };
            rules.push(Rule { find: full, replace: rep, label: "Full Name".into(), is_regex: false, case_preserve: plausible });
        }
    }

    // Email (before individual names — emails can contain names as substrings)
    if let Some(email) = &p.email {
        if !email.is_empty() {
            let rep = if plausible {
                format!("{}.{}@mail.com", fake_first.to_lowercase(), fake_last.to_lowercase())
            } else {
                format!("{}Email{}", l, r)
            };
            rules.push(Rule { find: email.clone(), replace: rep, label: "Email".into(), is_regex: false, case_preserve: false });
        }
    }

    // Phone (regex-based)
    if let Some(phone) = &p.phone {
        if !phone.is_empty() {
            // Build a flexible phone regex that matches common formats
            let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
            if digits.len() >= 7 {
                let sep = r"[\s.\-()]*";
                let pattern = digits.chars().map(|c| c.to_string()).collect::<Vec<_>>().join(sep);
                let fake_phone = "555-867-5309".to_string();
                let rep = if plausible { fake_phone } else { format!("{}Phone{}", l, r) };
                rules.push(Rule {
                    find: pattern,
                    replace: rep,
                    label: "Phone".into(),
                    is_regex: true,
                    case_preserve: false,
                });
            }
        }
    }

    // First name
    if let Some(fn_) = &p.first_name {
        if !fn_.is_empty() {
            let rep = if plausible { fake_first.clone() } else { format!("{}First Name{}", l, r) };
            rules.push(Rule { find: fn_.clone(), replace: rep, label: "First Name".into(), is_regex: false, case_preserve: plausible });
        }
    }

    // Last name
    if let Some(ln) = &p.last_name {
        if !ln.is_empty() {
            let rep = if plausible { fake_last.clone() } else { format!("{}Last Name{}", l, r) };
            rules.push(Rule { find: ln.clone(), replace: rep, label: "Last Name".into(), is_regex: false, case_preserve: plausible });
        }
    }

    // City
    if let Some(city) = &p.city {
        if !city.is_empty() {
            let rep = if plausible { fake_city.clone() } else { format!("{}City{}", l, r) };
            rules.push(Rule { find: city.clone(), replace: rep, label: "City".into(), is_regex: false, case_preserve: plausible });
        }
    }

    // Family members
    for (i, fm) in settings.family_members.iter().enumerate() {
        let label = fm.label.as_deref().unwrap_or("Family");
        if let (Some(fn_), Some(ln)) = (&fm.first_name, &fm.last_name) {
            if !fn_.is_empty() && !ln.is_empty() {
                let full = format!("{} {}", fn_, ln);
                let ff = pick_plausible(FIRST_NAMES, i + 3);
                let fl = pick_plausible(LAST_NAMES, i + 7);
                let rep = if plausible { format!("{} {}", ff, fl) } else { format!("{}{}{}",  l, label, r) };
                rules.push(Rule { find: full, replace: rep, label: label.into(), is_regex: false, case_preserve: plausible });
            }
        }
        if let Some(fn_) = &fm.first_name {
            if !fn_.is_empty() {
                let ff = pick_plausible(FIRST_NAMES, i + 3);
                let rep = if plausible { ff } else { format!("{}{} First{}", l, label, r) };
                rules.push(Rule { find: fn_.clone(), replace: rep, label: format!("{} First", label), is_regex: false, case_preserve: plausible });
            }
        }
        if let Some(ln) = &fm.last_name {
            if !ln.is_empty() {
                let fl = pick_plausible(LAST_NAMES, i + 7);
                let rep = if plausible { fl } else { format!("{}{} Last{}", l, label, r) };
                rules.push(Rule { find: ln.clone(), replace: rep, label: format!("{} Last", label), is_regex: false, case_preserve: plausible });
            }
        }
        if let Some(phone) = &fm.phone {
            if !phone.is_empty() {
                let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
                if digits.len() >= 7 {
                    let sep = r"[\s.\-()]*";
                    let pattern = digits.chars().map(|c| c.to_string()).collect::<Vec<_>>().join(sep);
                    let fake_phone = "555-000-0000".to_string(); // Simple fake for family
                    let rep = if plausible { fake_phone } else { format!("{}{} Phone{}", l, label, r) };
                    rules.push(Rule { find: pattern, replace: rep, label: format!("{} Phone", label), is_regex: true, case_preserve: false });
                }
            }
        }
    }

    // Usernames
    for (i, u) in settings.usernames.iter().enumerate() {
        if let Some(val) = &u.value {
            if !val.is_empty() {
                let rep = if plausible {
                    if let Some(p) = &u.plausible {
                        if !p.is_empty() {
                            p.clone()
                        } else {
                            format!("{}User{}{}", l, i + 1, r)
                        }
                    } else {
                        format!("{}User{}{}", l, i + 1, r)
                    }
                } else {
                    format!("{}Username {}{}", l, i + 1, r)
                };
                rules.push(Rule { find: val.clone(), replace: rep, label: format!("Username {}", i + 1), is_regex: false, case_preserve: false });
            }
        }
    }

    // Custom redactions
    for (i, c) in settings.custom_redactions.iter().enumerate() {
        if let (Some(find), Some(label)) = (&c.find, &c.label) {
            if !find.is_empty() && !label.is_empty() {
                let rep = if plausible {
                    if let Some(p) = &c.plausible {
                        if !p.is_empty() {
                            p.clone()
                        } else {
                            format!("{}Custom {}{}", l, i + 1, r)
                        }
                    } else {
                        format!("{}Custom {}{}", l, i + 1, r)
                    }
                } else {
                    format!("{}{}{}", l, label, r)
                };
                rules.push(Rule { find: find.clone(), replace: rep, label: label.clone(), is_regex: false, case_preserve: false });
            }
        }
    }

    // Sort non-regex rules longest-first so longer matches take priority
    rules.sort_by(|a, b| {
        if a.is_regex && !b.is_regex { std::cmp::Ordering::Greater }
        else if !a.is_regex && b.is_regex { std::cmp::Ordering::Less }
        else { b.find.len().cmp(&a.find.len()) }
    });

    rules
}

fn apply_case(replacement: &str, original: &str) -> String {
    if original.chars().all(|c| c.is_uppercase() || !c.is_alphabetic()) {
        return replacement.to_uppercase();
    }
    if original.chars().all(|c| c.is_lowercase() || !c.is_alphabetic()) {
        return replacement.to_lowercase();
    }
    // Title case: first char upper
    let mut chars = replacement.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

fn escape_regex(s: &str) -> String {
    let special = r"\.+*?()|[]{}^$#&-~";
    s.chars().flat_map(|c| {
        if special.contains(c) { vec!['\\', c] } else { vec![c] }
    }).collect()
}

pub fn run_redaction(req: RedactRequest) -> RedactResult {
    let rules = build_rules(&req.settings);
    let mut text = req.text.clone();
    let mut report: Vec<RedactionEntry> = Vec::new();

    for rule in &rules {
        let mut count = 0usize;

        if rule.is_regex {
            if let Ok(re) = Regex::new(&rule.find) {
                let result = re.replace_all(&text, |_caps: &regex::Captures| {
                    count += 1;
                    rule.replace.clone()
                });
                text = result.into_owned();
            }
        } else {
            // Case-insensitive literal replacement
            let pattern = format!("(?i){}", escape_regex(&rule.find));
            if let Ok(re) = Regex::new(&pattern) {
                let rep = rule.replace.clone();
                let preserve = rule.case_preserve;
                let result = re.replace_all(&text, |caps: &regex::Captures| {
                    count += 1;
                    if preserve {
                        apply_case(&rep, &caps[0])
                    } else {
                        rep.clone()
                    }
                });
                text = result.into_owned();
            }
        }

        if count > 0 {
            report.push(RedactionEntry {
                original: rule.find.clone(),
                replaced_with: rule.replace.clone(),
                count,
            });
        }
    }

    // Leak detection
    let leaks = detect_leaks(&text, &req.settings);

    RedactResult { output: text, report, leaks }
}

fn detect_leaks(redacted: &str, settings: &RedactorSettings) -> Vec<LeakEntry> {
    let mut leaks: Vec<LeakEntry> = Vec::new();
    let lower = redacted.to_lowercase();

    let mut check = |val: &str, label: &str, severity: &str| {
        if val.len() < 3 { return; }
        if lower.contains(&val.to_lowercase()) {
            leaks.push(LeakEntry {
                severity: severity.into(),
                found: val.into(),
                message: format!("\"{}\" ({}) still appears in output", val, label),
            });
        }
    };

    let p = &settings.primary;
    if let Some(v) = &p.first_name { check(v, "First Name", "high"); }
    if let Some(v) = &p.last_name  { check(v, "Last Name",  "high"); }
    if let Some(v) = &p.email      { check(v, "Email",      "high"); }
    if let Some(v) = &p.phone      { check(v, "Phone",      "high"); }
    if let Some(v) = &p.city       { check(v, "City",       "medium"); }
    for fm in &settings.family_members {
        let lbl = fm.label.as_deref().unwrap_or("Family");
        if let Some(v) = &fm.first_name { check(v, lbl, "medium"); }
        if let Some(v) = &fm.last_name  { check(v, lbl, "medium"); }
        if let Some(v) = &fm.phone      { check(v, lbl, "medium"); }
    }
    for u in &settings.usernames {
        if let Some(v) = &u.value { check(v, "Username", "medium"); }
    }

    // Pattern Leaks (looking for things that look like PII but aren't redacted)
    let email_re = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}").unwrap();
    for mat in email_re.find_iter(redacted) {
        let found = mat.as_str();
        // Check if it's already inside a bracket (simple heuristic)
        if !found.starts_with(&settings.left_wrap) {
            leaks.push(LeakEntry {
                severity: "high".into(),
                found: found.into(),
                message: "Unredacted email pattern detected".into(),
            });
        }
    }

    let phone_re = Regex::new(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b").unwrap();
    for mat in phone_re.find_iter(redacted) {
        let found = mat.as_str();
        if !found.starts_with(&settings.left_wrap) {
            leaks.push(LeakEntry {
                severity: "medium".into(),
                found: found.into(),
                message: "Unredacted phone pattern detected".into(),
            });
        }
    }

    // Deduplicate
    leaks.dedup_by(|a, b| a.found == b.found);
    leaks
}
