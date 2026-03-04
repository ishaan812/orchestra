mod commands;
mod db;
mod names;

use std::process::Command;
use tauri::Manager;
use tracing::{info, warn};

fn check_xcode_cli_tools() {
    match Command::new("xcode-select").arg("-p").output() {
        Ok(output) if output.status.success() => {
            let path = String::from_utf8_lossy(&output.stdout);
            info!("Xcode CLI tools found at: {}", path.trim());
        }
        _ => {
            warn!("Xcode CLI tools not detected. Some features (like `gh`) may not work.");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    check_xcode_cli_tools();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::add_repo,
            commands::list_repos,
            commands::get_repo,
            commands::remove_repo,
            commands::reorder_repos,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match db::init_database(&app_handle).await {
                    Ok(pool) => {
                        app_handle.manage(db::DbPool(pool));
                        info!("Database pool stored in app state");
                    }
                    Err(e) => {
                        tracing::error!("Failed to initialize database: {}", e);
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
