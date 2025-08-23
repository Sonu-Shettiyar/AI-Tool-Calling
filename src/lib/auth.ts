import NextAuth, { NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accessToken: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  events: {
    async signOut({ token }) {
      // Clear JWT token data when user signs out
      if (token) {
        (token as any).id = undefined;
        (token as any).accessToken = undefined;
        (token as any).email = undefined;
        (token as any).name = undefined;
        (token as any).picture = undefined;
        (token as any).sub = undefined;
      }
    },
  },

  callbacks: {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, profile }: any) {
      // Check if this is a sign-out scenario (token has been cleared)
      if (!token.email && !token.name) {
        // Token has been cleared, return minimal token
        return {
          ...token,
          id: undefined,
          accessToken: undefined,
          email: undefined,
          name: undefined,
          picture: undefined,
          sub: undefined
        };
      }
      
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      
      // For Google OAuth, the profile.id might be in a different location
      if (profile) {
        if ('id' in profile) {
          token.id = profile.id as string;
        } else if ('sub' in profile) {
          // Google OAuth often uses 'sub' instead of 'id'
          token.id = profile.sub as string;
        } else {
          // Generate a consistent ID from email
          token.id = `user_${Buffer.from(profile.email || token.email || 'unknown').toString('base64').slice(0, 16)}`;
        }
      }
      
      // Ensure the user ID is always preserved in the token
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      
      // If still no ID, generate from email
      if (!token.id && token.email) {
        token.id = `user_${Buffer.from(token.email).toString('base64').slice(0, 16)}`;
      }
      
      // Always ensure we have an ID - this is critical for the session callback
      if (!token.id) {
        token.id = `user_${Math.random().toString(36).substring(2, 15)}`;
      }
      
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account, profile }: any) {
      // Ensure the user object has an ID
      if (user && !user.id) {
        if (profile?.id) {
          (user as any).id = profile.id;
        } else if (profile?.sub) {
          (user as any).id = profile.sub;
        } else if (user.email) {
          (user as any).id = user.email;
        }
      }
      
      return true;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Check if token has been cleared (sign-out scenario)
      if (!token.email && !token.name) {
        // Return empty session for signed-out user
        return {
          user: undefined,
          accessToken: undefined,
          expires: new Date(0).toISOString()
        };
      }
      
      // Always ensure the session has the user ID from the token
      if (token && session.user) {
        // Ensure the user ID is properly set
        (session.user as any).id = token.id as string;
        session.accessToken = token.accessToken as string;
      } else {
        // Try to create a minimal session if possible
        if (token && !session.user) {
          session.user = {
            id: token.id || token.sub || token.email || 'unknown',
            email: token.email,
            name: token.name,
            image: token.picture
          };
          session.accessToken = token.accessToken;
        }
      }
      
      // CRITICAL: Always ensure the user ID is set, even if the callback wasn't called properly
      if (!session.user?.id && token) {
        if (!session.user) {
          session.user = {} as any;
        }
        // Use the token ID which should be properly set by JWT callback
        (session.user as any).id = token.id || `user_${Math.random().toString(36).substring(2, 15)}`;
      }
      
      // FORCE: Always set the user ID from token, regardless of what was there before
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      
      // FINAL CHECK: Ensure the session object is properly structured
      const finalSession = {
        ...session,
        user: {
          ...session.user,
          id: token?.id || session.user?.id || 'unknown'
        }
      };
      
      return finalSession;
         },
   },
};

export default NextAuth(authOptions);
