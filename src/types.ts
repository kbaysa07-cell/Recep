export type Role = 'user' | 'model';

export interface Message {
  id: string;
  text: string;
  thinking?: string;
  sender: Role;
  isRaw: boolean;
  isHidden: boolean;
}

export interface WorkspaceFiles {
  [filename: string]: string;
}

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
  apiKey?: string;
  baseUrl?: string;
  isDefault?: boolean;
}

export type AppState = 
  | 'IDLE' 
  | 'GENERATING' 
  | 'ERROR' 
  | 'WORKSPACE_OPEN' 
  | 'SETTINGS_OPEN' 
  | 'HISTORY_OPEN';

