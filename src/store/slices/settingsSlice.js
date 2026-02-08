export const createSettingsSlice = (set) => ({
    language: 'ko',
    appLockEnabled: false,
    isPremium: false,
    hasUserConsent: false,

    setLanguage: (lang) => set({ language: lang }),
    setAppLockEnabled: (val) => set({ appLockEnabled: val }),
    setIsPremium: (val) => set({ isPremium: val }),
    setHasUserConsent: (val) => set({ hasUserConsent: val }),
});
