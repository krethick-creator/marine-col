/**
 * ORCA Frontend i18n
 *
 * Architecture:
 *  - Translation dictionaries live in src/client/locales/<lang>.ts
 *  - English (en) is the canonical fallback — every key must exist in en.ts
 *  - All other languages are Partial<Record<TranslationKey, string>>
 *  - useTranslation() reads the current language from useAppStore and returns a t() function
 *  - Missing keys transparently fall back to English
 */

import { useCallback } from 'react'
import en, { type TranslationKey } from './en'
import hi from './hi'
import ta from './ta'
import te from './te'
import ml from './ml'
import mr from './mr'
import gu from './gu'
import kn from './kn'
import bn from './bn'
import or_lang from './or'
import { useAppStore } from '../store'

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'ml' | 'mr' | 'gu' | 'kn' | 'bn' | 'or'

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
]

const dictionaries: Record<SupportedLanguage, Partial<Record<TranslationKey, string>>> = {
  en,
  hi,
  ta,
  te,
  ml,
  mr,
  gu,
  kn,
  bn,
  or: or_lang,
}

/**
 * Returns the translation for a key in the given language.
 * Falls back to English if missing.
 */
export function translate(lang: string, key: TranslationKey): string {
  const code = lang as SupportedLanguage
  const dict = dictionaries[code] ?? en
  return (dict as Record<string, string>)[key] ?? en[key]
}

/**
 * React hook — call inside any component to get a t() function bound to the
 * current global language. No context provider needed; reads from Zustand.
 */
export function useTranslation() {
  const language: string = useAppStore((s) => s.user.language)

  const t = useCallback((key: TranslationKey): string => {
    return translate(language, key)
  }, [language])

  return { t, language }
}

export type { TranslationKey }
