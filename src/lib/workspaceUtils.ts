import { WorkspaceFiles, FileNode } from '../types';

/**
 * Finds a node in the workspace file tree by its path.
 */
export function findNode(files: WorkspaceFiles, path: string): FileNode | null {
  const parts = path.split('/').filter(Boolean);
  let current: any = files;
  
  for (const part of parts) {
    if (current[part]) {
      current = current[part];
    } else if (current.children && current.children[part]) {
      current = current.children[part];
    } else {
      return null;
    }
    
    // If we are at a node and there are more parts, we must be at a folder
    if (parts.indexOf(part) < parts.length - 1 && current.type !== 'folder') {
      return null;
    }
  }
  
  return current as FileNode;
}

/**
 * Deep clones a workspace file tree.
 */
export function cloneWorkspace(files: WorkspaceFiles): WorkspaceFiles {
  return JSON.parse(JSON.stringify(files));
}

/**
 * Flattens a workspace file tree into a list of full paths and their nodes.
 */
export function flattenWorkspace(
  files: WorkspaceFiles, 
  path: string = "", 
  result: { path: string; node: FileNode }[] = []
): { path: string; node: FileNode }[] {
  for (const [name, node] of Object.entries(files)) {
    const fullPath = path ? `${path}/${name}` : name;
    result.push({ path: fullPath, node });
    if (node.type === 'folder' && node.children) {
      flattenWorkspace(node.children, fullPath, result);
    }
  }
  return result;
}

/**
 * Ensures a directory path exists in the workspace, creating folders as needed.
 */
export function ensureDirectory(files: WorkspaceFiles, path: string): { [name: string]: FileNode } {
  const parts = path.split('/').filter(Boolean);
  let current: any = files;
  
  for (const part of parts) {
    if (!current[part]) {
      current[part] = { type: 'folder', name: part, children: {} };
    }
    if (!current[part].children) {
      current[part].children = {};
    }
    current = current[part].children;
  }
  
  return current;
}

/**
 * Deletes a node from the workspace file tree by its path.
 */
export function deleteNode(files: WorkspaceFiles, path: string): WorkspaceFiles {
  const parts = path.split('/').filter(Boolean);
  const newFiles = cloneWorkspace(files);
  let current: any = newFiles;
  let parent: any = null;
  let lastPart = "";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    parent = current;
    lastPart = part;
    
    if (current[part]) {
      if (i < parts.length - 1) {
        if (current[part].type !== 'folder') return newFiles;
        current = current[part].children || (current[part].children = {});
      }
    } else if (current.children && current.children[part]) {
      if (i < parts.length - 1) {
        if (current.children[part].type !== 'folder') return newFiles;
        current = current.children[part].children || (current.children[part].children = {});
      }
    } else {
      return newFiles;
    }
  }
  
  if (parent[lastPart]) {
    delete parent[lastPart];
  } else if (parent.children && parent.children[lastPart]) {
    delete parent.children[lastPart];
  }
  
  return newFiles;
}
