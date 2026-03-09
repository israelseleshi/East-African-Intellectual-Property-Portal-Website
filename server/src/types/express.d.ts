import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface AuthUser {
    id: string;
    email?: string;
    role?: string;
    name?: string;
  }

  interface Request {
    requestId: string;
    user?: AuthUser;
  }
}
