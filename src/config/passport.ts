import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { prisma } from './database';
import { logger } from './logger';

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: jwt_payload.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lockedUntil: true,
        },
      });

      if (!admin || !admin.isActive) {
        return done(null, false);
      }

      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        return done(null, false);
      }

      return done(null, admin);
    } catch (error) {
      logger.error('Passport JWT strategy error:', error);
      return done(error, false);
    }
  })
);

export const authenticateJWT = passport.authenticate('jwt', { session: false });
