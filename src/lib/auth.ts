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
      
      if (!token.email && !token.name) {
        
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
      
   
      if (profile) {
        if ('id' in profile) {
          token.id = profile.id as string;
        } else if ('sub' in profile) {
           
          token.id = profile.sub as string;
        } else { 
          token.id = `user_${Buffer.from(profile.email || token.email || 'unknown').toString('base64').slice(0, 16)}`;
        }
      }
    
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
       
      if (!token.id && token.email) {
        token.id = `user_${Buffer.from(token.email).toString('base64').slice(0, 16)}`;
      }
       
      if (!token.id) {
        token.id = `user_${Math.random().toString(36).substring(2, 15)}`;
      }
      
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user,  profile }: any) {
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
      if (!token.email && !token.name) {
        return {
          user: undefined,
          accessToken: undefined,
          expires: new Date(0).toISOString()
        };
      }
      
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        session.accessToken = token.accessToken as string;
      } else {
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
      
   
      if (!session.user?.id && token) {
        if (!session.user) {
          session.user = {} as any;
        }
        (session.user as any).id = token.id || `user_${Math.random().toString(36).substring(2, 15)}`;
      }
      
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      
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
