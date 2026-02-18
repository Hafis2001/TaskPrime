import React, { useState } from 'react';
import {
    Animated,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/modernTheme';

interface ModernInputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
    showPasswordToggle?: boolean;
}

export default function ModernInput({
    label,
    error,
    leftIcon,
    rightIcon,
    containerStyle,
    showPasswordToggle = false,
    secureTextEntry,
    ...textInputProps
}: ModernInputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [labelAnimation] = useState(new Animated.Value(textInputProps.value ? 1 : 0));

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(labelAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!textInputProps.value) {
            Animated.timing(labelAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }
    };

    const labelStyle = {
        top: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [16, -8],
        }),
        fontSize: labelAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [Typography.fontSize.base, Typography.fontSize.xs],
        }),
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Animated.Text
                    style={[
                        styles.label,
                        labelStyle,
                        isFocused && styles.labelFocused,
                        error && styles.labelError,
                    ]}
                >
                    {label}
                </Animated.Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    error && styles.inputContainerError,
                    textInputProps.editable === false && styles.inputContainerDisabled,
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

                <TextInput
                    style={[styles.input, leftIcon && styles.inputWithLeftIcon]}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholderTextColor={Colors.text.tertiary}
                    secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
                    {...textInputProps}
                />

                {showPasswordToggle && (
                    <TouchableOpacity
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.rightIcon}
                    >
                        <Text style={styles.passwordToggle}>
                            {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
                        </Text>
                    </TouchableOpacity>
                )}

                {rightIcon && !showPasswordToggle && (
                    <View style={styles.rightIcon}>{rightIcon}</View>
                )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.base,
    },

    label: {
        position: 'absolute',
        left: Spacing.base,
        backgroundColor: Colors.background.primary,
        paddingHorizontal: Spacing.xs,
        color: Colors.text.secondary,
        zIndex: 1,
    },

    labelFocused: {
        color: Colors.primary.main,
    },

    labelError: {
        color: Colors.error.main,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border.main,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.background.primary,
        paddingHorizontal: Spacing.md,
    },

    inputContainerFocused: {
        borderColor: Colors.primary.main,
        borderWidth: 2,
    },

    inputContainerError: {
        borderColor: Colors.error.main,
    },

    inputContainerDisabled: {
        backgroundColor: Colors.background.secondary,
        borderColor: Colors.border.light,
    },

    input: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.text.primary,
    },

    inputWithLeftIcon: {
        paddingLeft: Spacing.sm,
    },

    leftIcon: {
        marginRight: Spacing.sm,
    },

    rightIcon: {
        marginLeft: Spacing.sm,
    },

    passwordToggle: {
        fontSize: Typography.fontSize.lg,
    },

    errorText: {
        color: Colors.error.main,
        fontSize: Typography.fontSize.xs,
        marginTop: Spacing.xs,
        marginLeft: Spacing.base,
    },
});
