import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Baseline dimensions based on a standard phone (e.g., iPhone 11/13/14)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scales value based on screen width
 */
export const scale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scales value based on screen height
 */
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

/**
 * Scaled value with a factor to prevent extreme scaling on large devices (tablets)
 * @param size Value to scale
 * @param factor Factor of scaling (0.5 is default)
 */
export const moderateScale = (size: number, factor = 0.5) => {
    const s = scale(size);
    // If it's a tablet, we reduce the scaling impact slightly to prevent "huge" UI components on iPad.
    const finalFactor = isTablet ? factor * 0.7 : factor; 
    return size + (s - size) * finalFactor;
};

/**
 * Vertical Scaled value with a factor
 * @param size Value to scale
 * @param factor Factor of scaling (0.5 is default)
 */
export const moderateVerticalScale = (size: number, factor = 0.5) => {
    const s = verticalScale(size);
    // If it's a tablet, we reduce the scaling impact slightly
    const finalFactor = isTablet ? factor * 0.7 : factor; 
    return size + (s - size) * finalFactor;
};

/**
 * Helper to detect if device is a tablet
 */
export const isTablet = width > 600;

/**
 * Responsive Screen dimensions
 */
export const Screen = {
    width,
    height,
    isTablet,
};
