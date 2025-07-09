import { Lucia } from "lucia";
import { prisma as prismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "@peas/database";

const adapter = prismaAdapter(prisma);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (user) => {
    return {
      username: user.username,
      email: user.email,
      // TODO consider returning user type and name if needed
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  username: string;
  email: string;
}
