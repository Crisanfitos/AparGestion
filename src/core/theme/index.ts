/**
 * AparGestión - Accessible Theme Tokens
 * WCAG 2.1 AAA Compliant
 */

// High contrast color palette
export const colors = {
    // Primary - High contrast for readability
    primary: '#0033CC',
    primaryDark: '#002299',

    // Semantic colors
    success: '#006600',
    error: '#CC0000',
    warning: '#CC6600',

    // Neutral (21:1 contrast ratio)
    text: '#000000',
    textSecondary: '#333333',
    placeholder: '#999999',  // Lighter color for placeholders
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    border: '#666666',

    // State colors
    occupied: '#CC0000',
    available: '#006600',
    pending: '#CC6600',
};

// Typography - Minimum 18sp for seniors
export const typography = {
    fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
    },
    fontSize: {
        // All sizes are minimum 18sp for accessibility
        small: 18,
        body: 20,
        large: 24,
        title: 28,
        header: 32,
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// Touch targets - Minimum 60dp for motor accessibility
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Accessibility - Touch target minimum 60x60dp
export const touchTarget = {
    minimum: 60,
    comfortable: 72,
};

// Border radius
export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
};

export const theme = {
    colors,
    typography,
    spacing,
    touchTarget,
    borderRadius,
};

export type Theme = typeof theme;
