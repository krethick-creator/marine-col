import { groqModelRouter } from '../llm/GroqModelRouter';
import { SystemMessage } from '@langchain/core/messages';

export async function resolveLanguage(query: string, requestedLanguage?: string): Promise<string> {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'ml', 'mr', 'gu', 'kn', 'bn', 'or'];

  // 1. Script-based detection from query text for Indian scripts
  if (query) {
    if (/[\u0B80-\u0BFF]/.test(query)) return 'ta'; // Tamil
    if (/[\u0900-\u097F]/.test(query)) return 'hi'; // Devanagari (Hindi / Marathi)
    if (/[\u0C00-\u0C7F]/.test(query)) return 'te'; // Telugu
    if (/[\u0D00-\u0D7F]/.test(query)) return 'ml'; // Malayalam
    if (/[\u0A80-\u0AFF]/.test(query)) return 'gu'; // Gujarati
    if (/[\u0C80-\u0CFF]/.test(query)) return 'kn'; // Kannada
    if (/[\u0980-\u09FF]/.test(query)) return 'bn'; // Bengali
    if (/[\u0B00-\u0B7F]/.test(query)) return 'or'; // Odia
  }

  // 2. Explicitly selected user language
  if (requestedLanguage && supportedLanguages.includes(requestedLanguage)) {
    return requestedLanguage;
  }
  
  // 3. Fallback to LLM detection if query text has no script match
  try {
    const detectPrompt = `Detect the language of the following text. Respond with ONLY the ISO 639-1 language code (e.g. 'en', 'hi', 'ta'). If unsure, default to 'en'.

Text: "${query}"`;
    const detectResponse = await groqModelRouter.invoke([new SystemMessage(detectPrompt)], 'planning');
    const detected = detectResponse.response.trim().toLowerCase();
    if (supportedLanguages.includes(detected)) return detected;
    return 'en';
  } catch (err) {
    console.error('[Language Detect] Detection failed, defaulting to en');
    return 'en';
  }
}
