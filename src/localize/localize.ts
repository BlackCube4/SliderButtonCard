import en from './languages/en.json';
import de from './languages/de.json';
import fr from './languages/fr.json';
import he from './languages/he.json';
import ko from './languages/ko.json';
import nl from './languages/nl.json';
import pl from './languages/pl.json';
import pt from './languages/pt.json';
import ru from './languages/ru.json';
import sk from './languages/sk.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languages: Record<string, any> = {
  en,
  de,
  fr,
  he,
  ko,
  nl,
  pl,
  pt,
  ru,
  sk,
};

let currentLanguage = 'en';

export function setLanguage(hass?: { language?: string }): void {
  if (hass?.language) {
    currentLanguage = hass.language.split('-')[0];
  } else {
    currentLanguage = localStorage.getItem('selectedLanguage')?.replace(/['"-_]+/g, '') || 'en';
  }
}

/** Reads a nested key like "tabs.slider.title" from a language object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lookup(lang: any, key: string): string | undefined {
  return key.split('.').reduce((o, i) => (o == null ? undefined : o[i]), lang);
}

export function localize(key: string, search = '', replace = ''): string {
  // Translate using the active language, fall back to English, then to the raw key.
  let translated = lookup(languages[currentLanguage], key) ?? lookup(languages.en, key) ?? key;

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
}
