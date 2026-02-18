import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, Typography } from '../../constants/modernTheme';

interface ModernHeaderProps {
    title?: string;
    subtitle?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onLeftPress?: () => void;
    onRightPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export default function ModernHeader({
    title,
    subtitle,
    leftIcon,
    rightIcon,
    onLeftPress,
    onRightPress,
    style,
}: ModernHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }, style]}>
            <View style={styles.headerBar}>
                <View style={styles.leftAction}>
                    {leftIcon && (
                        <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
                            {leftIcon}
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.titleContainer}>
                    {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
                    {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                </View>

                <View style={styles.rightAction}>
                    {rightIcon && (
                        <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
                            {rightIcon}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.background.primary,
        ...Shadows.sm,
        zIndex: 10,
    },

    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        paddingHorizontal: Spacing.sm,
    },

    leftAction: {
        width: 48,
        alignItems: 'flex-start',
    },

    rightAction: {
        width: 48,
        alignItems: 'flex-end',
    },

    iconButton: {
        padding: Spacing.sm,
    },

    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.xs,
    },

    title: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary.main,
        textAlign: 'center',
    },

    subtitle: {
        fontSize: 10,
        color: Colors.text.secondary,
        marginTop: 0,
        textAlign: 'center',
    },
});
