import { FastifyInstance } from 'fastify';
import { fastifyPassport } from '../config/passport';
import { UserService } from '../services/UserService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export default async function authRoutes(fastify: FastifyInstance) {
  const userService = new UserService();

  // ─── Health check ──────────────────────────────────────────────────────────
  fastify.get('/auth/status', async () => ({
    googleOAuth: GOOGLE_CLIENT_ID ? 'enabled' : 'disabled (set GOOGLE_CLIENT_ID env var)',
  }));

  // ─── Logout ──────────────────────────────────────────────────────────────
  fastify.post('/auth/logout', async (req, reply) => {
    // Destroy Passport session if one exists
    if (req.session) {
      req.session.delete();
    }

    reply
      .clearCookie('accessToken', { path: '/' })
      .clearCookie('refreshToken', { path: '/' });

    return { success: true, message: 'Logged out successfully' };
  });

  // ─── Google OAuth ──────────────────────────────────────────────────────────
  if (GOOGLE_CLIENT_ID) {
    /**
     * GET /auth/google
     * Redirects the user to Google's consent screen.
     */
    fastify.get(
      '/auth/google',
      {
        preValidation: fastifyPassport.authenticate('google', {
          scope: ['profile', 'email'],
          session: true,
        }),
      },
      // Handler is never reached — passport redirects to Google
      async () => {}
    );

    /**
     * GET /auth/google/callback
     * Google redirects here after the user consents.
     * Passport exchanges the code, calls the GoogleStrategy verify fn,
     * then we issue JWT cookies and redirect to the frontend.
     */
    fastify.get(
      '/auth/google/callback',
      {
        preValidation: fastifyPassport.authenticate('google', {
          session: true,
          failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
        }),
      },
      async (req, reply) => {
        try {
          const user = (req as any).user;
          if (!user) {
            return reply.redirect(`${FRONTEND_URL}/login?error=no_user`);
          }

          const { accessToken, refreshToken } = await userService.generateTokens(user);

          reply.setCookie('accessToken', accessToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60, // 15 minutes
          });

          reply.setCookie('refreshToken', refreshToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
          });

          // Redirect back to the frontend dashboard
          return reply.redirect(`${FRONTEND_URL}/`);
        } catch (err) {
          fastify.log.error(err);
          return reply.redirect(`${FRONTEND_URL}/login?error=server_error`);
        }
      }
    );
  } else {
    // Stub routes that explain how to enable Google OAuth when env vars are missing
    const stub = async (_req: any, reply: any) => {
      reply.status(501).send({
        success: false,
        message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      });
    };
    fastify.get('/auth/google', stub);
    fastify.get('/auth/google/callback', stub);
  }
}
