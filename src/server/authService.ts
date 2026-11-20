import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface AuthUserRecord {
  id: string;
  displayName: string;
  email: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredUserInternal extends AuthUserRecord {
  passwordHash?: string;
  passwordSalt?: string;
}

interface StoredSessionInternal {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
}

interface AuthStoreDisk {
  users: Record<string, StoredUserInternal>;
  sessions: Record<string, StoredSessionInternal>;
  revokedTokenHashes: string[];
}

// Permanent blocklist of previously leaked session tokens (stored strictly as SHA-256 hashes)
const COMPROMISED_TOKEN_HASHES = new Set<string>([
  crypto
    .createHash('sha256')
    .update('94c714083690dad85c9a951b314d49cd917c85d411136bb4')
    .digest('hex'),
  crypto
    .createHash('sha256')
    .update('0c6d963bd55e9df88d2bf462eff497c52be9bbb90cd752fa')
    .digest('hex'),
]);

const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function toPublicUser(u: StoredUserInternal): AuthUserRecord {
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    isGuest: u.isGuest,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export class AuthService {
  private readonly storePath: string;
  private store: AuthStoreDisk = {
    users: {},
    sessions: {},
    revokedTokenHashes: [],
  };

  constructor(storeFilePath?: string) {
    this.storePath =
      storeFilePath ||
      process.env.MEMORA_AUTH_STORE_PATH ||
      path.join(os.tmpdir(), 'memora-auth-sessions.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.store = {
            users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
            sessions:
              parsed.sessions && typeof parsed.sessions === 'object'
                ? parsed.sessions
                : {},
            revokedTokenHashes: Array.isArray(parsed.revokedTokenHashes)
              ? parsed.revokedTokenHashes
              : [],
          };
        }
      }
    } catch {
      this.store = { users: {}, sessions: {}, revokedTokenHashes: [] };
    }
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.storePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.store, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.storePath);
    } catch {
      // keep in-memory store functioning even on read-only filesystems
    }
  }

  public isTokenRevokedOrCompromised(token: string | null | undefined): boolean {
    if (!token || typeof token !== 'string') return false;
    const digest = hashToken(token.trim());
    if (COMPROMISED_TOKEN_HASHES.has(digest)) return true;
    return this.store.revokedTokenHashes.includes(digest);
  }

  private issueSessionForUser(userId: string, ttlMs = DEFAULT_SESSION_TTL_MS): string {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(rawToken);
    this.store.sessions[tokenHash] = {
      tokenHash,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + ttlMs,
    };
    this.persistToDisk();
    return rawToken;
  }

  public createGuestSession(options?: { ttlMs?: number }): {
    user: AuthUserRecord;
    sessionToken: string;
  } {
    const nowIso = new Date().toISOString();
    const guestId = `guest_${crypto.randomBytes(8).toString('hex')}`;
    const user: StoredUserInternal = {
      id: guestId,
      displayName: 'Guest Curator',
      email: `${guestId}@guest.memora.local`,
      isGuest: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.store.users[guestId] = user;
    const sessionToken = this.issueSessionForUser(
      guestId,
      options?.ttlMs ?? DEFAULT_SESSION_TTL_MS,
    );
    return {
      user: toPublicUser(user),
      sessionToken,
    };
  }

  public registerUser(input: {
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    termsAccepted?: boolean;
  }): {
    ok: boolean;
    code?: string;
    message?: string;
    user?: AuthUserRecord;
    sessionToken?: string;
  } {
    const displayName = String(input?.displayName || '').trim();
    const email = String(input?.email || '').trim().toLowerCase();
    const password = String(input?.password || '');

    if (!displayName || displayName.length < 2) {
      return {
        ok: false,
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be at least 2 characters.',
      };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        ok: false,
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address.',
      };
    }
    if (password.length < 6) {
      return {
        ok: false,
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters.',
      };
    }
    if (
      input?.confirmPassword !== undefined &&
      input.confirmPassword !== password
    ) {
      return {
        ok: false,
        code: 'PASSWORD_MISMATCH',
        message: 'Passwords do not match.',
      };
    }

    const existing = Object.values(this.store.users).find(
      (u) => !u.isGuest && u.email.toLowerCase() === email,
    );
    if (existing) {
      return {
        ok: false,
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists.',
      };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const nowIso = new Date().toISOString();
    const userId = `user_${crypto.randomBytes(8).toString('hex')}`;
    const newUser: StoredUserInternal = {
      id: userId,
      displayName,
      email,
      isGuest: false,
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.store.users[userId] = newUser;
    const sessionToken = this.issueSessionForUser(userId);
    return {
      ok: true,
      user: toPublicUser(newUser),
      sessionToken,
    };
  }

  public loginUser(input: { email?: string; password?: string }): {
    ok: boolean;
    code?: string;
    message?: string;
    user?: AuthUserRecord;
    sessionToken?: string;
  } {
    const email = String(input?.email || '').trim().toLowerCase();
    const password = String(input?.password || '');

    if (!email || !password) {
      return {
        ok: false,
        code: 'MISSING_FIELDS',
        message: 'Email and password are required.',
      };
    }

    const found = Object.values(this.store.users).find(
      (u) => !u.isGuest && u.email.toLowerCase() === email,
    );
    if (!found || !found.passwordSalt || !found.passwordHash) {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      };
    }

    const candidateHash = hashPassword(password, found.passwordSalt);
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(found.passwordHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      };
    }

    const sessionToken = this.issueSessionForUser(found.id);
    return {
      ok: true,
      user: toPublicUser(found),
      sessionToken,
    };
  }

  public getUserBySessionToken(token: string | null | undefined): AuthUserRecord | null {
    if (!token || typeof token !== 'string') return null;
    const clean = token.trim();
    if (!clean) return null;
    if (this.isTokenRevokedOrCompromised(clean)) return null;

    const digest = hashToken(clean);
    const session = this.store.sessions[digest];
    if (!session) return null;

    if (Date.now() >= session.expiresAt) {
      delete this.store.sessions[digest];
      this.persistToDisk();
      return null;
    }

    const user = this.store.users[session.userId];
    if (!user) return null;
    return toPublicUser(user);
  }

  public updateDisplayName(
    token: string | null | undefined,
    displayName: string,
  ): AuthUserRecord | null {
    const user = this.getUserBySessionToken(token);
    const cleaned = displayName.trim();
    if (!user || cleaned.length < 2) return null;

    const stored = this.store.users[user.id];
    if (!stored) return null;
    stored.displayName = cleaned;
    stored.updatedAt = new Date().toISOString();
    this.persistToDisk();
    return toPublicUser(stored);
  }

  public revokeSession(token: string | null | undefined): boolean {
    if (!token || typeof token !== 'string') return false;
    const clean = token.trim();
    if (!clean) return false;
    const digest = hashToken(clean);
    const existed = Boolean(this.store.sessions[digest]);
    delete this.store.sessions[digest];
    if (!this.store.revokedTokenHashes.includes(digest)) {
      this.store.revokedTokenHashes.push(digest);
    }
    this.persistToDisk();
    return existed || true;
  }
}
