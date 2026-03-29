import { AIModel } from '../types';

export const GEMINI_MODELS: AIModel[] = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Complex Tasks)', provider: 'google', isDefault: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Basic Tasks)', provider: 'google', isDefault: true },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'google', isDefault: true },
];

export const OPENAI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', isDefault: false },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', isDefault: false },
];

export const ANTHROPIC_MODELS: AIModel[] = [
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic', baseUrl: 'https://api.anthropic.com/v1/messages', isDefault: false },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', baseUrl: 'https://api.anthropic.com/v1/messages', isDefault: false },
];

export const XAI_MODELS: AIModel[] = [
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xai', baseUrl: 'https://api.x.ai/v1/chat/completions', isDefault: false },
];

export const DEFAULT_MODELS: AIModel[] = [
  { id: 'auto', name: 'Auto (Akıllı Seçim)', provider: 'auto', isDefault: true },
  ...GEMINI_MODELS,
];
