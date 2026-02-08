import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function TrendChart({ trendData, translate }) {
    if (trendData.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Text style={[styles.emptyChartText, null]}>
                    일주일간 기록하시면 변화를 보여드릴게요!
                </Text>
            </View>
        );
    }

    const maxValue = Math.max(...trendData.map(d => d.value), 5);

    return (
        <View style={styles.improvedChart}>
            <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, null]}>{translate('last7Days')}</Text>
                <Text style={[styles.chartSubtitle, null]}>
                    {translate('daysRecorded', { count: trendData.length })}
                </Text>
            </View>
            <View style={styles.chartContent}>
                {trendData.map((point, index) => (
                    <View key={index} style={styles.chartPoint}>
                        <View style={[
                            styles.chartBar,
                            {
                                height: (point.value / maxValue) * 25,
                                backgroundColor: point.color
                            }
                        ]} />
                        <Text style={[styles.chartLabel, null]}>
                            {point.day}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
