import type { TranslationProvider } from './TranslationProvider';
import { MockTranslationProvider } from './MockTranslationProvider';

// Groq is now the sole multilingual generation engine.
// This module exists only to provide a mock provider for automated tests.
let instance: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (!instance) {
    instance = new MockTranslationProvider();
  }
  return instance;
}

export function setTranslationProvider(provider: TranslationProvider) {
  instance = provider;
}

export type { TranslationProvider };
