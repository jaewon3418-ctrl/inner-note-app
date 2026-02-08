import { useMemo } from 'react';
import useAppStore from './index';
import { translations, t } from '../constants/translations';

export function useTranslate() {
    const language = useAppStore((s) => s.language);
    return useMemo(() => t(translations, language), [language]);
}

export function useLanguage() {
    const language = useAppStore((s) => s.language);
    const translate = useTranslate();
    return { language, translate };
}
