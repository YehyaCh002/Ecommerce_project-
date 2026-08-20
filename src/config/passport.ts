import FastifyPassport from '@fastify/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { AppDataSource } from './data-source';
import { User } from '../entities/User';
import * as bcrypt from 'bcryptjs';

// ─── Serialization ────────────────────────────────────────────────────────────
// Store only the user id in the session
FastifyPassport.registerUserSerializer<User, string>(async (user) => user.id);

// Rehydrate user from session by id
FastifyPassport.registerUserDeserializer<string, User | null>(async (id) => {
  const repo = AppDataSource.getRepository(User);
  return repo.findOne({ where: { id } });
});

// ─── Local Strategy ───────────────────────────────────────────────────────────
// Handles the existing email + bcrypt password flow
FastifyPassport.use(
  'local',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const repo = AppDataSource.getRepository(User);
        const user = await repo.findOne({ where: { email } });

        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        if (!user.password) {
          // OAuth-only account — cannot log in with password
          return done(null, false, { message: 'This account uses Google Sign-In. Please log in with Google.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ─── Google OAuth Strategy ────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3002/auth/google/callback';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  FastifyPassport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
        try {
          const repo = AppDataSource.getRepository(User);

          // 1. Try find by oauthId + provider
          let user = await repo.findOne({
            where: { oauthProvider: 'google', oauthId: profile.id },
          });

          if (!user) {
            // 2. Try find by email (link accounts)
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await repo.findOne({ where: { email } });
            }

            if (user) {
              // Link this Google account to the existing user
              user.oauthProvider = 'google';
              user.oauthId = profile.id;
              if (!user.avatar && profile.photos?.[0]?.value) {
                user.avatar = profile.photos[0].value;
              }
              await repo.save(user);
            } else {
              // 3. Create a brand-new user
              const email = profile.emails?.[0]?.value ?? '';
              user = repo.create({
                name: profile.displayName || email,
                email,
                password: null,
                role: 'customer',
                avatar: profile.photos?.[0]?.value ?? null,
                oauthProvider: 'google',
                oauthId: profile.id,
              });
              await repo.save(user);
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
} else {
  console.warn(
    '[Passport] Google OAuth is disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.'
  );
}

export { FastifyPassport as fastifyPassport };
