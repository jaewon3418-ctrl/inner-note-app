import { create } from 'zustand';
import { createCoreDataSlice } from './slices/coreDataSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createNavigationSlice } from './slices/navigationSlice';
import { createModalSlice } from './slices/modalSlice';
import { createSessionSlice } from './slices/sessionSlice';
import { createChatSlice } from './slices/chatSlice';

const useAppStore = create((...a) => ({
    ...createCoreDataSlice(...a),
    ...createSettingsSlice(...a),
    ...createNavigationSlice(...a),
    ...createModalSlice(...a),
    ...createSessionSlice(...a),
    ...createChatSlice(...a),
}));

export default useAppStore;
