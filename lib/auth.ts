// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import db from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const [users] = (await db.query(
            'SELECT * FROM users WHERE email = ?',
            [credentials.email]
          )) as any[];

          if (users.length === 0) return null;

          const user = users[0];

          if (!user.password) return null;

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          console.log('Credentials login - user role:', user.role); // ← debug

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role || 'user',
          };
        } catch (error) {
          console.error('Authorize error:', error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const [existing] = (await db.query(
            'SELECT id, role FROM users WHERE email = ?',
            [user.email]
          )) as any[];

          if (existing.length === 0) {
            // Create new user
            const userId = crypto.randomUUID();
            const defaultRole = 'user'; // ← change to 'admin' if you want first Google user to be admin
            await db.query(
              'INSERT INTO users (id, name, email, image, role, emailVerified) VALUES (?, ?, ?, ?, ?, NOW())',
              [userId, user.name || 'Google User', user.email, user.image, defaultRole]
            );
            console.log('Created Google user with role:', defaultRole);
          } else {
            // Update image if changed
            await db.query(
              'UPDATE users SET image = COALESCE(?, image), emailVerified = COALESCE(NOW(), emailVerified) WHERE email = ?',
              [user.image, user.email]
            );
          }
        } catch (error) {
          console.error('Google signIn error:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
      }

      // On every request (or when token is refreshed)
      if (token.email && (!token.id || trigger === 'update')) {
        try {
          const [rows] = (await db.query(
            'SELECT id, role FROM users WHERE email = ?',
            [token.email]
          )) as any[];

          if (rows.length > 0) {
            token.id = rows[0].id;
            token.role = rows[0].role || 'user';
            console.log('JWT callback updated - role:', token.role); // debug
          }
        } catch (error) {
          console.error('JWT callback DB error:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        console.log('Session callback - role:', session.user.role); // debug
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};