import { useState, useMemo } from 'react';
import { FileIcon } from './FileIcons';
import './FileExplorer.css';

interface FileTreeProps {
  files: string[];
  onFileSelect: (path: string) => void;
  selectedFile?: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const filePath of files) {
    const parts = filePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = {
          name,
          path,
          isDir: !isLast,
          children: [],
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  // Sort: directories first, then alphabetically
  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      sortTree(node.children);
    }
  };
  sortTree(root);

  return root;
}

export function FileTree({ files, onFileSelect, selectedFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="file-tree">
      {tree.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  onFileSelect,
  selectedFile,
}: {
  node: TreeNode;
  depth: number;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  const handleClick = () => {
    if (node.isDir) {
      setExpanded(!expanded);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <>
      <div
        className={`file-tree__item ${
          selectedFile === node.path ? 'file-tree__item--selected' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDir ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="file-tree__chevron"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}
          >
            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        ) : (
          <FileIcon filename={node.name} />
        )}
        <span className="file-tree__name">{node.name}</span>
      </div>
      {node.isDir && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </>
  );
}
