export const DESKTOP_BREAKPOINT = 1400;
export const TABLET_BREAKPOINT = 1024;
export const LARGE_PHONE_BREAKPOINT = 768;

export function getResponsiveContentMaxWidth(width: number): number | undefined {
  if (width >= DESKTOP_BREAKPOINT) return 1080;
  if (width >= TABLET_BREAKPOINT) return 920;
  if (width >= LARGE_PHONE_BREAKPOINT) return 760;
  return undefined;
}
