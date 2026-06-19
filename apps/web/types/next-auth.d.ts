import { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { UserRole } from './api';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isVerified: boolean;
      accessToken: string;
      refreshToken: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    isVerified: boolean;
    accessToken: string;
    refreshToken: string;
  }
}
