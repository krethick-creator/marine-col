import { env } from '../../config/env';
import type { TranslationProvider } from './TranslationProvider';
import { MockTranslationProvider } from './MockTranslationProvider';
import { BhashiniTranslationProvider } from './BhashiniTranslationProvider';

let instance: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (!instance) {
    if (env.useMockData) {
      instance = new MockTranslationProvider();
      console.log('[Translation] Using MockTranslationProvider (DEMO DATA)');
    } else {
      instance = new BhashiniTranslationProvider();
      console.log('[Translation] Using BhashiniTranslationProvider (REAL DATA)');
    }
  }
  return instance;
}

export function setTranslationProvider(provider: TranslationProvider) {
  instance = provider;
}

export type { TranslationProvider };
