/**
 * Theme configuration for the project (Colors, Typography, Spacing).
 * Centralized file for maintaining consistency across screens.
 */

export const COLORS = {
  // Brand Colors (Zalo style)
  primary: '#0068ff', // Main Fruvia blue
  secondary: '#2b68e8', // Light blue
  background: '#E6F0F8', // Main page background
  surface: '#ffffff', // Card background
  
  // Text Colors
  text: '#1e293b',
  textSecondary: '#666666',
  textPlaceholder: '#999999',
  textWhite: '#ffffff',
  
  // UI Colors
  border: '#e0e0e0',
  error: '#ff3b30',
  success: '#34c759',
  warning: '#ff9500',
  inactive: '#8e8e93',
  
  // Shorthands for dark mode if needed
  dark: {
    background: '#1c1c1e',
    text: '#ffffff',
    surface: '#2c2c2e',
  }
};

export const SIZES = {
  // Font sizes
  h1: '32px',
  h2: '24px',
  h3: '20px',
  h4: '14px',
  h5: '12px',
  h6: '11px',
  h7: '10px',
  body1: '18px',
  body2: '16px',
  body3: '14px',
  body4: '12px',
  caption: '12px',
  micro: '10px',
  
  // Spacing
  padding: '20px',
  margin: '20px',
  radius: '12px',
  radiusFull: '9999px',
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: SIZES.h1,
    fontWeight: '700',
  },
  h2: {
    fontSize: SIZES.h2,
    fontWeight: '700',
  },
  body: {
    fontSize: SIZES.body2,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: SIZES.body2,
    fontWeight: '600',
  },
  button: {
    fontSize: '16px',
    fontWeight: '600',
  }
};

const theme = { COLORS, SIZES, TYPOGRAPHY };
export default theme;
