// NativeTabs owns the tab bar and safe-area behavior. Keep a modest gutter so
// scrollable content doesn't sit flush against the system bar.
export const NATIVE_TAB_BAR_CONTENT_GUTTER = 24;

// Padding required at the bottom of a scrollable screen so its content is not
// visually cramped above the native tab bar and the device's home indicator.
export const contentPaddingForTabBar = (insetBottom: number): number =>
  NATIVE_TAB_BAR_CONTENT_GUTTER + insetBottom;
