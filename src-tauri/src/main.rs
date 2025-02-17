#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::sync::Mutex;
use tauri::State;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LotteryOptions {
    groups: serde_json::Value,
}

struct AppState {
    options: Mutex<Option<LotteryOptions>>,
    file_path: PathBuf,
}

fn get_app_data_dir() -> PathBuf {
    let mut path = tauri::api::path::app_data_dir(&tauri::Config::default()).expect("Failed to get app data directory");
    path.push("lottery-system");
    fs::create_dir_all(&path).expect("Failed to create app data directory");
    path.push("data.json");
    path
}

fn load_options_from_file(file_path: &PathBuf) -> Option<LotteryOptions> {
    match fs::read_to_string(file_path) {
        Ok(contents) => serde_json::from_str(&contents).ok(),
        Err(_) => None,
    }
}

fn save_options_to_file(options: &LotteryOptions, file_path: &PathBuf) -> Result<(), String> {
    let json = serde_json::to_string_pretty(options)
        .map_err(|e| e.to_string())?;
    fs::write(file_path, json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_options(
    state: State<'_, AppState>,
    options: LotteryOptions,
) -> Result<(), String> {
    save_options_to_file(&options, &state.file_path)?;
    *state.options.lock().unwrap() = Some(options);
    Ok(())
}

#[tauri::command]
async fn get_options(
    state: State<'_, AppState>,
) -> Result<Option<LotteryOptions>, String> {
    Ok(state.options.lock().unwrap().clone())
}

fn main() {
    let file_path = get_app_data_dir();
    let initial_options = load_options_from_file(&file_path);
    
    let app_state = AppState {
        options: Mutex::new(initial_options),
        file_path,
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![save_options, get_options])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 