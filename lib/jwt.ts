// lib/jwt.ts
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'preproute_default_jwt_signing_secret_64_characters_long_for_dev_mode';

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any });
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}
