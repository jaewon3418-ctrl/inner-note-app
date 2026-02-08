import { useEffect, useRef } from 'react';
import useAppStore from '../store';
import { saveEncryptedData } from '../utils/secureStorage';
import { saveData as saveStorageData } from '../utils/storage';

export default function useDataPersistence() {
    const emotionHistory = useAppStore(s => s.emotionHistory);
    const savedChatSessions = useAppStore(s => s.savedChatSessions);
    const streak = useAppStore(s => s.streak);
    const recoveryTokens = useAppStore(s => s.recoveryTokens);
    const dailyAnonymousCount = useAppStore(s => s.dailyAnonymousCount);
    const lastDiaryDate = useAppStore(s => s.lastDiaryDate);
    const completedActivities = useAppStore(s => s.completedActivities);

    const historyInitRef = useRef(true);
    const chatInitRef = useRef(true);
    const plainInitRef = useRef(true);
    const historyTimeoutRef = useRef(null);
    const chatTimeoutRef = useRef(null);
    const plainTimeoutRef = useRef(null);

    // Effect 1: emotionHistory (encrypted)
    useEffect(() => {
        if (historyInitRef.current) { historyInitRef.current = false; return; }
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = setTimeout(() => {
            saveEncryptedData('emotionHistory', emotionHistory).catch(e => {
                if (__DEV__) console.log('Save emotionHistory error:', e);
            });
        }, 300);
        return () => { if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current); };
    }, [emotionHistory]);

    // Effect 2: savedChatSessions (encrypted)
    useEffect(() => {
        if (chatInitRef.current) { chatInitRef.current = false; return; }
        if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = setTimeout(() => {
            saveEncryptedData('chatSessions', savedChatSessions).catch(e => {
                if (__DEV__) console.log('Save chatSessions error:', e);
            });
        }, 300);
        return () => { if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current); };
    }, [savedChatSessions]);

    // Effect 3: plain fields (AsyncStorage)
    useEffect(() => {
        if (plainInitRef.current) { plainInitRef.current = false; return; }
        if (plainTimeoutRef.current) clearTimeout(plainTimeoutRef.current);
        plainTimeoutRef.current = setTimeout(() => {
            saveStorageData({
                streak,
                recoveryTokens,
                dailyAnonymousCount,
                lastDiaryDate,
                lastDiaryDateKey: lastDiaryDate,
                completedActivities: JSON.stringify(completedActivities),
            }).catch(e => {
                if (__DEV__) console.log('Save plain fields error:', e);
            });
        }, 300);
        return () => { if (plainTimeoutRef.current) clearTimeout(plainTimeoutRef.current); };
    }, [streak, recoveryTokens, dailyAnonymousCount, lastDiaryDate, completedActivities]);
}
