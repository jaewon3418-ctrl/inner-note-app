export const createChatSlice = (set, get) => ({
    chatHistory: [],
    chatInput: '',
    currentSessionId: null,

    setChatHistory: (val) =>
        set({ chatHistory: typeof val === 'function' ? val(get().chatHistory) : val }),
    setChatInput: (val) => set({ chatInput: val }),
    setCurrentSessionId: (val) => set({ currentSessionId: val }),
});
