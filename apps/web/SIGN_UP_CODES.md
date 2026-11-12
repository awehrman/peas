# Users and Sign-Up Codes

Accounts are created through an invite link. There is no open sign-up: if `SIGN_UP_CODES` is unset, the invite page redirects to the login page with "Sign-up is currently closed".

## Creating your first user

1. Set at least one code in the repo-root `.env.local`:

   ```bash
   SIGN_UP_CODES=my-secret-code
   ```

2. Start the app (`yarn dev`) and open the invite link:

   ```text
   http://localhost:3000/invite/my-secret-code
   ```

3. Fill in username, email and password. You're signed in afterwards; later sign-ins use `/login` with your email and password.

## Making a user an admin

New accounts are `USER`. Admins additionally get "Delete All Data" on the dashboard and "Create recipes from completed notes" on `/recipes`.

```bash
# list accounts and their roles
yarn workspace @peas/database user:role --list

# promote (defaults to ADMIN) or demote
yarn workspace @peas/database user:role you@example.com
yarn workspace @peas/database user:role you@example.com USER
```

Roles are read on every request, so reloading the app is enough.

## Code formats

### Single code

```bash
SIGN_UP_CODES=your-secret-code-here
```

### Several codes (comma-separated)

```bash
SIGN_UP_CODES=code1,code2,code3
```

### JSON, with expiry

```bash
SIGN_UP_CODES='[{"code":"invite123"},{"code":"beta2024","expiresAt":"2026-12-31T23:59:59Z"}]'
```

`maxUses` is accepted in the JSON but not enforced yet: usage counts aren't stored, so a code works until it's removed or expires.

## Security notes

- Keep codes in `.env.local` (git-ignored), never in code
- Use long random codes outside local development, e.g. `openssl rand -hex 8`
- Remove a code from `SIGN_UP_CODES` to stop new sign-ups with it
