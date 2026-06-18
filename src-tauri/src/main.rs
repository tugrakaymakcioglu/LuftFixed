use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    env, fs,
    path::PathBuf,
    process::Command,
};

const DEFAULT_CATALOG: &str = include_str!("../../public/catalog/actions.tr.json");

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DetectedSystem {
    operating_system: String,
    distribution: String,
    version: String,
    desktop_environment: String,
    package_manager: String,
    kernel: String,
    architecture: String,
    hostname: String,
    is_linux: bool,
    can_run_commands: bool,
    admin_method: String,
    confidence: String,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActionDefinition {
    id: String,
    title: String,
    description: String,
    category: String,
    impact: String,
    requires_admin: bool,
    reversible: bool,
    supported: bool,
    safety: String,
    estimated_duration: String,
    commands: Vec<CommandStep>,
    tags: Vec<String>,
    package_managers: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandStep {
    program: String,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    requires_admin: bool,
    #[serde(default)]
    preview: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExecutionResult {
    action_id: String,
    status: String,
    logs: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogFile {
    schema_version: u32,
    actions: Vec<CatalogAction>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogAction {
    id: String,
    title: String,
    description: String,
    category: String,
    impact: String,
    requires_admin: bool,
    reversible: bool,
    safety: String,
    estimated_duration: String,
    tags: Vec<String>,
    commands: HashMap<String, Vec<RawCommandStep>>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawCommandStep {
    program: String,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    requires_admin: bool,
}

#[tauri::command]
fn detect_system() -> DetectedSystem {
    let is_linux = cfg!(target_os = "linux");
    let os_release = if is_linux {
        parse_os_release("/etc/os-release")
    } else {
        HashMap::new()
    };
    let package_manager = if is_linux {
        detect_package_manager(&os_release).unwrap_or_else(|| "unknown".to_string())
    } else {
        "unsupported".to_string()
    };
    let has_pkexec = is_linux && command_exists("pkexec");

    let mut warnings = Vec::new();

    if !is_linux {
        warnings.push(
            "Bu uygulama gerçek komut çalıştırmayı yalnızca Linux üzerinde destekler.".to_string(),
        );
    }

    if package_manager == "unknown" {
        warnings.push("Desteklenen paket yöneticisi algılanamadı.".to_string());
    }

    if is_linux && !has_pkexec {
        warnings.push(
            "Polkit/pkexec bulunamadı; yönetici yetkisi gerektiren işlemler çalıştırılamaz."
                .to_string(),
        );
    }

    DetectedSystem {
        operating_system: if is_linux {
            "Linux".to_string()
        } else {
            env::consts::OS.to_string()
        },
        distribution: os_release
            .get("NAME")
            .cloned()
            .unwrap_or_else(|| env::consts::OS.to_string()),
        version: os_release
            .get("VERSION_ID")
            .or_else(|| os_release.get("VERSION"))
            .cloned()
            .unwrap_or_default(),
        desktop_environment: detect_desktop_environment(),
        package_manager,
        kernel: detect_kernel(),
        architecture: env::consts::ARCH.to_string(),
        hostname: detect_hostname(),
        is_linux,
        can_run_commands: is_linux && has_pkexec,
        admin_method: if has_pkexec { "pkexec" } else { "Yok" }.to_string(),
        confidence: if is_linux {
            "/etc/os-release, PATH ve sistem komutları".to_string()
        } else {
            "Desteklenmeyen işletim sistemi".to_string()
        },
        warnings,
    }
}

#[tauri::command]
fn list_actions(package_manager: String) -> Result<Vec<ActionDefinition>, String> {
    let catalog = load_catalog()?;
    Ok(action_catalog(&catalog, &package_manager))
}

#[tauri::command]
fn run_action(
    action_id: String,
    package_manager: String,
    dry_run: bool,
) -> Result<ExecutionResult, String> {
    let catalog = load_catalog()?;
    let action = catalog
        .actions
        .iter()
        .find(|candidate| candidate.id == action_id)
        .ok_or_else(|| "İşlem kataloğunda bu kayıt bulunamadı.".to_string())?;
    let resolved_package_manager = resolve_package_manager(&package_manager);
    let steps = action
        .commands
        .get(&resolved_package_manager)
        .ok_or_else(|| "Bu işlem algılanan paket yöneticisi için desteklenmiyor.".to_string())?;
    let commands = build_command_steps(steps)?;

    if dry_run {
        let mut logs = vec![
            "Güvenli önizleme modu: sistemde değişiklik yapılmadı.".to_string(),
            format!("İşlem kimliği: {action_id}"),
            format!("Paket yöneticisi: {resolved_package_manager}"),
        ];
        logs.extend(
            commands
                .iter()
                .map(|command| format!("$ {}", command.preview)),
        );

        return Ok(ExecutionResult {
            action_id,
            status: "dry-run".to_string(),
            logs,
        });
    }

    if !cfg!(target_os = "linux") {
        return Err("Gerçek komut yürütme yalnızca Linux üzerinde desteklenir.".to_string());
    }

    let mut logs = Vec::new();

    for command in &commands {
        logs.push(format!("$ {}", command.preview));

        match run_command(command) {
            Ok(output) => logs.extend(output),
            Err(error) => {
                logs.push(error);
                return Ok(ExecutionResult {
                    action_id,
                    status: "failed".to_string(),
                    logs,
                });
            }
        }
    }

    Ok(ExecutionResult {
        action_id,
        status: "completed".to_string(),
        logs,
    })
}

fn load_catalog() -> Result<CatalogFile, String> {
    let contents = catalog_override_path()
        .and_then(|path| fs::read_to_string(path).ok())
        .or_else(|| fs::read_to_string(dev_catalog_path()).ok())
        .unwrap_or_else(|| DEFAULT_CATALOG.to_string());
    let catalog: CatalogFile = serde_json::from_str(&contents)
        .map_err(|error| format!("İşlem kataloğu okunamadı: {error}"))?;

    validate_catalog(&catalog)?;
    Ok(catalog)
}

fn catalog_override_path() -> Option<PathBuf> {
    env::var_os("LUFTFIXED_CATALOG_PATH").map(PathBuf::from)
}

fn dev_catalog_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../public/catalog/actions.tr.json")
}

fn validate_catalog(catalog: &CatalogFile) -> Result<(), String> {
    if catalog.schema_version != 1 {
        return Err("İşlem kataloğu şeması desteklenmiyor.".to_string());
    }

    let mut ids = HashSet::new();

    for action in &catalog.actions {
        if action.id.trim().is_empty() || !ids.insert(action.id.as_str()) {
            return Err(format!(
                "Geçersiz veya tekrar eden işlem kimliği: {}",
                action.id
            ));
        }

        for steps in action.commands.values() {
            let _ = build_command_steps(steps)?;
        }
    }

    Ok(())
}

fn action_catalog(catalog: &CatalogFile, package_manager: &str) -> Vec<ActionDefinition> {
    catalog
        .actions
        .iter()
        .map(|raw| {
            let package_managers = package_managers_for(raw);
            let commands = raw
                .commands
                .get(package_manager)
                .and_then(|steps| build_command_steps(steps).ok())
                .unwrap_or_default();

            ActionDefinition {
                id: raw.id.clone(),
                title: raw.title.clone(),
                description: raw.description.clone(),
                category: raw.category.clone(),
                impact: raw.impact.clone(),
                requires_admin: raw.requires_admin,
                reversible: raw.reversible,
                supported: !commands.is_empty(),
                safety: raw.safety.clone(),
                estimated_duration: raw.estimated_duration.clone(),
                commands,
                tags: raw.tags.clone(),
                package_managers,
            }
        })
        .collect()
}

fn package_managers_for(action: &CatalogAction) -> Vec<String> {
    let mut package_managers: Vec<String> = action.commands.keys().cloned().collect();
    package_managers.sort();
    package_managers
}

fn build_command_steps(steps: &[RawCommandStep]) -> Result<Vec<CommandStep>, String> {
    steps
        .iter()
        .map(|step| {
            validate_program_name(&step.program)?;

            let mut command = CommandStep {
                program: step.program.clone(),
                args: step.args.clone(),
                requires_admin: step.requires_admin,
                preview: String::new(),
            };
            command.preview = display_command(&command);
            Ok(command)
        })
        .collect()
}

fn validate_program_name(program: &str) -> Result<(), String> {
    if program.trim().is_empty()
        || program.contains('/')
        || program.contains('\\')
        || program.chars().any(char::is_whitespace)
    {
        return Err(format!("Güvensiz komut programı: {program}"));
    }

    Ok(())
}

fn resolve_package_manager(requested: &str) -> String {
    if cfg!(target_os = "linux") {
        let os_release = parse_os_release("/etc/os-release");
        detect_package_manager(&os_release).unwrap_or_else(|| requested.to_string())
    } else {
        requested.to_string()
    }
}

fn run_command(step: &CommandStep) -> Result<Vec<String>, String> {
    let mut command = if step.requires_admin {
        if !command_exists("pkexec") {
            return Err("pkexec bulunamadı; yönetici yetkisi alınamadı.".to_string());
        }

        let mut command = Command::new("pkexec");
        command.arg(&step.program);
        command
    } else {
        Command::new(&step.program)
    };

    command.args(&step.args);

    let output = command
        .output()
        .map_err(|error| format!("Komut başlatılamadı: {error}"))?;
    let mut logs = Vec::new();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !stdout.is_empty() {
        logs.push(stdout);
    }

    if !stderr.is_empty() {
        logs.push(stderr);
    }

    if output.status.success() {
        Ok(logs)
    } else {
        Err(format!(
            "Komut çıkış kodu başarısız: {}",
            output
                .status
                .code()
                .map_or_else(|| "sinyal ile durdu".to_string(), |code| code.to_string())
        ))
    }
}

fn display_command(command: &CommandStep) -> String {
    let mut parts = Vec::new();

    if command.requires_admin {
        parts.push("pkexec".to_string());
    }

    parts.push(command.program.clone());
    parts.extend(command.args.iter().map(|arg| quote_arg(arg)));
    parts.join(" ")
}

fn quote_arg(arg: &str) -> String {
    if arg.chars().any(char::is_whitespace) {
        format!("\"{}\"", arg.replace('"', "\\\""))
    } else {
        arg.to_string()
    }
}

fn parse_os_release(path: &str) -> HashMap<String, String> {
    let mut values = HashMap::new();

    let Ok(contents) = fs::read_to_string(path) else {
        return values;
    };

    for line in contents.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        if let Some((key, value)) = trimmed.split_once('=') {
            values.insert(
                key.to_string(),
                value.trim_matches('"').replace("\\\"", "\""),
            );
        }
    }

    values
}

fn detect_package_manager(os_release: &HashMap<String, String>) -> Option<String> {
    let mut candidates = Vec::new();
    let distro_hint = format!(
        "{} {}",
        os_release.get("ID").map(String::as_str).unwrap_or_default(),
        os_release
            .get("ID_LIKE")
            .map(String::as_str)
            .unwrap_or_default()
    );

    if distro_hint.contains("debian") || distro_hint.contains("ubuntu") {
        candidates.push("apt");
    }

    if distro_hint.contains("fedora") || distro_hint.contains("rhel") {
        candidates.push("dnf");
    }

    if distro_hint.contains("arch") {
        candidates.push("pacman");
    }

    if distro_hint.contains("suse") {
        candidates.push("zypper");
    }

    for fallback in ["apt", "dnf", "pacman", "zypper"] {
        if !candidates.contains(&fallback) {
            candidates.push(fallback);
        }
    }

    candidates
        .into_iter()
        .find(|candidate| command_exists(candidate))
        .map(str::to_string)
}

fn command_exists(binary: &str) -> bool {
    Command::new("sh")
        .arg("-lc")
        .arg(format!("command -v {binary} >/dev/null 2>&1"))
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn detect_desktop_environment() -> String {
    env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| env::var("DESKTOP_SESSION"))
        .unwrap_or_else(|_| "Bilinmiyor".to_string())
}

fn detect_kernel() -> String {
    if cfg!(target_os = "linux") {
        return Command::new("uname")
            .arg("-r")
            .output()
            .ok()
            .and_then(|output| String::from_utf8(output.stdout).ok())
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "Bilinmiyor".to_string());
    }

    "Desteklenmiyor".to_string()
}

fn detect_hostname() -> String {
    fs::read_to_string("/etc/hostname")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| env::var("HOSTNAME").ok())
        .or_else(|| env::var("COMPUTERNAME").ok())
        .unwrap_or_else(|| "luftfixed".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_system,
            list_actions,
            run_action
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LuftFixed");
}
