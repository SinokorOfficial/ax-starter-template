import type { DefaultSession } from "next-auth";
import type { PortalRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    error?: "RefreshAccessTokenError";
    user: DefaultSession["user"] & {
      role?: PortalRole;
      department?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: "RefreshAccessTokenError";
    role?: PortalRole;
    department?: string;
  }
}
