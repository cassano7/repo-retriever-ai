import { useState } from 'react';
import { GitHubFile } from '@/services/GitHubService';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';

interface FileTreeSelectorProps {
  files: GitHubFile[];
  selectedFiles: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: TreeNode[];
  file?: GitHubFile;
}

export const FileTreeSelector = ({ files, selectedFiles, onSelectionChange }: FileTreeSelectorProps) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const buildTree = (files: GitHubFile[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();

    // Sort files by path to ensure proper tree structure
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            path: currentPath,
            type: isLast && file.type === 'file' ? 'file' : 'dir',
            children: [],
            file: isLast && file.type === 'file' ? file : undefined
          };

          nodeMap.set(currentPath, node);

          if (index === 0) {
            root.push(node);
          } else {
            const parentPath = parts.slice(0, index).join('/');
            const parentNode = nodeMap.get(parentPath);
            if (parentNode) {
              parentNode.children.push(node);
            }
          }
        }
      });
    });

    return root;
  };

  const tree = buildTree(files);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const toggleFileSelection = (path: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(path);
    } else {
      newSelected.delete(path);
    }
    onSelectionChange(newSelected);
  };

  const selectAll = () => {
    const allFiles = files.filter(f => f.type === 'file').map(f => f.path);
    onSelectionChange(new Set(allFiles));
  };

  const selectNone = () => {
    onSelectionChange(new Set());
  };

  const renderNode = (node: TreeNode, level: number = 0): JSX.Element => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFiles.has(node.path);

    return (
      <div key={node.path} className="select-none">
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-sm"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {node.type === 'dir' ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => toggleExpanded(node.path)}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{node.name}</span>
            </>
          ) : (
            <>
              <div className="w-4" />
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => toggleFileSelection(node.path, checked as boolean)}
              />
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{node.name}</span>
            </>
          )}
        </div>

        {node.type === 'dir' && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg">
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Select Files</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone}>
              Select None
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="h-64">
        <div className="p-2">
          {tree.map(node => renderNode(node))}
        </div>
      </ScrollArea>
    </div>
  );
};