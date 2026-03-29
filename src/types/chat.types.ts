import { Activity } from '../hooks/useActivity';

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

export interface ArchivedSession {
  id: string;
  date: string;
  preview: string;
  messages: Message[];
}
