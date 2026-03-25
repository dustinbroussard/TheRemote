const DEFAULT_ADMIN_EMAIL = 'dustin.broussard@gmail.com';

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const adminConfig = {
  emails: parseList(import.meta.env.VITE_ADMIN_EMAIL).length
    ? parseList(import.meta.env.VITE_ADMIN_EMAIL)
    : [DEFAULT_ADMIN_EMAIL],
  uids: parseList(import.meta.env.VITE_ADMIN_UID),
};

type AdminCandidate = {
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean;
};

export function isAdminUser(user: AdminCandidate | null | undefined) {
  if (!user) {
    return false;
  }

  const hasAllowedUid = !!user.uid && adminConfig.uids.includes(user.uid);
  const hasAllowedEmail =
    !!user.email &&
    user.emailVerified === true &&
    adminConfig.emails.includes(user.email);

  return hasAllowedUid || hasAllowedEmail;
}

export function getAdminIdentitySummary() {
  const emailSummary = adminConfig.emails.join(', ') || 'none';
  const uidSummary = adminConfig.uids.join(', ') || 'none';
  return `email: ${emailSummary} | uid: ${uidSummary}`;
}
