export interface FileChange {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
}

export interface DiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
  files: FileChange[];
}

export interface WorkspaceChanges {
  uncommitted: FileChange[];
  committed: FileChange[];
  stats: DiffStats;
  has_more: boolean;
  total_files: number;
}

export interface LineComment {
  id: string;
  workspace_id: string;
  file_path: string;
  line_number: number;
  line_content: string | null;
  content: string;
  sent_at: string | null;
  created_at: string;
}
