import { Activity } from './hooks/useActivity';

export type Role = 'user' | 'model';

export interface Message {
  id: string;
  text: string;
  thinking?: string;
  activity?: Activity[];
  sender: Role;
  isRaw: boolean;
  isHidden: boolean;
}

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

export interface ArchivedSession {
  id: string;
  date: string;
  preview: string;
  messages: Message[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'xai' | 'custom' | 'auto';
  baseUrl?: string;
  isDefault?: boolean;
}

export interface ProviderConfig {
  provider: 'google' | 'openai' | 'anthropic' | 'xai' | 'custom';
  apiKey: string;
}

export interface GithubState {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
}

export type AppState = 
  | 'IDLE' 
  | 'GENERATING' 
  | 'ERROR' 
  | 'WORKSPACE_OPEN' 
  | 'SETTINGS_OPEN' 
  | 'HISTORY_OPEN';

