import { groqModelRouter } from '../llm/GroqModelRouter';
import { SystemMessage } from '@langchain/core/messages';

export async function resolveLanguage(query: string, requestedLanguage?: string): Promise<string> {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'ml', 'mr', 'gu', 'kn', 'bn', 'or'];
  if (requestedLanguage && supportedLanguages.includes(requestedLanguage)) {
    return requestedLanguage;
  }
  
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
