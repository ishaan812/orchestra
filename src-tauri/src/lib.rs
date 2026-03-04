#[allow(dead_code)]
mod agents;
mod checkpoint;
mod commands;
mod context;
mod db;
mod env_vars;
mod git;
#[allow(dead_code)]
mod mcp;
mod names;
mod notes;
mod review;
mod scripts;
mod session;
mod terminal;
mod todos;
mod workspace;

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
            workspace::create_workspace,
            workspace::list_workspaces,
            workspace::get_workspace,
            workspace::archive_workspace,
            workspace::unarchive_workspace,
            workspace::delete_workspace,
            workspace::update_workspace,
            workspace::pin_workspace,
            workspace::unpin_workspace,
            workspace::mark_workspace_unread,
            workspace::mark_workspace_read,
            session::create_session,
            session::send_message,
            session::cancel_session,
            session::stop_session,
            session::get_session_messages,
            session::get_session,
            session::list_workspace_sessions,
            session::update_session,
            session::hide_session,
            review::get_workspace_changes,
            review::get_file_diff,
            review::get_file_content,
            review::get_full_workspace_diff,
            review::merge_workspace,
            review::detect_merge_conflicts,
            review::list_workspace_branches,
            review::list_workspace_files,
            checkpoint::save_checkpoint,
            checkpoint::restore_checkpoint,
            checkpoint::diff_checkpoints,
            terminal::spawn_terminal,
            terminal::get_terminal_output,
            terminal::push_terminal_output,
            terminal::detect_localhost_urls,
            terminal::get_terminal_info,
            scripts::get_conductor_config,
            scripts::run_setup_scripts,
            scripts::run_workspace_script,
            scripts::get_setup_log,
            env_vars::set_env_var,
            env_vars::get_env_vars,
            env_vars::delete_env_var,
            notes::get_notes,
            notes::save_notes,
            todos::get_todos,
            todos::save_todos,
            todos::check_blocking_todos,
            context::init_context_dir,
            context::get_context_info,
            context::archive_context,
            context::unarchive_context,
            context::save_plan,
        ])
        .manage(session::SessionManager::default())
        .manage(terminal::TerminalManager::default())
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
