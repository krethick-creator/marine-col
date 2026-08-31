export interface TranslationProvider {
  /**
   * Translates the given text into the target language code.
   * Target language code is typically an ISO 639-1 code (e.g. 'hi', 'ta', 'te', 'ml', 'en').
   * If targetLanguage is 'en', the provider may just return the original text if it's already in English.
   */
  translateText(text: string, targetLanguage: string): Promise<{
    translatedText: string;
    status: string; // e.g. "REAL_DATA_SUCCESS", "MOCK_DATA", "NOT_CONFIGURED", "PROVIDER_UNAVAILABLE"
    error?: string;
  }>;
}
