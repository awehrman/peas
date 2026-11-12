import {
  PASSWORD,
  createUser,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import { prisma } from "@peas/database";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { loginWithPassword, signUpWithCode } from "../../auth/credentials.js";
import { hashToken } from "../../auth/crypto.js";
import { ensurePeaAvatar } from "../../auth/pea-avatar.js";
import {
  createSession,
  invalidateSession,
  validateSession,
} from "../../auth/session.js";
import { handleGraphQLRequest, resolveViewer } from "../../server.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!hasTestDatabase)(
  "auth against the database (integration)",
  () => {
    beforeEach(resetDatabase);
    afterEach(() => vi.unstubAllEnvs());
    afterAll(() => prisma.$disconnect());

    describe("signUpWithCode", () => {
      const form = {
        code: "spring",
        username: "newcook",
        email: "new@peas.test",
        password: "secret-pass",
        confirmPassword: "secret-pass",
      };

      it("creates the user with a pea avatar and a working session", async () => {
        vi.stubEnv("SIGN_UP_CODES", "spring");
        const result = await signUpWithCode(form);
        expect(result.status).toBe("SUCCESS");
        if (result.status !== "SUCCESS") return;

        const { user } = await validateSession(result.sessionToken);
        expect(user).toMatchObject({
          username: "newcook",
          email: "new@peas.test",
          userType: "USER",
        });
        expect(user?.avatarUrl).toMatch(/^data:image\/svg\+xml/);
      });

      it("rejects missing or wrong invite codes, mismatched passwords, and duplicate accounts", async () => {
        vi.stubEnv("SIGN_UP_CODES", "spring");
        expect(await signUpWithCode({ ...form, code: "autumn" })).toMatchObject(
          { status: "ERROR", message: "Invalid sign-up code" }
        );
        expect(
          await signUpWithCode({ ...form, confirmPassword: "different" })
        ).toMatchObject({
          status: "ERROR",
          fieldErrors: { confirmPassword: ["Passwords do not match"] },
        });

        await createUser({ username: "taken", email: "new@peas.test" });
        expect(await signUpWithCode(form)).toMatchObject({
          status: "ERROR",
          message: "Either email or username is already in use",
        });
      });
    });

    describe("loginWithPassword", () => {
      it("signs in with the right password and gives the same error for a wrong password or unknown email", async () => {
        const user = await createUser();
        const success = await loginWithPassword({
          email: user.email,
          password: PASSWORD,
        });
        expect(success.status).toBe("SUCCESS");
        if (success.status === "SUCCESS")
          expect((await validateSession(success.sessionToken)).user?.id).toBe(
            user.id
          );

        expect(
          await loginWithPassword({
            email: user.email,
            password: "wrong-password",
          })
        ).toMatchObject({
          status: "ERROR",
          message: "Incorrect email or password",
        });
        expect(
          await loginWithPassword({
            email: "nobody@peas.test",
            password: PASSWORD,
          })
        ).toMatchObject({
          status: "ERROR",
          message: "Incorrect email or password",
        });
        expect(
          await loginWithPassword({ email: "not-an-email", password: "x" })
        ).toMatchObject({ status: "ERROR", message: "" });
      });
    });

    describe("sessions", () => {
      it("deletes expired sessions and extends ones close to expiry", async () => {
        const user = await createUser();

        await createSession("expired-token", user.id);
        await prisma.session.update({
          where: { id: hashToken("expired-token") },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        expect(await validateSession("expired-token")).toEqual({
          session: null,
          user: null,
        });
        expect(
          await prisma.session.count({
            where: { id: hashToken("expired-token") },
          })
        ).toBe(0);

        await createSession("old-token", user.id);
        await prisma.session.update({
          where: { id: hashToken("old-token") },
          data: { expiresAt: new Date(Date.now() + DAY_MS) },
        });
        const { session } = await validateSession("old-token");
        expect(session!.expiresAt.getTime()).toBeGreaterThan(
          Date.now() + 29 * DAY_MS
        );

        await invalidateSession(session!.id);
        expect(await validateSession("old-token")).toEqual({
          session: null,
          user: null,
        });
        await expect(invalidateSession(session!.id)).resolves.toBeUndefined();
      });

      it("resolves the viewer from the session cookie of a request", async () => {
        const user = await createUser();
        await createSession("cookie-token", user.id);

        const signedIn = new Request("http://localhost/api/graphql", {
          headers: { cookie: "theme=dark; session=cookie-token" },
        });
        expect((await resolveViewer(signedIn))?.id).toBe(user.id);
        expect(
          await resolveViewer(new Request("http://localhost/api/graphql"))
        ).toBeNull();
      });

      it("serves GraphQL over HTTP with the session cookie", async () => {
        const user = await createUser({ username: "httpcook" });
        await createSession("http-token", user.id);
        const post = (cookie?: string) =>
          handleGraphQLRequest(
            new Request("http://localhost/api/graphql", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                ...(cookie ? { cookie } : {}),
              },
              body: JSON.stringify({ query: "{ viewer { username } }" }),
            })
          ).then((response) => response.json());

        expect(await post("session=http-token")).toEqual({
          data: { viewer: { username: "httpcook" } },
        });
        expect(await post()).toEqual({ data: { viewer: null } });
      });
    });

    it("assigns a pea avatar once to accounts without one", async () => {
      const user = await createUser();
      const avatarUrl = await ensurePeaAvatar(user);
      expect(avatarUrl).toMatch(/^data:image\/svg\+xml/);
      expect(await ensurePeaAvatar({ id: user.id, avatarUrl })).toBe(avatarUrl);
      expect(
        (await prisma.user.findUnique({ where: { id: user.id } }))?.avatarUrl
      ).toBe(avatarUrl);
    });
  }
);
