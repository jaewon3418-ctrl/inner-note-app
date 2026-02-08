import { TRASH_TTL_DAYS } from '../../constants/helplines';

export const createCoreDataSlice = (set, get) => ({
    emotionHistory: [],
    savedChatSessions: [],
    streak: 0,
    recoveryTokens: 2,
    completedActivities: {},
    userName: '',

    setEmotionHistory: (val) =>
        set({ emotionHistory: typeof val === 'function' ? val(get().emotionHistory) : val }),

    setSavedChatSessions: (val) =>
        set({ savedChatSessions: typeof val === 'function' ? val(get().savedChatSessions) : val }),

    setCompletedActivities: (val) =>
        set({ completedActivities: typeof val === 'function' ? val(get().completedActivities) : val }),

    setUserName: (name) => set({ userName: name }),

    softDeleteEntry: (id) =>
        set((state) => ({
            emotionHistory: state.emotionHistory.map((e) =>
                e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e
            ),
        })),

    restoreEntry: (id) =>
        set((state) => ({
            emotionHistory: state.emotionHistory.map((e) =>
                e.id === id ? { ...e, deletedAt: null } : e
            ),
        })),

    deleteForever: (id) =>
        set((state) => ({
            emotionHistory: state.emotionHistory.filter((e) => e.id !== id),
        })),

    purgeTrash: () =>
        set((state) => ({
            emotionHistory: state.emotionHistory.filter((e) => {
                if (!e.deletedAt) return true;
                const ageDays = (Date.now() - new Date(e.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
                return ageDays < TRASH_TTL_DAYS;
            }),
        })),
});
