import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/modernTheme';

interface ModernCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    elevated?: boolean;
    gradient?: boolean;
    padding?: number;
    margin?: number;
}

export default function ModernCard({
    children,
    style,
    elevated = false,
    gradient = false,
    padding = Spacing.base,
    margin = 0,
}: ModernCardProps) {
    const cardStyle = [
        styles.card,
        elevated ? styles.elevated : styles.base,
        { padding, margin },
        style,
    ];

    if (gradient) {
        return (
            <LinearGradient
                colors={['#ff6600', '#FF914D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cardStyle}
            >
                {children}
            </LinearGradient>
        );
    }

    return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.background.card,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    base: {
        ...Shadows.base,
    },
    elevated: {
        ...Shadows.md,
    },
});
