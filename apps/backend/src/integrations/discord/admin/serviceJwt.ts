/**
 * serviceJwt.ts — service-role JWT minter for the Discord bot.
 *
 * The `/admin/*` REST endpoints are guarded by `protect` +
 * `authorize('admin', ...)`, which expects a real user JWT. The bot
 * has no human session, so it mints a short-lived (60s) JWT whose
 * payload marks it as a service account.
 *
 * Usage:
 *   const token = await mintServiceJwt();
 *   await fetch(`${apiBase}/csfaq/api/admin/web-pages`, {
 *     headers: { Authorization: `Bearer ${token}` },
 *   });
 *
 * NOTE (v1.69): the standard `protect` middleware still calls
 * `User.findById(decoded.id)`, so a service JWT alone will 401 until
 * `authShared.ts` learns the `kind: 'service'` bypass (out of scope
 * for this commit). Until then the bot should prefer the existing
 * `X-Internal-Api-Key` path (`protect` already accepts it via
 * `checkInternalApiKey`).
 */
import jwt from 'jsonwebtoken';

const SERVICE_USER_ID = 'discord-bot';
const SERVICE_ROLE = 'admin';
const SERVICE_TTL_SECONDS = 60;

/** True iff JWT_SECRET is set in the env. Bot should warn at startup if false. */
export function hasJwtSecret(): boolean {
  return Boolean(process.env.JWT_SECRET?.trim());
}

export interface ServiceJwtPayload {
  id: string;
  role: string;
  kind: 'service';
}

export function mintServiceJwt(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set — cannot mint service JWT');
  return jwt.sign(
    { id: SERVICE_USER_ID, role: SERVICE_ROLE, kind: 'service' } satisfies ServiceJwtPayload,
    secret,
    { expiresIn: SERVICE_TTL_SECONDS },
  );
}