import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { invoke } from '@tauri-apps/api/core';

interface OpenInMenuProps {
  worktreePath: string;
}

const IDE_OPTIONS = [
  { id: 'vscode', label: 'VS Code', command: 'code' },
  { id: 'cursor', label: 'Cursor', command: 'cursor' },
  { id: 'zed', label: 'Zed', command: 'zed' },
  { id: 'terminal', label: 'Terminal', command: 'open-terminal' },
];

export function OpenInMenu({ worktreePath }: OpenInMenuProps) {
  const handleOpenIn = async (ideId: string) => {
    try {
      await invoke('open_in_ide', { ideName: ideId, path: worktreePath });
    } catch (e) {
      console.error('Failed to open in IDE:', e);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="titlebar__btn" title="Open in...">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5 1L1 7l4 6M9 1l4 6-4 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu-content" sideOffset={5} align="end">
          <DropdownMenu.Label className="dropdown-menu-label">Open in...</DropdownMenu.Label>
          {IDE_OPTIONS.map((ide) => (
            <DropdownMenu.Item
              key={ide.id}
              className="dropdown-menu-item"
              onSelect={() => handleOpenIn(ide.id)}
            >
              {ide.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
