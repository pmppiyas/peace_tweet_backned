import { envVar } from '../config/env';

export const normalizeOrigin = (urlStr: string): string => {
  return urlStr
    .trim()
    .replace(/^["']+|["']+$/g, '') // remove surrounding quotes
    .trim()
    .replace(/\/+$/, '') // remove trailing slashes
    .toLowerCase();
};

export const isOriginAllowed = (origin?: string): boolean => {
  // Allow non-browser requests where Origin header is absent
  if (!origin) return true;

  const incoming = normalizeOrigin(origin);

  // Read environment variable, with process.env fallback
  const rawEnv = (envVar.CORS_ORIGIN || process.env.CORS_ORIGIN || '').trim();

  // If empty or wildcard, allow all
  if (!rawEnv || rawEnv === '*' || rawEnv === '"*"' || rawEnv === "'*'") {
    return true;
  }

  // Parse comma-separated list of allowed origins
  const allowedList = rawEnv.split(',').map(normalizeOrigin).filter(Boolean);

  if (allowedList.includes('*')) {
    return true;
  }

  // Check direct matches
  for (const allowed of allowedList) {
    if (incoming === allowed) return true;

    // If configured without protocol (e.g. peacetweet.vercel.app)
    if (`https://${allowed}` === incoming || `http://${allowed}` === incoming) {
      return true;
    }
  }

  // URL hostname-based checks
  try {
    const incomingUrl = new URL(incoming);
    const incomingHost = incomingUrl.hostname.toLowerCase();

    // Always allow local development
    if (incomingHost === 'localhost' || incomingHost === '127.0.0.1') {
      return true;
    }

    // Always allow peace-tweet frontend on Vercel (including preview deploys)
    if (incomingHost === 'peacetweet.vercel.app' || incomingHost.endsWith('.vercel.app')) {
      return true;
    }

    // Check if any allowed entry matches the hostname
    for (const allowed of allowedList) {
      try {
        const allowedUrl = allowed.includes('://') ? new URL(allowed) : null;
        if (allowedUrl && allowedUrl.hostname.toLowerCase() === incomingHost) {
          return true;
        }
      } catch {
        if (allowed === incomingHost) return true;
      }
    }
  } catch {
    // If incoming is not a valid URL
  }

  return false;
};
