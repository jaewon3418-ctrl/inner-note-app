import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';

const REVIEW_MILESTONES = [5, 15, 30, 50, 100];
const MIN_DAYS_BETWEEN_REVIEWS = 14;
const STORAGE_KEY = 'lastReviewRequestDate';
const FEEDBACK_EMAIL = 'jaewon3418@gmail.com';

export async function maybeRequestReview(totalRecords, strings) {
    if (!REVIEW_MILESTONES.includes(totalRecords)) return;

    const lastDate = await AsyncStorage.getItem(STORAGE_KEY);
    if (lastDate) {
        const daysSince = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < MIN_DAYS_BETWEEN_REVIEWS) return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    // Satisfaction gate: Yes → StoreReview, No → feedback
    Alert.alert(
        strings.title,
        strings.message,
        [
            {
                text: strings.no,
                style: 'cancel',
                onPress: () => {
                    Linking.openURL(
                        `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(strings.feedbackSubject)}`
                    ).catch(() => {});
                },
            },
            {
                text: strings.yes,
                style: 'default',
                onPress: () => {
                    StoreReview.requestReview().catch(() => {});
                },
            },
        ]
    );

    // Record prompt date regardless of choice to respect rate limit
    await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
}
