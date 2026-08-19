/**
 * What the running build is called, worded once so the Settings version row and the feedback
 * email cannot drift apart. Pure: the screen supplies Platform.OS/Platform.Version, because core
 * cannot see react-native. iOS's buildNumber is a string, Android's versionCode a number — both
 * arrive here as a string.
 */

export interface BuildInfo {
  version: string | null;
  build?: string;
  os: string;
  /** Platform.Version: the OS version string on iOS, the API level number on Android. */
  osVersion: string | number;
}

export function versionLabel({ version, build }: BuildInfo): string {
  if (!version) return '—';
  return build ? `${version} (${build})` : version;
}

/** One paste-ready line — "Open Anot? 1.0.0 (4) · ios 18.5" — everything a bug report needs. */
export function buildSummary(info: BuildInfo): string {
  return `Open Anot? ${versionLabel(info)} · ${info.os} ${info.osVersion}`;
}

/** The mailto opens with the build details already quoted below a blank writing area. */
export function feedbackUrl(to: string, info: BuildInfo): string {
  const subject = encodeURIComponent('Open Anot? feedback');
  const body = encodeURIComponent(`\n\n—\n${buildSummary(info)}`);
  return `${to}?subject=${subject}&body=${body}`;
}
