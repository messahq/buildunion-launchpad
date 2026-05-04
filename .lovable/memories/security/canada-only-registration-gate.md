---
name: Canada-Only Registration Gate
description: IP-based country check blocks non-Canadian signups via country-check edge function
type: feature
---
# Canada-Only Registration

**Edge function**: `country-check` (verify_jwt=false) — calls ipapi.co with caller's x-forwarded-for IP, returns `{ country, countryName, allowed }`. `allowed=true` only when country code is `CA`.

**Where enforced**:
- `src/components/HeroSignupForm.tsx` — Hero signup form on landing page
- `src/pages/Register.tsx` — Full register page

Both call `supabase.functions.invoke("country-check")` BEFORE `signUp()`. If `allowed=false`, show toast: "BuildUnion is currently available in Canada only. Detected location: {country}." and abort.

**Fail-open**: If the IP lookup fails (network error, ipapi down), signup proceeds — better UX than locking everyone out.

**Bypass risk**: VPN users from outside Canada can still register. Acceptable for v1; can layer in profile-level Canadian region/postal validation later.

**Why**: Aligns with `business/canadian-regional-rollout-strategy-v2` (Ontario-only rollout). Existing non-Canadian accounts (e.g. Balázs from Budapest) are intentionally left in place as test users.
