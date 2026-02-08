export const createNavigationSlice = (set) => ({
    currentTab: 'home',
    isAppLocked: true,
    isInitializing: true,
    showConsentScreen: false,
    showAnonymousModal: false,

    setCurrentTab: (tab) => set({ currentTab: tab }),
    setIsAppLocked: (val) => set({ isAppLocked: val }),
    setIsInitializing: (val) => set({ isInitializing: val }),
    setShowConsentScreen: (val) => set({ showConsentScreen: val }),
    setShowAnonymousModal: (val) => set({ showAnonymousModal: val }),
});
