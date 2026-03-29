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
