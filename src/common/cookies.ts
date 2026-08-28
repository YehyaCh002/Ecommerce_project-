const secure = process.env.NODE_ENV === 'production';

export function accessTokenCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: 15 * 60, // 15 minutes
  };
}

export function refreshTokenCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}