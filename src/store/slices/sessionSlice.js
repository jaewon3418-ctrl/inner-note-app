export const createSessionSlice = (set, get) => ({
    dailyDiaryCount: 0,
    dailyAnonymousCount: 0,
    lastDiaryDate: '',
    dailyChatTurns: 0,
    sessionChatTurns: 0,
    isSubmitting: false,
    currentResult: null,
    selectedFilter: 'ALL',

    setDailyDiaryCount: (val) =>
        set({ dailyDiaryCount: typeof val === 'function' ? val(get().dailyDiaryCount) : val }),
    setDailyAnonymousCount: (val) =>
        set({ dailyAnonymousCount: typeof val === 'function' ? val(get().dailyAnonymousCount) : val }),
    setLastDiaryDate: (val) =>
        set({ lastDiaryDate: typeof val === 'function' ? val(get().lastDiaryDate) : val }),
    setDailyChatTurns: (val) =>
        set({ dailyChatTurns: typeof val === 'function' ? val(get().dailyChatTurns) : val }),
    setSessionChatTurns: (val) =>
        set({ sessionChatTurns: typeof val === 'function' ? val(get().sessionChatTurns) : val }),
    setIsSubmitting: (val) => set({ isSubmitting: val }),
    setCurrentResult: (val) => set({ currentResult: val }),
    setSelectedFilter: (val) => set({ selectedFilter: val }),
});
