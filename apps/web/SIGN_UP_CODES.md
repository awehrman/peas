# Sign-Up Code Configuration

This app supports multiple sign-up code configurations to control access to the sign-up page.

## Environment Variables

### Option 1: Simple Single Code

```bash
SIGN_UP_CODES=your-secret-code-here
```

### Option 2: Multiple Codes (Comma-separated)

```bash
SIGN_UP_CODES=code1,code2,code3
```

### Option 3: Advanced JSON Configuration

```bash
SIGN_UP_CODES='[{"code":"invite123","maxUses":10},{"code":"beta2024","expiresAt":"2024-12-31T23:59:59Z"}]'
```

## Usage

### With Code Required

- Users must visit: `/sign-up?code=your-secret-code`
- Without valid code: Redirected to `/login?error=invalid-signup-code`

### Without Code Required

- If `SIGN_UP_CODES` is not set, sign-up is open to everyone
- Users can visit: `/sign-up` directly

## Examples

### Development (Open Sign-up)

```bash
# No environment variable needed - sign-up is open
```

### Production (Restricted)

```bash
SIGN_UP_CODES=beta-access-2024
```

### Multiple Codes with Limits

```bash
SIGN_UP_CODES='[{"code":"team-alpha","maxUses":5},{"code":"beta-tester","expiresAt":"2024-06-30T23:59:59Z"}]'
```

## Security Notes

- Store codes in environment variables, never in code
- Use strong, random codes in production
- Consider rotating codes periodically
- Monitor sign-up attempts for security
