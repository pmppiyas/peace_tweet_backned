import * as crypto from 'crypto';
import * as tls from 'tls';
import httpStatus from 'http-status-codes';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { envVar } from '../../config/env';
import AppError from '../../utils/appError';
import { authServices } from '../auth/auth.services';
import { pointsServices } from '../points/points.services';
import { usersServices } from './users.services';

const OTP_TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_OTP_ATTEMPTS = 5;

const otpCacheKey = (userId: string) => `email-verify:otp:${userId}`;
const cooldownCacheKey = (userId: string) => `email-verify:cooldown:${userId}`;

const hashOtpCode = (userId: string, email: string, code: string) =>
  crypto
    .createHash('sha256')
    .update(`${userId}:${email.toLowerCase().trim()}:${code}`)
    .digest('hex');

const safeCompareHex = (a: string, b: string) => {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

interface CachedOtpRecord {
  codeHash: string;
  email: string;
  attempts: number;
}

/** Lightweight implicit-TLS (port 465) SMTP helper for Gmail App Password or SMTP hosts. */
const sendViaSmtpTls = (params: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: params.host, port: params.port, servername: params.host },
      () => {
        // Connected; wait for 220 banner in data handler
      },
    );

    socket.setEncoding('utf8');
    socket.setTimeout(12000, () => {
      socket.destroy(new Error('SMTP connection timed out'));
    });

    let buffer = '';
    let step = 0;

    const sendLine = (line: string) => {
      socket.write(`${line}\r\n`);
    };

    const rawMessage = [
      `From: PeaceTweet <${params.from}>`,
      `To: <${params.to}>`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      params.text,
      '.',
    ].join('\r\n');

    const fail = (err: Error) => {
      try {
        socket.destroy();
      } catch {}
      reject(err);
    };

    socket.on('error', fail);
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line) continue;
        // Multi-line SMTP response ends when char 3 is a space (e.g. "250 ")
        if (line.length >= 4 && line[3] === '-') continue;

        const code = parseInt(line.slice(0, 3), 10);
        if (Number.isNaN(code)) continue;

        if (step === 0 && code === 220) {
          step = 1;
          sendLine(`EHLO ${params.host}`);
        } else if (step === 1 && code === 250) {
          step = 2;
          sendLine('AUTH LOGIN');
        } else if (step === 2 && code === 334) {
          step = 3;
          sendLine(Buffer.from(params.user, 'utf8').toString('base64'));
        } else if (step === 3 && code === 334) {
          step = 4;
          sendLine(Buffer.from(params.pass, 'utf8').toString('base64'));
        } else if (step === 4 && code === 235) {
          step = 5;
          sendLine(`MAIL FROM:<${params.from}>`);
        } else if (step === 5 && code === 250) {
          step = 6;
          sendLine(`RCPT TO:<${params.to}>`);
        } else if (step === 6 && (code === 250 || code === 251)) {
          step = 7;
          sendLine('DATA');
        } else if (step === 7 && code === 354) {
          step = 8;
          sendLine(rawMessage);
        } else if (step === 8 && code === 250) {
          step = 9;
          sendLine('QUIT');
          socket.end();
          resolve();
          return;
        } else if (code >= 400) {
          fail(new Error(`SMTP error (${code}): ${line}`));
          return;
        }
      }
    });
  });

const dispatchVerificationEmail = async (params: {
  to: string;
  name: string;
  code: string;
}): Promise<'resend' | 'smtp' | 'dev'> => {
  const { to, name, code } = params;
  const subject = 'PeaceTweet — Verify your email (+50 Points)';
  const text = `Assalamu Alaikum ${name || 'Member'},\n\nYour PeaceTweet email verification code is: ${code}\n\nThis code expires in 10 minutes. Completing verification awards +50 points and unlocks eligibility for the green verified icon.\n\nIf you did not request this, you can safely ignore this message.`;
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;border:1px solid #e4e6eb;border-radius:12px;">
    <h2 style="color:#059669;margin-top:0;">PeaceTweet Email Verification</h2>
    <p>Assalamu Alaikum <strong>${name || 'Member'}</strong>,</p>
    <p>Use the verification code below to verify your email address, earn <strong>+50 points</strong>, and qualify for the <strong>Green Verified Icon</strong>:</p>
    <div style="font-size:28px;font-weight:800;letter-spacing:6px;text-align:center;padding:14px 20px;background:#ecfdf5;color:#047857;border-radius:10px;margin:18px 0;">${code}</div>
    <p style="font-size:13px;color:#65676b;">This code expires in 10 minutes.</p>
  </div>`;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'PeaceTweet <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        `Failed sending verification email: ${errText || res.statusText}`,
      );
    }
    return 'resend';
  }

  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
  if (smtpUser && smtpPass) {
    const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const fromAddr = (process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser).trim();
    await sendViaSmtpTls({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: fromAddr,
      to,
      subject,
      html,
      text,
    });
    return 'smtp';
  }

  if (envVar.NODE_ENV !== 'production') {
    console.info(`[DEV EMAIL VERIFICATION] OTP for ${to}: ${code}`);
    return 'dev';
  }

  throw new AppError(
    httpStatus.SERVICE_UNAVAILABLE,
    'Email OTP service is not configured yet. Please verify instantly using Google Sign-In.',
  );
};

const finalizeVerifiedEmail = async (
  userId: string,
  rawEmail: string,
  method: 'otp' | 'google',
  googleSub?: string,
) => {
  const normalizedEmail = rawEmail.trim().toLowerCase();

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, googleId: true },
  });
  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  const conflictEmail = await prisma.user.findFirst({
    where: { email: normalizedEmail, NOT: { id: userId } },
    select: { id: true },
  });
  if (conflictEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This email address is already registered to another account.',
    );
  }

  if (googleSub) {
    const conflictGoogle = await prisma.user.findFirst({
      where: { googleId: googleSub, NOT: { id: userId } },
      select: { id: true },
    });
    if (conflictGoogle) {
      throw new AppError(
        httpStatus.CONFLICT,
        'This Google account is already linked to another PeaceTweet account.',
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: normalizedEmail,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      ...(googleSub && !currentUser.googleId ? { googleId: googleSub } : {}),
    },
  });

  // Grant +50 pts for VERIFY_EMAIL (idempotent per user) & evaluate profile completion -> VERIFIED badge
  const awardRes = await pointsServices.awardTaskPoints({
    userId,
    taskCode: 'VERIFY_EMAIL',
    sourceKey: `VERIFY_EMAIL:${userId}`,
    metadata: { email: normalizedEmail, method },
  });

  await pointsServices.syncProfileCompletionTasks(userId).catch(() => {});

  await Promise.all([
    cacheService.delPattern(`user:*:${userId}*`).catch(() => {}),
    cacheService.delPattern(`user:me:${userId}`).catch(() => {}),
    cacheService.delPattern(`user:username:${currentUser.username.toLowerCase()}`).catch(() => {}),
    cacheService.delPattern(`points:*:${userId}*`).catch(() => {}),
    cacheService.delPattern('feed:*').catch(() => {}),
    cacheService.delPattern('posts:*').catch(() => {}),
  ]);

  const updatedUser = await usersServices.findById(userId);
  return {
    user: updatedUser,
    emailVerified: true,
    pointsAwarded: awardRes.pointsDelta || 0,
    alreadyAwarded: !awardRes.awarded,
    userStatus: (updatedUser as any)?.userStatus,
  };
};

export const sendEmailVerificationCode = async (userId: string, requestedEmail?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  const targetEmail = (requestedEmail || user.email || '').trim().toLowerCase();
  if (
    !targetEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail) ||
    targetEmail.endsWith('@social.placeholder')
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please enter a valid Gmail or email address to verify.',
    );
  }

  if (user.emailVerified && targetEmail === user.email.toLowerCase()) {
    return {
      alreadyVerified: true,
      sent: false,
      email: targetEmail,
      emailVerified: true,
    };
  }

  if (targetEmail !== user.email.toLowerCase()) {
    const existing = await prisma.user.findFirst({
      where: { email: targetEmail, NOT: { id: userId } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(
        httpStatus.CONFLICT,
        'This email address is already registered to another account.',
      );
    }
  }

  const cooldownUntil = await cacheService.get<number>(cooldownCacheKey(userId));
  if (cooldownUntil && Date.now() < cooldownUntil) {
    const waitSec = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `Please wait ${waitSec}s before requesting another verification code.`,
    );
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const record: CachedOtpRecord = {
    codeHash: hashOtpCode(userId, targetEmail, code),
    email: targetEmail,
    attempts: 0,
  };

  await cacheService.set(otpCacheKey(userId), record, OTP_TTL_SECONDS);
  await cacheService.set(
    cooldownCacheKey(userId),
    Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
    RESEND_COOLDOWN_SECONDS,
  );

  let deliveryMode: 'resend' | 'smtp' | 'dev';
  try {
    deliveryMode = await dispatchVerificationEmail({
      to: targetEmail,
      name: user.name,
      code,
    });
  } catch (err) {
    await cacheService.del(otpCacheKey(userId)).catch(() => {});
    await cacheService.del(cooldownCacheKey(userId)).catch(() => {});
    throw err;
  }

  return {
    alreadyVerified: false,
    sent: true,
    email: targetEmail,
    deliveryMode,
    expiresInSeconds: OTP_TTL_SECONDS,
    ...(deliveryMode === 'dev' ? { devCode: code } : {}),
  };
};

export const confirmEmailVerificationCode = async (
  userId: string,
  code: string,
  requestedEmail?: string,
) => {
  const cleanCode = (code || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please enter a valid 6-digit verification code.');
  }

  const cached = await cacheService.get<CachedOtpRecord>(otpCacheKey(userId));
  if (!cached) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Verification code expired or not found. Please request a new code.',
    );
  }

  if (requestedEmail && requestedEmail.trim().toLowerCase() !== cached.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email address changed. Please request a new verification code for this email.',
    );
  }

  if (cached.attempts >= MAX_OTP_ATTEMPTS) {
    await cacheService.del(otpCacheKey(userId)).catch(() => {});
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      'Too many invalid attempts. Please request a new verification code.',
    );
  }

  const candidateHash = hashOtpCode(userId, cached.email, cleanCode);
  if (!safeCompareHex(candidateHash, cached.codeHash)) {
    const nextAttempts = cached.attempts + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await cacheService.del(otpCacheKey(userId)).catch(() => {});
    } else {
      await cacheService.set(
        otpCacheKey(userId),
        { ...cached, attempts: nextAttempts },
        OTP_TTL_SECONDS,
      );
    }
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid verification code.');
  }

  await Promise.all([
    cacheService.del(otpCacheKey(userId)).catch(() => {}),
    cacheService.del(cooldownCacheKey(userId)).catch(() => {}),
  ]);

  return finalizeVerifiedEmail(userId, cached.email, 'otp');
};

export const verifyEmailWithGoogle = async (
  userId: string,
  dto: { accessToken?: string; idToken?: string; code?: string; redirectUri?: string },
) => {
  const googleProfile = await authServices.resolveGoogleProfile(dto);
  if (!googleProfile.email || !googleProfile.email_verified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Google account did not return a verified Gmail address.',
    );
  }

  return finalizeVerifiedEmail(userId, googleProfile.email, 'google', googleProfile.sub);
};

export const emailVerificationService = {
  sendEmailVerificationCode,
  confirmEmailVerificationCode,
  verifyEmailWithGoogle,
};
