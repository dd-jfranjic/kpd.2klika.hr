// Types
export * from './types';

// Providers
export { GeminiProvider, createGeminiProvider, type GeminiConfig } from './providers/gemini';

// Re-export for convenience
export type {
  AIProvider,
  AIProviderConfig,
  ClassificationInput,
  ClassificationResponse,
  ClassificationResult,
} from './types';

// Default provider factory
import { GeminiProvider, GeminiConfig } from './providers/gemini';
import { AIProvider, AIProviderConfig } from './types';

export type ProviderType = 'gemini';

export function createProvider(
  type: ProviderType,
  config: AIProviderConfig
): AIProvider {
  switch (type) {
    case 'gemini':
      return new GeminiProvider(config as GeminiConfig);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
