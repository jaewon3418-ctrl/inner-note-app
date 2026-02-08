export const createModalSlice = (set) => ({
    activeModal: null,     // 'resultSheet' | 'crisis' | 'trash' | 'nameInput' | 'nameChange' | 'password' | 'importPassword' | 'chatHistory'
    activeConfirm: null,   // 'delete' | 'anonymous' | 'shortInput' | 'shortDiary'
    deleteItemId: null,

    openModal: (name) => set({ activeModal: name }),
    closeModal: () => set({ activeModal: null }),
    openConfirm: (name) => set({ activeConfirm: name }),
    closeConfirm: () => set({ activeConfirm: null, deleteItemId: null }),
    dismissAllModals: () => set({ activeModal: null, activeConfirm: null, deleteItemId: null }),
    setDeleteItemId: (val) => set({ deleteItemId: val }),
});
