use git2::{DiffOptions, Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffStats {
    pub files_changed: u32,
    pub insertions: u32,
    pub deletions: u32,
    pub files: Vec<FileStat>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStat {
    pub path: String,
    pub insertions: u32,
    pub deletions: u32,
    pub status: FileChangeStatus,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum FileChangeStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MergeResult {
    pub merge_type: MergeType,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum MergeType {
    FastForward,
    MergeCommit,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStatus {
    pub path: String,
    pub staged: bool,
    pub status: String,
}

pub fn create_worktree(
    repo_path: &str,
    branch_name: &str,
    worktree_path: &str,
) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    // Create the worktree directory parent if it doesn't exist
    if let Some(parent) = Path::new(worktree_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Get HEAD commit for the new branch
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;

    // Create branch
    repo.branch(branch_name, &commit, false)
        .map_err(|e| e.to_string())?;

    // Add the worktree
    repo.worktree(
        branch_name,
        Path::new(worktree_path),
        Some(
            git2::WorktreeAddOptions::new()
                .reference(Some(
                    &repo
                        .find_branch(branch_name, git2::BranchType::Local)
                        .map_err(|e| e.to_string())?
                        .into_reference(),
                )),
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn remove_worktree(
    repo_path: &str,
    worktree_path: &str,
    prune_branch: bool,
) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    // Find and prune the worktree
    let worktree_name = Path::new(worktree_path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or("Invalid worktree path")?;

    if let Ok(wt) = repo.find_worktree(&worktree_name) {
        wt.prune(Some(
            git2::WorktreePruneOptions::new()
                .valid(true)
                .working_tree(true),
        ))
        .map_err(|e| e.to_string())?;
    }

    // Remove the worktree directory
    if Path::new(worktree_path).exists() {
        std::fs::remove_dir_all(worktree_path).map_err(|e| e.to_string())?;
    }

    // Optionally delete the branch
    if prune_branch {
        if let Ok(mut branch) = repo.find_branch(&worktree_name, git2::BranchType::Local) {
            branch.delete().map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn get_diff_stats(worktree_path: &str, base_branch: &str) -> Result<DiffStats, String> {
    let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let base_ref = format!("refs/heads/{}", base_branch);
    let base_obj = repo
        .revparse_single(&base_ref)
        .map_err(|e| format!("Cannot find base branch '{}': {}", base_branch, e))?;
    let base_tree = base_obj
        .peel_to_tree()
        .map_err(|e| e.to_string())?;

    let head_commit = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;

    let mut opts = DiffOptions::new();
    let diff = repo
        .diff_tree_to_tree(Some(&base_tree), Some(&head_tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let stats = diff.stats().map_err(|e| e.to_string())?;

    let mut files_map: std::collections::HashMap<String, FileStat> =
        std::collections::HashMap::new();

    let num_deltas = diff.deltas().len();
    for i in 0..num_deltas {
        let delta = diff.get_delta(i).expect("delta index within num_deltas bounds");
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_default();

        let status = match delta.status() {
            git2::Delta::Added => FileChangeStatus::Added,
            git2::Delta::Deleted => FileChangeStatus::Deleted,
            git2::Delta::Renamed => FileChangeStatus::Renamed,
            _ => FileChangeStatus::Modified,
        };

        files_map.insert(
            path.clone(),
            FileStat {
                path,
                insertions: 0,
                deletions: 0,
                status,
            },
        );
    }

    // Count line-level stats
    diff.foreach(
        &mut |_, _| true,
        None,
        None,
        Some(&mut |delta, _hunk, line| {
            let path = delta
                .new_file()
                .path()
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_default();
            if let Some(file) = files_map.get_mut(&path) {
                match line.origin() {
                    '+' => file.insertions += 1,
                    '-' => file.deletions += 1,
                    _ => {}
                }
            }
            true
        }),
    )
    .map_err(|e| e.to_string())?;

    let files: Vec<FileStat> = files_map.into_values().collect();

    Ok(DiffStats {
        files_changed: stats.files_changed() as u32,
        insertions: stats.insertions() as u32,
        deletions: stats.deletions() as u32,
        files,
    })
}

pub fn get_file_diff(
    worktree_path: &str,
    base_branch: &str,
    file_path: &str,
) -> Result<String, String> {
    let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let base_ref = format!("refs/heads/{}", base_branch);
    let base_obj = repo.revparse_single(&base_ref).map_err(|e| e.to_string())?;
    let base_tree = base_obj.peel_to_tree().map_err(|e| e.to_string())?;

    let head_commit = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;

    let mut opts = DiffOptions::new();
    opts.pathspec(file_path);

    let diff = repo
        .diff_tree_to_tree(Some(&base_tree), Some(&head_tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            ' ' => " ",
            _ => "",
        };
        output.push_str(prefix);
        output.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(output)
}

pub fn get_full_diff(worktree_path: &str, base_branch: &str) -> Result<String, String> {
    let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let base_ref = format!("refs/heads/{}", base_branch);
    let base_obj = repo.revparse_single(&base_ref).map_err(|e| e.to_string())?;
    let base_tree = base_obj.peel_to_tree().map_err(|e| e.to_string())?;

    let head_commit = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;

    let diff = repo
        .diff_tree_to_tree(Some(&base_tree), Some(&head_tree), None)
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            ' ' => " ",
            _ => "",
        };
        output.push_str(prefix);
        output.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(output)
}

pub fn merge_branch(
    repo_path: &str,
    source_branch: &str,
    target_branch: &str,
) -> Result<MergeResult, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    // Checkout target branch
    let target_ref = format!("refs/heads/{}", target_branch);
    let target_obj = repo.revparse_single(&target_ref).map_err(|e| e.to_string())?;
    repo.checkout_tree(&target_obj, None).map_err(|e| e.to_string())?;
    repo.set_head(&target_ref).map_err(|e| e.to_string())?;

    // Get source branch reference
    let source_ref = format!("refs/heads/{}", source_branch);
    let source_annotated = repo
        .find_annotated_commit(
            repo.revparse_single(&source_ref)
                .map_err(|e| e.to_string())?
                .id(),
        )
        .map_err(|e| e.to_string())?;

    let analysis = repo
        .merge_analysis(&[&source_annotated])
        .map_err(|e| e.to_string())?;

    if analysis.0.is_fast_forward() {
        let source_commit = repo
            .find_commit(source_annotated.id())
            .map_err(|e| e.to_string())?;
        repo.checkout_tree(source_commit.as_object(), None)
            .map_err(|e| e.to_string())?;
        let mut target = repo.find_reference(&target_ref).map_err(|e| e.to_string())?;
        target
            .set_target(source_annotated.id(), "Fast-forward merge")
            .map_err(|e| e.to_string())?;
        repo.set_head(&target_ref).map_err(|e| e.to_string())?;

        return Ok(MergeResult {
            merge_type: MergeType::FastForward,
            conflicts: vec![],
        });
    }

    // Regular merge
    repo.merge(&[&source_annotated], None, None)
        .map_err(|e| e.to_string())?;

    let index = repo.index().map_err(|e| e.to_string())?;
    if index.has_conflicts() {
        let conflicts: Vec<String> = index
            .conflicts()
            .map_err(|e| e.to_string())?
            .filter_map(|c| c.ok())
            .filter_map(|c| {
                c.our
                    .as_ref()
                    .map(|e| String::from_utf8_lossy(&e.path).into_owned())
            })
            .collect();

        return Ok(MergeResult {
            merge_type: MergeType::MergeCommit,
            conflicts,
        });
    }

    // Create merge commit
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;
    let head_commit = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let source_commit = repo
        .find_commit(source_annotated.id())
        .map_err(|e| e.to_string())?;
    let sig = repo.signature().map_err(|e| e.to_string())?;

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &format!("Merge branch '{}' into '{}'", source_branch, target_branch),
        &tree,
        &[&head_commit, &source_commit],
    )
    .map_err(|e| e.to_string())?;

    repo.cleanup_state().map_err(|e| e.to_string())?;

    Ok(MergeResult {
        merge_type: MergeType::MergeCommit,
        conflicts: vec![],
    })
}

pub fn list_branches(repo_path: &str) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().ok();
    let head_name = head.as_ref().and_then(|h| h.shorthand().map(String::from));

    let branches = repo
        .branches(Some(git2::BranchType::Local))
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for branch in branches {
        let (branch, _) = branch.map_err(|e| e.to_string())?;
        if let Some(name) = branch.name().ok().flatten() {
            result.push(BranchInfo {
                name: name.to_string(),
                is_current: head_name.as_deref() == Some(name),
            });
        }
    }

    Ok(result)
}

pub fn get_uncommitted_changes(worktree_path: &str) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).renames_head_to_index(true);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        if s.is_index_new() || s.is_index_modified() || s.is_index_deleted() {
            files.push(FileStatus {
                path: path.clone(),
                staged: true,
                status: if s.is_index_new() {
                    "added"
                } else if s.is_index_deleted() {
                    "deleted"
                } else {
                    "modified"
                }
                .to_string(),
            });
        }

        if s.is_wt_new() || s.is_wt_modified() || s.is_wt_deleted() {
            files.push(FileStatus {
                path,
                staged: false,
                status: if s.is_wt_new() {
                    "untracked"
                } else if s.is_wt_deleted() {
                    "deleted"
                } else {
                    "modified"
                }
                .to_string(),
            });
        }
    }

    Ok(files)
}

pub fn detect_conflicts(worktree_path: &str, target_branch: &str) -> Result<Vec<String>, String> {
    let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;

    let head = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;

    let target_ref = format!("refs/heads/{}", target_branch);
    let target = repo
        .revparse_single(&target_ref)
        .and_then(|o| o.peel_to_commit())
        .map_err(|e| e.to_string())?;

    let ancestor = repo
        .merge_base(head.id(), target.id())
        .and_then(|oid| repo.find_commit(oid))
        .map_err(|e| e.to_string())?;

    let merge_index = repo
        .merge_commits(&ancestor, &head, None)
        .map_err(|e| e.to_string())?;

    if !merge_index.has_conflicts() {
        return Ok(vec![]);
    }

    let conflicts: Vec<String> = merge_index
        .conflicts()
        .map_err(|e| e.to_string())?
        .filter_map(|c| c.ok())
        .filter_map(|c| {
            c.our
                .as_ref()
                .map(|e| String::from_utf8_lossy(&e.path).into_owned())
        })
        .collect();

    Ok(conflicts)
}

#[allow(dead_code)] // Used in P5-03 checkpoint system
pub fn is_git_busy(worktree_path: &str) -> bool {
    let git_dir = Path::new(worktree_path).join(".git");

    // For worktrees, .git is a file pointing to the real git dir
    let actual_git_dir = if git_dir.is_file() {
        std::fs::read_to_string(&git_dir)
            .ok()
            .and_then(|content| {
                content
                    .strip_prefix("gitdir: ")
                    .map(|p| p.trim().to_string())
            })
            .map(std::path::PathBuf::from)
            .unwrap_or(git_dir)
    } else {
        git_dir
    };

    actual_git_dir.join("rebase-merge").exists()
        || actual_git_dir.join("rebase-apply").exists()
        || actual_git_dir.join("MERGE_HEAD").exists()
        || actual_git_dir.join("CHERRY_PICK_HEAD").exists()
        || actual_git_dir.join("BISECT_LOG").exists()
}
