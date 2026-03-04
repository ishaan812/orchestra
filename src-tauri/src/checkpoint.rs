use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Checkpoint ref prefix in git.
const CHECKPOINT_PREFIX: &str = "refs/orchestra-checkpoints/";

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckpointInfo {
    pub ref_name: String,
    pub session_id: String,
    pub turn_id: String,
    pub message_id: String,
    pub created_at: String,
}

/// Save a checkpoint at the current state of the worktree.
/// Creates a git ref pointing to a commit object that captures the current HEAD,
/// index state, and working tree state.
/// Uses a neutral identity and does NOT move HEAD.
fn save_checkpoint_ref(worktree_path: &str, ref_name: &str) -> Result<(), String> {
    let repo = git2::Repository::open(worktree_path).map_err(|e| e.to_string())?;

    // Skip if rebase/merge in progress
    if crate::git::is_git_busy(worktree_path) {
        return Err("Cannot checkpoint during rebase/merge (code 101)".to_string());
    }

    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;

    // Build a tree from the current working directory state
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    // Create checkpoint commit with neutral identity
    let sig = git2::Signature::now("Orchestra", "orchestra@noreply").map_err(|e| e.to_string())?;
    let full_ref = format!("{}{}", CHECKPOINT_PREFIX, ref_name);

    let commit_oid = repo
        .commit(
            Some(&full_ref),
            &sig,
            &sig,
            &format!("checkpoint: {}", ref_name),
            &tree,
            &[&head_commit],
        )
        .map_err(|e| e.to_string())?;

    tracing::debug!("Saved checkpoint {} -> {}", full_ref, commit_oid);
    Ok(())
}

/// Restore a checkpoint: git reset --hard to saved HEAD, then overlay the checkpoint tree.
fn restore_checkpoint_ref(worktree_path: &str, ref_name: &str) -> Result<(), String> {
    let repo = git2::Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let full_ref = format!("{}{}", CHECKPOINT_PREFIX, ref_name);
    let reference = repo.find_reference(&full_ref).map_err(|e| e.to_string())?;
    let commit = reference
        .peel_to_commit()
        .map_err(|e| e.to_string())?;

    // The checkpoint commit's parent is the original HEAD at checkpoint time
    let original_head = commit.parent(0).map_err(|e| e.to_string())?;

    // Reset HEAD to the original head commit
    repo.reset(
        original_head.as_object(),
        git2::ResetType::Hard,
        None,
    )
    .map_err(|e| e.to_string())?;

    // Now checkout the checkpoint tree to restore working directory
    let checkpoint_tree = commit.tree().map_err(|e| e.to_string())?;
    repo.checkout_tree(
        checkpoint_tree.as_object(),
        Some(git2::build::CheckoutBuilder::new().force()),
    )
    .map_err(|e| e.to_string())?;

    tracing::debug!("Restored checkpoint {}", full_ref);
    Ok(())
}

/// Diff between two checkpoint refs.
fn diff_checkpoint_refs(
    worktree_path: &str,
    ref1: &str,
    ref2: &str,
) -> Result<String, String> {
    let repo = git2::Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let full_ref1 = format!("{}{}", CHECKPOINT_PREFIX, ref1);
    let full_ref2 = format!("{}{}", CHECKPOINT_PREFIX, ref2);

    let commit1 = repo
        .find_reference(&full_ref1)
        .and_then(|r| r.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let commit2 = repo
        .find_reference(&full_ref2)
        .and_then(|r| r.peel_to_commit())
        .map_err(|e| e.to_string())?;

    let tree1 = commit1.tree().map_err(|e| e.to_string())?;
    let tree2 = commit2.tree().map_err(|e| e.to_string())?;

    let diff = repo
        .diff_tree_to_tree(Some(&tree1), Some(&tree2), None)
        .map_err(|e| e.to_string())?;

    let mut diff_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            ' ' => " ",
            _ => "",
        };
        diff_text.push_str(prefix);
        diff_text.push_str(std::str::from_utf8(line.content()).unwrap_or(""));
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(diff_text)
}

/// Get the worktree path for a session.
async fn get_session_worktree(
    session_id: &str,
    pool: &sqlx::SqlitePool,
) -> Result<String, String> {
    sqlx::query_scalar(
        "SELECT w.worktree_path FROM workspaces w
         JOIN sessions s ON s.workspace_id = w.id
         WHERE s.id = ?",
    )
    .bind(session_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_checkpoint(
    session_id: String,
    turn_id: String,
    message_id: String,
    db: State<'_, DbPool>,
) -> Result<CheckpointInfo, String> {
    let worktree = get_session_worktree(&session_id, &db.0).await?;
    let ref_name = format!("session-{}-turn-{}-end", session_id, turn_id);

    save_checkpoint_ref(&worktree, &ref_name)?;

    let now = chrono::Utc::now().to_rfc3339();
    Ok(CheckpointInfo {
        ref_name,
        session_id,
        turn_id,
        message_id,
        created_at: now,
    })
}

#[tauri::command]
pub async fn restore_checkpoint(
    session_id: String,
    turn_id: String,
    message_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let worktree = get_session_worktree(&session_id, &db.0).await?;
    let ref_name = format!("session-{}-turn-{}-end", session_id, turn_id);

    restore_checkpoint_ref(&worktree, &ref_name)?;

    // Delete messages after this message
    sqlx::query(
        "DELETE FROM session_messages
         WHERE session_id = ? AND sent_at > (
             SELECT sent_at FROM session_messages WHERE id = ?
         )",
    )
    .bind(&session_id)
    .bind(&message_id)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn diff_checkpoints(
    session_id: String,
    turn_id_1: String,
    turn_id_2: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let worktree = get_session_worktree(&session_id, &db.0).await?;
    let ref1 = format!("session-{}-turn-{}-end", session_id, turn_id_1);
    let ref2 = format!("session-{}-turn-{}-end", session_id, turn_id_2);

    diff_checkpoint_refs(&worktree, &ref1, &ref2)
}
