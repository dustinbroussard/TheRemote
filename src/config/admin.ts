const DEFAULT_ADMIN_EMAIL = 'dustin.broussard@gmail.com';

function readEnvValue(name: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[name] === 'string') {
    return import.meta.env[name];
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string') {
    return process.env[name];
  }

  return undefined;
}

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const adminConfig = {
  emails: parseList(readEnvValue('VITE_ADMIN_EMAIL')).length
    ? parseList(readEnvValue('VITE_ADMIN_EMAIL'))
    : [DEFAULT_ADMIN_EMAIL],
  uids: parseList(readEnvValue('VITE_ADMIN_UID')),
};

type AdminCandidate = {
  id?: string | null;
  uid?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
  emailVerified?: boolean;
};

export function isAdminUser(user: AdminCandidate | null | undefined) {
  if (!user) {
    return false;
  }

  const userId = user.id || user.uid;
  const hasAllowedUid = !!userId && adminConfig.uids.includes(userId);

  const isEmailVerified = user.emailVerified === true || !!user.email_confirmed_at;
  const hasAllowedEmail =
    !!user.email &&
    isEmailVerified &&
    adminConfig.emails.includes(user.email);

  return hasAllowedUid || hasAllowedEmail;
}

export function getAdminIdentitySummary() {
  const emailSummary = adminConfig.emails.join(', ') || 'none';
  const uidSummary = adminConfig.uids.join(', ') || 'none';
  return `email: ${emailSummary} | uid: ${uidSummary}`;
}

export type { AdminCandidate };
