import { TranslationProvider } from './TranslationProvider';

export class MockTranslationProvider implements TranslationProvider {
  public callCount = 0;

  async translateText(text: string, targetLanguage: string) {
    this.callCount++;
    console.log(`[MockTranslationProvider] Translating to ${targetLanguage} (mocked)`);

    // Only providing mock fallback for Hindi (hi) and Tamil (ta) to simulate testing
    const fallbackDict: Record<string, Record<string, string>> = {
      'hi': {
        'GO': 'जाओ (GO)',
        'CAUTION': 'सावधान (CAUTION)',
        'NO_GO': 'मत जाओ (NO_GO)',
        'Unavailable': 'अनुपलब्ध',
      },
      'ta': {
        'GO': 'செல்லுங்கள் (GO)',
        'CAUTION': 'எச்சரிக்கை (CAUTION)',
        'NO_GO': 'செல்ல வேண்டாம் (NO_GO)',
        'Unavailable': 'கிடைக்கவில்லை',
      }
    };

    if (targetLanguage === 'en' || !fallbackDict[targetLanguage]) {
      return {
        translatedText: text, // No translation / no mock
        status: 'MOCK_DATA'
      };
    }

    // A very dumb string replacement for mock purposes
    let translated = text;
    for (const [en, localized] of Object.entries(fallbackDict[targetLanguage])) {
      translated = translated.replace(new RegExp(en, 'g'), localized);
    }

    return {
      translatedText: translated,
      status: 'MOCK_DATA'
    };
  }
}
