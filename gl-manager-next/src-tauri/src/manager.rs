use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Cursor, Read};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};
use thiserror::Error;
use zip::ZipArchive;

const APP_DIR: &str = "GLR_Manager";
const PROFILES_DIR: &str = "Profiles";
const CURRENT_APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Error)]
pub enum ManagerError {
    #[error("Could not locate the local application data directory")]
    MissingDataDir,
    #[error("Profile name is empty")]
    EmptyProfileName,
    #[error("The last remaining profile cannot be deleted")]
    LastProfileDelete,
    #[error("Profile already exists")]
    ProfileExists,
    #[error("Profile not found")]
    ProfileNotFound,
    #[error("File operation failed: {0}")]
    Io(String),
    #[error("JSON operation failed: {0}")]
    Json(String),
    #[error("Network request failed: {0}")]
    Network(String),
    #[error("Target path is not configured")]
    MissingTargetPath,
    #[error("Steam installation could not be detected")]
    SteamNotFound,
    #[error("Selected path does not contain Steam.exe")]
    InvalidSteamPath,
    #[error("Selected path does not contain required GreenLuma files")]
    InvalidGreenLumaPath,
    #[error("GreenLuma DLLInjector.ini was not found")]
    MissingDllInjectorIni,
    #[error("GreenLuma x64 DLL was not found")]
    MissingGreenLumaDll,
    #[error("Required GreenLuma files are missing: {0}")]
    MissingGreenLumaRuntimeFiles(String),
    #[error("Steam did not close in time")]
    SteamShutdownTimeout,
    #[error("GreenLuma download URL is not configured")]
    MissingDownloadUrl,
    #[error("Manifest URL is not configured")]
    MissingManifestUrl,
    #[error("No update is available")]
    NoUpdateAvailable,
    #[error("ZIP extraction failed: {0}")]
    Zip(String),
}

impl serde::Serialize for ManagerError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type Result<T> = std::result::Result<T, ManagerError>;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Profile {
    pub name: String,
    pub games: Vec<AppEntry>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Settings {
    #[serde(default)]
    pub steam_path: String,
    #[serde(default)]
    pub greenluma_path: String,
    #[serde(default = "default_true")]
    pub no_hook: bool,
    #[serde(default = "default_profile")]
    pub last_profile: String,
    #[serde(default = "default_true")]
    pub check_update: bool,
    #[serde(default)]
    pub use_steamdb: bool,
    #[serde(default = "default_true")]
    pub manager_msg: bool,
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default)]
    pub onboarding_completed: bool,
    #[serde(default = "default_greenluma_url")]
    pub greenluma_download_url: String,
    #[serde(default = "default_update_manifest_url")]
    pub app_update_manifest_url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: String,
    pub url: String,
    pub notes: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PrepareResult {
    pub app_count: usize,
    pub app_list_path: String,
    pub steam_exe: String,
    pub injector_exe: String,
    pub injector_ini: String,
    pub greenluma_dll: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GreenLumaHealth {
    pub ok: bool,
    pub path: String,
    pub missing: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            steam_path: String::new(),
            greenluma_path: String::new(),
            no_hook: true,
            last_profile: "default".to_string(),
            check_update: true,
            use_steamdb: false,
            manager_msg: true,
            language: default_language(),
            onboarding_completed: false,
            greenluma_download_url: default_greenluma_url(),
            app_update_manifest_url: default_update_manifest_url(),
        }
    }
}

fn default_true() -> bool {
    true
}

fn default_profile() -> String {
    "default".to_string()
}

fn default_language() -> String {
    "en".to_string()
}

fn default_greenluma_url() -> String {
    option_env!("GL_MANAGER_GREENLUMA_ZIP_URL")
        .unwrap_or("")
        .to_string()
}

fn default_greenluma_manifest_url() -> String {
    option_env!("GL_MANAGER_GREENLUMA_MANIFEST_URL")
        .unwrap_or("https://worker.glnbyharman.workers.dev/greenluma/latest.json")
        .to_string()
}

fn default_update_manifest_url() -> String {
    option_env!("GL_MANAGER_UPDATE_MANIFEST_URL")
        .unwrap_or("https://worker.glnbyharman.workers.dev/manager/latest.json")
        .to_string()
}

fn localized_profile_name(language: &str) -> &'static str {
    match language {
        "tr" => "Varsayılan",
        "zh" => "默认",
        "ru" => "По умолчанию",
        _ => "Default",
    }
}

fn base_path() -> Result<PathBuf> {
    dirs::data_local_dir()
        .map(|dir| dir.join(APP_DIR))
        .ok_or(ManagerError::MissingDataDir)
}

fn profiles_path() -> Result<PathBuf> {
    Ok(base_path()?.join(PROFILES_DIR))
}

fn settings_path() -> Result<PathBuf> {
    Ok(base_path()?.join("config.json"))
}

fn ensure_storage() -> Result<()> {
    fs::create_dir_all(profiles_path()?).map_err(|err| ManagerError::Io(err.to_string()))?;
    if !settings_path()?.exists() {
        write_settings(&Settings::default())?;
    }
    if fs::read_dir(profiles_path()?)
        .map_err(|err| ManagerError::Io(err.to_string()))?
        .next()
        .is_none()
    {
        write_profile(&Profile {
            name: "default".to_string(),
            games: Vec::new(),
        })?;
    }
    Ok(())
}

fn read_settings() -> Result<Settings> {
    ensure_storage()?;
    let raw =
        fs::read_to_string(settings_path()?).map_err(|err| ManagerError::Io(err.to_string()))?;
    let mut settings: Settings =
        serde_json::from_str(&raw).map_err(|err| ManagerError::Json(err.to_string()))?;
    if settings.app_update_manifest_url.trim().is_empty()
        || settings.app_update_manifest_url.contains(".r2.dev/")
    {
        settings.app_update_manifest_url = default_update_manifest_url();
        write_settings(&settings)?;
    }
    Ok(settings)
}

fn write_settings(settings: &Settings) -> Result<()> {
    fs::create_dir_all(base_path()?).map_err(|err| ManagerError::Io(err.to_string()))?;
    let raw = serde_json::to_string_pretty(settings)
        .map_err(|err| ManagerError::Json(err.to_string()))?;
    fs::write(settings_path()?, raw).map_err(|err| ManagerError::Io(err.to_string()))
}

fn profile_file(name: &str) -> Result<PathBuf> {
    Ok(profiles_path()?.join(format!("{name}.json")))
}

fn read_profile(path: &Path) -> Result<Profile> {
    let raw = fs::read_to_string(path).map_err(|err| ManagerError::Io(err.to_string()))?;
    serde_json::from_str(&raw).map_err(|err| ManagerError::Json(err.to_string()))
}

fn write_profile(profile: &Profile) -> Result<()> {
    fs::create_dir_all(profiles_path()?).map_err(|err| ManagerError::Io(err.to_string()))?;
    let raw =
        serde_json::to_string_pretty(profile).map_err(|err| ManagerError::Json(err.to_string()))?;
    fs::write(profile_file(&profile.name)?, raw).map_err(|err| ManagerError::Io(err.to_string()))
}

#[tauri::command]
pub fn get_settings() -> Result<Settings> {
    read_settings()
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<Settings> {
    write_settings(&settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>> {
    ensure_storage()?;
    let mut profiles = Vec::new();
    for entry in fs::read_dir(profiles_path()?).map_err(|err| ManagerError::Io(err.to_string()))? {
        let entry = entry.map_err(|err| ManagerError::Io(err.to_string()))?;
        if entry.path().extension().is_some_and(|ext| ext == "json") {
            profiles.push(read_profile(&entry.path())?);
        }
    }
    profiles.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(profiles)
}

#[tauri::command]
pub fn create_profile(name: String) -> Result<Profile> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(ManagerError::EmptyProfileName);
    }
    if profile_file(trimmed)?.exists() {
        return Err(ManagerError::ProfileExists);
    }
    let profile = Profile {
        name: trimmed.to_string(),
        games: Vec::new(),
    };
    write_profile(&profile)?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(name: String) -> Result<()> {
    if list_profiles()?.len() <= 1 {
        return Err(ManagerError::LastProfileDelete);
    }
    let file = profile_file(&name)?;
    if !file.exists() {
        return Err(ManagerError::ProfileNotFound);
    }
    fs::remove_file(file).map_err(|err| ManagerError::Io(err.to_string()))
}

#[tauri::command]
pub fn rename_profile(old_name: String, new_name: String) -> Result<Profile> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err(ManagerError::EmptyProfileName);
    }
    if trimmed.contains('\\') || trimmed.contains('/') {
        return Err(ManagerError::Io(
            "Profile name cannot contain path separators".to_string(),
        ));
    }

    let old_file = profile_file(&old_name)?;
    if !old_file.exists() {
        return Err(ManagerError::ProfileNotFound);
    }
    if old_name == trimmed {
        return read_profile(&old_file);
    }
    let new_file = profile_file(trimmed)?;
    if new_file.exists() {
        return Err(ManagerError::ProfileExists);
    }

    let mut profile = read_profile(&old_file)?;
    profile.name = trimmed.to_string();
    write_profile(&profile)?;
    fs::remove_file(old_file).map_err(|err| ManagerError::Io(err.to_string()))?;

    let mut settings = read_settings()?;
    if settings.last_profile == old_name {
        settings.last_profile = profile.name.clone();
        write_settings(&settings)?;
    }

    Ok(profile)
}

#[tauri::command]
pub fn localize_initial_profile(language: String) -> Result<Profile> {
    let profiles = list_profiles()?;
    let target_name = localized_profile_name(language.trim());

    if profiles.len() == 1 {
        let current = &profiles[0];
        if current.name == "default"
            && current.name != target_name
            && !profile_file(target_name)?.exists()
        {
            let renamed = rename_profile(current.name.clone(), target_name.to_string())?;
            let mut settings = read_settings()?;
            settings.last_profile = renamed.name.clone();
            write_settings(&settings)?;
            return Ok(renamed);
        }

        let mut settings = read_settings()?;
        settings.last_profile = current.name.clone();
        write_settings(&settings)?;
        return Ok(current.clone());
    }

    let settings = read_settings()?;
    if let Some(profile) = profiles
        .iter()
        .find(|profile| profile.name == settings.last_profile)
    {
        return Ok(profile.clone());
    }
    profiles
        .into_iter()
        .next()
        .ok_or(ManagerError::ProfileNotFound)
}

#[tauri::command]
pub fn update_profile_games(name: String, games: Vec<AppEntry>) -> Result<Profile> {
    let mut profile = read_profile(&profile_file(&name)?)?;
    profile.games = games;
    write_profile(&profile)?;
    Ok(profile)
}

#[tauri::command]
pub fn export_app_list(profile: Profile, target_path: Option<String>) -> Result<usize> {
    let target_root = target_path
        .or_else(|| read_settings().ok().map(|settings| settings.greenluma_path))
        .filter(|path| !path.trim().is_empty())
        .ok_or(ManagerError::MissingTargetPath)?;
    write_app_list(&profile, &PathBuf::from(target_root))
}

#[tauri::command]
pub fn prepare_runtime(
    profile: Profile,
    steam_path: Option<String>,
    greenluma_path: Option<String>,
) -> Result<PrepareResult> {
    let settings = read_settings()?;
    let steam_input = steam_path
        .or_else(|| Some(settings.steam_path.clone()))
        .filter(|path| !path.trim().is_empty())
        .ok_or(ManagerError::InvalidSteamPath)?;
    let greenluma_input = greenluma_path
        .or_else(|| Some(settings.greenluma_path.clone()))
        .filter(|path| !path.trim().is_empty())
        .ok_or(ManagerError::MissingTargetPath)?;

    let steam_dir = steam_dir_from_input(&steam_input);
    let steam_exe = steam_dir.join("Steam.exe");
    if !steam_exe.is_file() {
        return Err(ManagerError::InvalidSteamPath);
    }

    let greenluma_dir = PathBuf::from(greenluma_input.trim());
    if !is_valid_greenluma_dir(&greenluma_dir) {
        return Err(ManagerError::InvalidGreenLumaPath);
    }
    let health = greenluma_health_for_dir(&greenluma_dir);
    if !health.ok {
        return Err(ManagerError::MissingGreenLumaRuntimeFiles(
            health.missing.join(", "),
        ));
    }

    let injector_exe = greenluma_dir.join("DLLInjector.exe");
    let injector_ini = greenluma_dir.join("DLLInjector.ini");
    if !injector_ini.is_file() {
        return Err(ManagerError::MissingDllInjectorIni);
    }
    let greenluma_dll = find_greenluma_x64_dll(&greenluma_dir)?;

    let steam_exe_value = steam_exe.to_string_lossy().to_string();
    let dll_value = greenluma_dll.to_string_lossy().to_string();
    let raw_ini =
        fs::read_to_string(&injector_ini).map_err(|err| ManagerError::Io(err.to_string()))?;

    let mut updated = raw_ini;

    updated = update_ini_value(&updated, "UseFullPathsFromIni", "1");
    updated = update_ini_value(&updated, "WaitForProcessTermination", "0");
    updated = update_ini_value(&updated, "EnableFakeParentProcess", "1");
    updated = update_ini_value(&updated, "CreateFiles", "2");
    updated = update_ini_value(&updated, "FileToCreate_1", "NoQuestion.bin");
    updated = update_ini_value(&updated, "FileToCreate_2", "StealthMode.bin");
    updated = update_ini_value(&updated, "CommandLine", "");
    updated = update_ini_value(&updated, "Exe", &steam_exe_value);
    updated = update_ini_value(&updated, "Dll", &dll_value);

    fs::write(&injector_ini, updated).map_err(|err| ManagerError::Io(err.to_string()))?;

    let app_count = write_app_list(&profile, &greenluma_dir)?;

    //

    shutdown_steam_and_wait(&steam_exe)?;

    start_dllinjector(&injector_exe)?;

    Ok(PrepareResult {
        app_count,
        app_list_path: greenluma_dir.join("AppList").to_string_lossy().to_string(),
        steam_exe: steam_exe.to_string_lossy().to_string(),
        injector_exe: injector_exe.to_string_lossy().to_string(),
        injector_ini: injector_ini.to_string_lossy().to_string(),
        greenluma_dll: greenluma_dll.to_string_lossy().to_string(),
    })
}

fn write_app_list(profile: &Profile, target_root: &Path) -> Result<usize> {
    let app_list_path = target_root.join("AppList");
    if app_list_path.exists() {
        fs::remove_dir_all(&app_list_path).map_err(|err| ManagerError::Io(err.to_string()))?;
    }
    fs::create_dir_all(&app_list_path).map_err(|err| ManagerError::Io(err.to_string()))?;
    for (index, game) in profile.games.iter().enumerate() {
        fs::write(app_list_path.join(format!("{index}.txt")), &game.id)
            .map_err(|err| ManagerError::Io(err.to_string()))?;
    }
    Ok(profile.games.len())
}

fn shutdown_steam_and_wait(steam_exe: &Path) -> Result<()> {
    if !is_steam_running()? {
        return Ok(());
    }

    Command::new(steam_exe)
        .arg("-shutdown")
        .spawn()
        .map_err(|err| ManagerError::Io(err.to_string()))?;

    let deadline = Instant::now() + Duration::from_secs(30);
    while Instant::now() < deadline {
        if !is_steam_running()? {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(500));
    }

    Err(ManagerError::SteamShutdownTimeout)
}

fn update_ini_value(raw: &str, key: &str, value: &str) -> String {
    let mut found = false;
    let mut lines = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with(';') || trimmed.starts_with('#') || !trimmed.contains('=') {
            lines.push(line.to_string());
            continue;
        }

        let Some((left, _right)) = line.split_once('=') else {
            lines.push(line.to_string());
            continue;
        };

        if left.trim().eq_ignore_ascii_case(key) {
            lines.push(format!("{} = {}", left.trim(), value));
            found = true;
        } else {
            lines.push(line.to_string());
        }
    }

    if !found {
        lines.push(format!("{key} = {value}"));
    }

    lines.join("\n")
}

fn start_dllinjector(program_path: &PathBuf) -> Result<()> {
    let working_dir = program_path
        .parent()
        .ok_or_else(|| ManagerError::Io("DLLInjector parent folder not found".to_string()))?;

    std::process::Command::new(program_path)
        .current_dir(working_dir)
        .spawn()
        .map_err(|err| ManagerError::Io(err.to_string()))?;

    Ok(())
}

fn is_steam_running() -> Result<bool> {
    #[cfg(windows)]
    {
        let output = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq steam.exe", "/NH"])
            .output()
            .map_err(|err| ManagerError::Io(err.to_string()))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
        Ok(stdout.contains("steam.exe"))
    }

    #[cfg(not(windows))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub fn detect_steam_path() -> Result<String> {
    steam_candidates()
        .into_iter()
        .find(|path| path.join("Steam.exe").is_file())
        .map(|path| path.to_string_lossy().to_string())
        .ok_or(ManagerError::SteamNotFound)
}

#[tauri::command]
pub fn validate_steam_path(path: String) -> Result<String> {
    let steam_dir = steam_dir_from_input(&path);
    if steam_dir.join("Steam.exe").is_file() {
        Ok(steam_dir.to_string_lossy().to_string())
    } else {
        Err(ManagerError::InvalidSteamPath)
    }
}

#[tauri::command]
pub fn validate_greenluma_path(path: String) -> Result<String> {
    let candidate = PathBuf::from(path);
    if is_valid_greenluma_dir(&candidate) {
        Ok(candidate.to_string_lossy().to_string())
    } else {
        Err(ManagerError::InvalidGreenLumaPath)
    }
}

#[tauri::command]
pub fn check_greenluma_health(path: Option<String>) -> Result<GreenLumaHealth> {
    let target = path
        .or_else(|| read_settings().ok().map(|settings| settings.greenluma_path))
        .filter(|value| !value.trim().is_empty())
        .ok_or(ManagerError::MissingTargetPath)?;
    Ok(greenluma_health_for_dir(&PathBuf::from(target.trim())))
}

#[tauri::command]
pub fn install_greenluma_zip(target_path: String, download_url: Option<String>) -> Result<String> {
    let url = resolve_greenluma_download_url(download_url)?;
    let target_path = target_path.trim();
    if target_path.is_empty() {
        return Err(ManagerError::MissingTargetPath);
    }
    let target = PathBuf::from(target_path);
    fs::create_dir_all(&target).map_err(|err| ManagerError::Io(err.to_string()))?;

    let mut response = reqwest::blocking::get(url)
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .error_for_status()
        .map_err(|err| ManagerError::Network(err.to_string()))?;
    let mut bytes = Vec::new();
    response
        .read_to_end(&mut bytes)
        .map_err(|err| ManagerError::Network(err.to_string()))?;
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|err| ManagerError::Zip(err.to_string()))?;
    safe_extract_zip(&mut archive, &target)?;

    if let Some(installed_path) = find_greenluma_dir(&target, 3) {
        Ok(installed_path.to_string_lossy().to_string())
    } else {
        Err(ManagerError::InvalidGreenLumaPath)
    }
}

#[tauri::command]
pub fn install_managed_greenluma() -> Result<String> {
    let target = base_path()?.join("GreenLuma");
    let installed = install_greenluma_zip(target.to_string_lossy().to_string(), None)?;
    let mut settings = read_settings()?;
    settings.greenluma_path = installed.clone();
    write_settings(&settings)?;
    Ok(installed)
}

#[tauri::command]
pub fn repair_managed_greenluma() -> Result<String> {
    install_managed_greenluma()
}

#[tauri::command]
pub fn reset_app_data() -> Result<()> {
    let path = base_path()?;
    if path.exists() {
        fs::remove_dir_all(path).map_err(|err| ManagerError::Io(err.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub fn check_app_update() -> Result<UpdateInfo> {
    let settings = read_settings()?;
    let manifest_url = settings.app_update_manifest_url.trim().to_string();
    if manifest_url.is_empty() {
        return Err(ManagerError::MissingManifestUrl);
    }
    let manifest = fetch_json(&manifest_url)?;
    let version = manifest
        .get("version")
        .and_then(|value| value.as_str())
        .unwrap_or(CURRENT_APP_VERSION)
        .trim_start_matches('v')
        .to_string();
    let url = manifest
        .get("url")
        .or_else(|| manifest.get("download_url"))
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let notes = manifest
        .get("notes")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    Ok(UpdateInfo {
        available: version != CURRENT_APP_VERSION && !url.is_empty(),
        version,
        url,
        notes,
    })
}

#[tauri::command]
pub fn download_app_update() -> Result<String> {
    let info = check_app_update()?;
    if !info.available {
        return Err(ManagerError::NoUpdateAvailable);
    }
    let file_name = Path::new(&info.url)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| format!("GL-Manager-Next-{}.exe", info.version));
    let target = dirs::download_dir()
        .unwrap_or(std::env::temp_dir())
        .join(file_name);
    download_to_file(&info.url, &target)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn download_and_install_app_update() -> Result<String> {
    let file_path = download_app_update()?;
    let target = PathBuf::from(&file_path);
    let extension = target
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if extension == "msi" {
        Command::new("msiexec.exe")
            .arg("/i")
            .arg(&target)
            .spawn()
            .map_err(|err| ManagerError::Io(err.to_string()))?;
    } else {
        Command::new(&target)
            .spawn()
            .map_err(|err| ManagerError::Io(err.to_string()))?;
    }

    Ok(file_path)
}

fn resolve_greenluma_download_url(explicit_url: Option<String>) -> Result<String> {
    if let Some(url) = explicit_url.filter(|value| !value.trim().is_empty()) {
        return Ok(url);
    }
    let settings = read_settings()?;
    if !settings.greenluma_download_url.trim().is_empty() {
        return Ok(settings.greenluma_download_url);
    }
    let manifest_url = default_greenluma_manifest_url();
    if !manifest_url.trim().is_empty() {
        let manifest = fetch_json(&manifest_url)?;
        if let Some(url) = extract_download_url(&manifest) {
            return Ok(url);
        }
    }
    let default_url = default_greenluma_url();
    if !default_url.trim().is_empty() {
        return Ok(default_url);
    }
    Err(ManagerError::MissingDownloadUrl)
}

fn fetch_json(url: &str) -> Result<serde_json::Value> {
    reqwest::blocking::Client::new()
        .get(url)
        .header("User-Agent", "GL-Manager-Next")
        .send()
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .error_for_status()
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .json::<serde_json::Value>()
        .map_err(|err| ManagerError::Json(err.to_string()))
}

fn extract_download_url(value: &serde_json::Value) -> Option<String> {
    value
        .get("url")
        .or_else(|| value.get("download_url"))
        .and_then(|item| item.as_str())
        .map(ToString::to_string)
}

fn download_to_file(url: &str, target: &Path) -> Result<()> {
    let bytes = reqwest::blocking::Client::new()
        .get(url)
        .header("User-Agent", "GL-Manager-Next")
        .send()
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .error_for_status()
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .bytes()
        .map_err(|err| ManagerError::Network(err.to_string()))?;
    fs::write(target, bytes).map_err(|err| ManagerError::Io(err.to_string()))
}

fn steam_dir_from_input(input: &str) -> PathBuf {
    let path = PathBuf::from(input.trim());
    if path
        .file_name()
        .is_some_and(|name| name.to_string_lossy().eq_ignore_ascii_case("Steam.exe"))
    {
        path.parent().map(Path::to_path_buf).unwrap_or(path)
    } else {
        path
    }
}

fn is_valid_greenluma_dir(path: &Path) -> bool {
    path.join("DLLInjector.exe").is_file() && path.join("DLLInjector.ini").is_file()
}

fn greenluma_health_for_dir(path: &Path) -> GreenLumaHealth {
    let required = [
        "DLLInjector.exe",
        "GreenLuma_2026_x64.dll",
        "GreenLuma_2026_x86.dll",
    ];
    let missing = required
        .iter()
        .filter(|name| !path.join(name).is_file())
        .map(|name| (*name).to_string())
        .collect::<Vec<_>>();

    GreenLumaHealth {
        ok: missing.is_empty(),
        path: path.to_string_lossy().to_string(),
        missing,
    }
}

fn safe_extract_zip<R: Read + io::Seek>(archive: &mut ZipArchive<R>, target: &Path) -> Result<()> {
    for index in 0..archive.len() {
        let mut file = archive
            .by_index(index)
            .map_err(|err| ManagerError::Zip(err.to_string()))?;
        let Some(enclosed_name) = file.enclosed_name() else {
            continue;
        };
        let outpath = target.join(enclosed_name);

        if file.is_dir() {
            fs::create_dir_all(&outpath).map_err(|err| ManagerError::Zip(err.to_string()))?;
            continue;
        }

        if let Some(parent) = outpath.parent() {
            fs::create_dir_all(parent).map_err(|err| ManagerError::Zip(err.to_string()))?;
        }

        let mut outfile = fs::File::create(&outpath)
            .map_err(|err| ManagerError::Zip(format!("{}: {}", outpath.display(), err)))?;
        io::copy(&mut file, &mut outfile).map_err(|err| ManagerError::Zip(err.to_string()))?;
    }
    Ok(())
}

fn find_greenluma_dir(path: &Path, depth: usize) -> Option<PathBuf> {
    if is_valid_greenluma_dir(path) {
        return Some(path.to_path_buf());
    }
    if depth == 0 {
        return None;
    }
    let entries = fs::read_dir(path).ok()?;
    for entry in entries.flatten() {
        let candidate = entry.path();
        if candidate.is_dir() {
            if let Some(found) = find_greenluma_dir(&candidate, depth - 1) {
                return Some(found);
            }
        }
    }
    None
}

fn find_greenluma_x64_dll(path: &Path) -> Result<PathBuf> {
    let mut candidates = fs::read_dir(path)
        .map_err(|err| ManagerError::Io(err.to_string()))?
        .filter_map(|entry| entry.ok().map(|item| item.path()))
        .filter(|candidate| {
            candidate.is_file()
                && candidate
                    .file_name()
                    .map(|name| name.to_string_lossy().to_ascii_lowercase())
                    .is_some_and(|name| {
                        name.starts_with("greenluma_")
                            && name.ends_with("_x64.dll")
                            && name.contains("2026")
                    })
        })
        .collect::<Vec<_>>();
    candidates.sort();
    if let Some(candidate) = candidates.pop() {
        return Ok(candidate);
    }

    let mut fallback = fs::read_dir(path)
        .map_err(|err| ManagerError::Io(err.to_string()))?
        .filter_map(|entry| entry.ok().map(|item| item.path()))
        .filter(|candidate| {
            candidate.is_file()
                && candidate
                    .file_name()
                    .map(|name| name.to_string_lossy().to_ascii_lowercase())
                    .is_some_and(|name| {
                        name.starts_with("greenluma_") && name.ends_with("_x64.dll")
                    })
        })
        .collect::<Vec<_>>();
    fallback.sort();
    fallback.pop().ok_or(ManagerError::MissingGreenLumaDll)
}

fn steam_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
        use winreg::RegKey;

        for hive in [HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE] {
            let key = RegKey::predef(hive);
            for subkey in [
                "Software\\Valve\\Steam",
                "Software\\WOW6432Node\\Valve\\Steam",
            ] {
                if let Ok(steam_key) = key.open_subkey(subkey) {
                    if let Ok(path) = steam_key.get_value::<String, _>("SteamPath") {
                        candidates.push(PathBuf::from(path));
                    }
                    if let Ok(path) = steam_key.get_value::<String, _>("InstallPath") {
                        candidates.push(PathBuf::from(path));
                    }
                }
            }
        }
    }

    for env_key in ["PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA"] {
        if let Ok(value) = std::env::var(env_key) {
            candidates.push(PathBuf::from(value).join("Steam"));
        }
    }
    candidates.push(PathBuf::from("C:\\Program Files (x86)\\Steam"));
    candidates.push(PathBuf::from("C:\\Program Files\\Steam"));

    candidates
}

#[tauri::command]
pub fn search_apps(query: String) -> Result<Vec<AppEntry>> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let encoded = urlencoding::encode(query);
    let url = format!(
        "https://store.steampowered.com/search/results?term={encoded}&count=25&start=0&category1=998"
    );
    let html = reqwest::blocking::get(url)
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .text()
        .map_err(|err| ManagerError::Network(err.to_string()))?;
    let mut results = Vec::new();
    for result in parse_store_results(&html, query) {
        if let Some(store_url) = result.store_url.clone() {
            results.push(result.entry);
            results.extend(fetch_dlcs(&store_url).unwrap_or_default());
        } else {
            results.push(result.entry);
        }
    }
    Ok(results)
}

#[derive(Debug)]
struct StoreResult {
    entry: AppEntry,
    store_url: Option<String>,
}

fn parse_store_results(html: &str, query: &str) -> Vec<StoreResult> {
    let document = Html::parse_document(html);
    let row_selector = Selector::parse("a.search_result_row").expect("valid selector");
    let title_selector = Selector::parse("span.title").expect("valid selector");
    let normalized_query = normalize_query(query);

    document
        .select(&row_selector)
        .filter_map(|row| {
            let appid = row.value().attr("data-ds-appid")?;
            if appid.contains(',') {
                return None;
            }
            let name = row
                .select(&title_selector)
                .next()
                .map(|title| title.text().collect::<String>())?;
            if !normalize_query(&name).contains(&normalized_query) {
                return None;
            }
            Some(StoreResult {
                entry: AppEntry {
                    id: appid.to_string(),
                    name,
                    kind: "Game".to_string(),
                },
                store_url: row.value().attr("href").map(ToString::to_string),
            })
        })
        .collect()
}

fn fetch_dlcs(store_url: &str) -> Result<Vec<AppEntry>> {
    if !store_url.contains("/app/") {
        return Ok(Vec::new());
    }
    let Some(app_info) = store_url.split("/app/").nth(1) else {
        return Ok(Vec::new());
    };
    let segments = app_info.split('/').collect::<Vec<_>>();
    if segments.len() < 2 {
        return Ok(Vec::new());
    }
    let appid = segments[0];
    let slug = segments[1];
    let url = format!(
        "https://store.steampowered.com/dlc/{appid}/{slug}/ajaxgetfilteredrecommendations?sort=newreleases&count=64&start=0"
    );
    let response = reqwest::blocking::get(url)
        .map_err(|err| ManagerError::Network(err.to_string()))?
        .json::<serde_json::Value>()
        .map_err(|err| ManagerError::Network(err.to_string()))?;
    let html = response
        .get("results_html")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    Ok(parse_dlc_results(html))
}

fn parse_dlc_results(html: &str) -> Vec<AppEntry> {
    let document = Html::parse_fragment(html);
    let item_selector = Selector::parse("div.recommendation").expect("valid selector");
    let link_selector = Selector::parse("a[data-ds-appid]").expect("valid selector");
    let name_selector = Selector::parse("span.color_created").expect("valid selector");

    document
        .select(&item_selector)
        .filter_map(|item| {
            let appid = item
                .select(&link_selector)
                .next()
                .and_then(|link| link.value().attr("data-ds-appid"))?;
            let name = item
                .select(&name_selector)
                .next()
                .map(|name| name.text().collect::<String>())?;
            Some(AppEntry {
                id: appid.to_string(),
                name,
                kind: "DLC".to_string(),
            })
        })
        .collect()
}

fn normalize_query(value: &str) -> String {
    value
        .chars()
        .filter(|ch| !ch.is_whitespace() && !matches!(ch, '©' | '®' | '™'))
        .collect::<String>()
        .to_lowercase()
}
