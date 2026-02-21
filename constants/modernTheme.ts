/**
 * Modern Design System for TaskPrime
 * Enhanced theme with professional styling for shop owner app
 */

import { Platform } from 'react-native';
import { moderateScale, scale } from '../src/utils/Responsive';

// Color Palette
export const Colors = {
    // Primary Orange Shades
    primary: {
        main: '#ff6600',
        light: '#FF914D',
        lighter: '#FFB380',
        lightest: '#f9d5b7',
        dark: '#E65C00',
        darker: '#CC5200',
    },

    // Dark Shades
    dark: {
        main: '#171635',
        light: '#2A2850',
        lighter: '#3D3B6B',
        text: '#141313',
    },

    // Neutral Grays
    gray: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
    },

    // Semantic Colors
    success: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
        bg: '#D1FAE5',
    },

    error: {
        main: '#EF4444',
        light: '#F87171',
        dark: '#DC2626',
        bg: '#FEE2E2',
    },

    warning: {
        main: '#F59E0B',
        light: '#FBBF24',
        dark: '#D97706',
        bg: '#FEF3C7',
    },

    info: {
        main: '#3B82F6',
        light: '#60A5FA',
        dark: '#2563EB',
        bg: '#DBEAFE',
    },

    // Background Colors
    background: {
        primary: '#FFFFFF',
        secondary: '#F9FAFB',
        tertiary: '#F3F4F6',
        card: '#FFFFFF',
        overlay: 'rgba(0, 0, 0, 0.5)',
    },

    // Text Colors
    text: {
        primary: '#1F2937',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        inverse: '#FFFFFF',
        disabled: '#D1D5DB',
    },

    // Border Colors
    border: {
        light: '#F3F4F6',
        main: '#E5E7EB',
        dark: '#D1D5DB',
    },
};

// Typography
export const Typography = {
    // Font Families
    fontFamily: Platform.select({
        ios: {
            regular: 'System',
            medium: 'System',
            semibold: 'System',
            bold: 'System',
        },
        android: {
            regular: 'Roboto',
            medium: 'Roboto-Medium',
            semibold: 'Roboto-Medium',
            bold: 'Roboto-Bold',
        },
        default: {
            regular: 'system-ui',
            medium: 'system-ui',
            semibold: 'system-ui',
            bold: 'system-ui',
        },
    }),

    // Font Sizes
    fontSize: {
        xs: moderateScale(12),
        sm: moderateScale(14),
        base: moderateScale(16),
        lg: moderateScale(18),
        xl: moderateScale(20),
        '2xl': moderateScale(24),
        '3xl': moderateScale(28),
        '4xl': moderateScale(32),
        '5xl': moderateScale(36),
    },

    // Font Weights
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        extrabold: '800' as const,
    },

    // Line Heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// Spacing Scale (based on 4px grid)
export const Spacing = {
    xs: scale(4),
    sm: scale(8),
    md: scale(12),
    base: scale(16),
    lg: scale(20),
    xl: scale(24),
    '2xl': scale(32),
    '3xl': scale(48),
    '4xl': scale(64),
};

// Border Radius
export const BorderRadius = {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
};

// Shadows (Elevation)
export const Shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },

    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    base: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },

    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },

    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
};

// Gradients
export const Gradients = {
    primary: ['#ff6600', '#FF914D'],
    primaryVertical: ['#ffffff', '#ff6600'],
    primarySubtle: ['#FFFFFF', '#FFF5EB'],
    dark: ['#171635', '#2A2850'],
    darkOrange: ['#171635', '#ff6600'],
    card: ['#FFFFFF', '#FAFAFA'],
    overlay: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.7)'],
};

// Animation Durations
export const Animation = {
    fast: 150,
    normal: 250,
    slow: 350,
};

// Common Style Presets
export const Presets = {
    // Card Styles
    card: {
        backgroundColor: Colors.background.card,
        borderRadius: BorderRadius.md,
        padding: Spacing.base,
        ...Shadows.base,
    },

    cardElevated: {
        backgroundColor: Colors.background.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.md,
    },

    // Input Styles
    input: {
        borderWidth: 1,
        borderColor: Colors.border.main,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.text.primary,
        backgroundColor: Colors.background.primary,
    },

    inputFocused: {
        borderColor: Colors.primary.main,
        borderWidth: 2,
    },

    // Button Styles
    buttonPrimary: {
        backgroundColor: Colors.primary.main,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing.xl,
        ...Shadows.base,
    },

    buttonSecondary: {
        backgroundColor: Colors.dark.main,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing.xl,
        ...Shadows.base,
    },
};

export default {
    Colors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Gradients,
    Animation,
    Presets,
};
