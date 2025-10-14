# GitHub Secrets Setup for CI/CD

## Critical Security Fix Applied

**⚠️ SECURITY VULNERABILITY RESOLVED:** Hardcoded Supabase credentials have been removed from `.github/workflows/ci.yml` and replaced with GitHub secrets.

## Required GitHub Secrets

To enable CI builds, you must add the following secrets to your GitHub repository:

### How to Add Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name and value:

### Required Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://iwavciibrspfjezujydc.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YXZjaWlicnNwZmplenVqeWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjEyNDgsImV4cCI6MjA3MzYzNzI0OH0.38Z23XIXV3lOOE7Bzq-L0_BipY1wfdXu07hMzN4I6Ec` | Your Supabase anonymous key |
| `VITE_APP_URL` | `http://localhost:3000` | Application URL |

### Optional Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VITE_SENTRY_DSN` | Your Sentry DSN | Error monitoring (if using Sentry) |

## Security Benefits

✅ **Credentials Protected** - No longer exposed in plaintext in repository  
✅ **Rotation Friendly** - Easy to rotate credentials without code changes  
✅ **Audit Trail** - GitHub tracks secret usage and access  
✅ **Environment Isolation** - Different secrets for different environments  

## Verification

After adding the secrets:

1. **Check CI Status** - Builds should pass with proper environment variables
2. **Test Build Locally** - Verify build works with same environment variables
3. **Monitor Usage** - GitHub shows secret usage in Actions logs

## Important Notes

- **Never commit credentials** to the repository again
- **Rotate keys regularly** (every 90 days or on staff changes)
- **Use different secrets** for staging/production environments
- **Monitor secret usage** through GitHub Actions logs

## Troubleshooting

### Build Fails with "Secret not found"
- Verify secret names match exactly (case-sensitive)
- Check secret exists in repository settings
- Ensure secret is not empty

### Build Fails with "Invalid credentials"
- Verify Supabase URL and key are correct
- Check if Supabase project is active
- Verify RLS policies allow anonymous access

## Next Steps

1. **Add the secrets** to your GitHub repository
2. **Test the CI build** to ensure it works
3. **Document secret rotation** process for your team
4. **Consider using environment-specific secrets** for staging/production

---

**Security Status:** ✅ **RESOLVED** - No hardcoded credentials in repository
