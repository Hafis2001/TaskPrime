import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/modernTheme';

interface ModernButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    gradient?: boolean;
}

export default function ModernButton({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    icon,
    style,
    textStyle,
    gradient = false,
}: ModernButtonProps) {
    const buttonStyle = [
        styles.button,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`text_${variant}`],
        styles[`textSize_${size}`],
        textStyle,
    ];

    const content = (
        <>
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? Colors.primary.main : Colors.text.inverse}
                />
            ) : (
                <View style={styles.content}>
                    {icon && <View style={styles.icon}>{icon}</View>}
                    <Text style={textStyles}>{title}</Text>
                </View>
            )}
        </>
    );

    if (gradient && variant === 'primary' && !disabled) {
        return (
            <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#ff6600', '#FF914D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[buttonStyle, { backgroundColor: 'transparent' }]}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {content}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    // Variants
    primary: {
        backgroundColor: Colors.primary.main,
        ...Shadows.base,
    },
    secondary: {
        backgroundColor: Colors.dark.main,
        ...Shadows.base,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary.main,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: Colors.error.main,
        ...Shadows.base,
    },

    // Sizes
    size_small: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.base,
    },
    size_medium: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    size_large: {
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing['2xl'],
    },

    // Text Styles
    text: {
        fontWeight: Typography.fontWeight.bold,
    },
    text_primary: {
        color: Colors.text.inverse,
    },
    text_secondary: {
        color: Colors.text.inverse,
    },
    text_outline: {
        color: Colors.primary.main,
    },
    text_ghost: {
        color: Colors.primary.main,
    },
    text_danger: {
        color: Colors.text.inverse,
    },

    textSize_small: {
        fontSize: Typography.fontSize.sm,
    },
    textSize_medium: {
        fontSize: Typography.fontSize.base,
    },
    textSize_large: {
        fontSize: Typography.fontSize.lg,
    },

    // States
    disabled: {
        opacity: 0.5,
    },

    // Content
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: Spacing.sm,
    },
});
