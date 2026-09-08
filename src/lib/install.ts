export type InstallKind = 'installed' | 'native' | 'ios' | 'android' | 'desktop';
export interface InstallEnv {
  matchMedia: (query: string) => { matches: boolean };
  navigator: {
    standalone?: boolean;
    userAgent: string;
    maxTouchPoints: number;
    platform: string;
  };
  Capacitor?: { isNativePlatform?: () => boolean };
}
function displayStandalone(env: InstallEnv) {
  return (
    env.matchMedia('(display-mode: standalone)').matches ||
    env.matchMedia('(display-mode: fullscreen)').matches ||
    env.matchMedia('(display-mode: minimal-ui)').matches ||
    Boolean(env.navigator.standalone)
  );
}
function isIos(nav: InstallEnv['navigator']) {
  return (
    /iPhone|iPad|iPod/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  );
}
export function detectInstall(env: InstallEnv): InstallKind {
  if (displayStandalone(env)) return 'installed';
  if (env.Capacitor?.isNativePlatform?.()) return 'native';
  if (isIos(env.navigator)) return 'ios';
  if (/Android/i.test(env.navigator.userAgent)) return 'android';
  return 'desktop';
}
export function windowInstallEnv(): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return {
    matchMedia: (query) =>
      typeof matchMedia === 'undefined' ? { matches: false } : matchMedia(query),
    navigator: {
      standalone: nav.standalone,
      userAgent: nav.userAgent,
      maxTouchPoints: nav.maxTouchPoints ?? 0,
      platform: nav.platform,
    },
    Capacitor: cap,
  };
}
