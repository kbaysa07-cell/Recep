export interface FileNode {
  type: 'file' | 'folder';
  name: string;
  content?: string;
  isBinary?: boolean;
  children?: { [name: string]: FileNode };
}

export type WorkspaceFiles = { [name: string]: FileNode };

export interface Project {
  id: string;
  title: string;
  files: WorkspaceFiles;
  date: string;
}

export interface GithubState {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
}
