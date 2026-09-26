
export const colors = {
  primary: '#FF3D57', // secondary buttons, links, active states
  accent: '#B3001F', // CTA backgrounds
  bg: '#EFE9DB', // page background
  surface: '#F6F2E9', // cards, panels, text-on-accent/primary
  text: '#201C1C', // body text
} as const;

export const fonts = {
  header: 'Anton-Regular',
  body: 'WorkSans-Regular',
  bodyMedium: 'WorkSans-Medium',
} as const;

export const fontSizes = {
  xl: 28, // screen titles, section headers (Anton)
  mainHeader: 32, // main-screen headers, e.g. Dashboard "Ember" (Anton)
  base: 16, // card names, descriptions, list rows (Work Sans)
  sm: 12, // captions, stat labels, footer text (Work Sans)
} as const;

export const spacing = {
  space1: 8, // tight spacing, icon-to-label gaps, stepper buttons, list-row gaps
  space2: 16, // internal component padding, form-field gaps
  space3: 24, // screen-edge padding, standard gaps between adjacent components
  space4: 32, // larger breaks between distinct sections
} as const;

// useWindowDimensions() width breakpoints — portrait phone only, no CSS
// media queries. 360dp is the no-overflow test floor (a common small
// Android reference width, not the 375px iPhone width).
export const breakpoints = {
  compact: 0, // below 600dp: 3-column default grid
  expanded: 600, // 600dp and up: 4-column default grid
  testFloor: 360,
} as const;

export const a11y = {
  touchTargetMin: 48, // minimum tappable target, dp
  minContrastRatio: 4.5,
} as const;

export const theme = {
  colors,
  fonts,
  fontSizes,
  spacing,
  breakpoints,
  a11y,
} as const;

export type Theme = typeof theme;
export default theme;