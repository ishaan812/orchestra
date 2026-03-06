import { FileIcon } from './FileIcons';

interface FileTabsProps {
  openFiles: string[];
  activeFile?: string;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
}

export function FileTabs({ openFiles, activeFile, onSelectFile, onCloseFile }: FileTabsProps) {
  if (openFiles.length === 0) return null;

  return (
    <div className="file-tabs">
      {openFiles.map((file) => {
        const name = file.split('/').pop() ?? file;
        return (
          <div
            key={file}
            className={`file-tab ${activeFile === file ? 'file-tab--active' : ''}`}
            onClick={() => onSelectFile(file)}
          >
            <FileIcon filename={name} />
            <span className="file-tab__name">{name}</span>
            <button
              className="file-tab__close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file);
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
