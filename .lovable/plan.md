

# Security Fixes: Trial Bypass + Role Injection

## Vulnerability 1: Trial Bypass

**Problem:** The `user_trials` table RLS allows users to `INSERT` and `UPDATE` their own rows with **any values**, including `max_allowed` and `used_count`. A user can set `used_count = 0` or `max_allowed = 999` via direct API calls.

**Fix:**
1. **Database migration** — Create a `SECURITY DEFINER` function `use_one_trial(feature_name text)` that:
   - Looks up or creates the trial record server-side
   - Increments `used_count` by 1 only if `used_count < max_allowed`
   - Sets `max_allowed` from the hardcoded server-side defaults (not user input)
   - Handles monthly reset logic for `messa_quick_log`
   - Returns the new count or raises an error
2. **Database migration** — Replace permissive INSERT/UPDATE RLS policies on `user_trials`:
   - Keep SELECT policy (users can view own)
   - Remove INSERT and UPDATE policies (no direct client writes)
   - Add INSERT policy: `WITH CHECK (false)` — server-side only via the function
   - Add UPDATE policy: `USING (false)` — server-side only
3. **Frontend** — Update `useDbTrialUsage.tsx`:
   - Replace the `upsert` in `useOneTrial` with an RPC call to `use_one_trial`
   - Remove `resetTrials` client-side write (or make it admin-only via a separate SECURITY DEFINER function)
   - Monthly reset logic moves to the database function

## Vulnerability 2: Role Injection on Invitation Accept

**Problem:** When a user accepts an invitation in `PendingInvitationsPanel.tsx`, the client inserts into `project_members` with `role: invitation.role`. The RLS policy "Users can add themselves via pending invitation" only checks that a pending invitation exists for that email+project — it does **not** validate that the role matches the invitation's role. A user could intercept the request and change `role` to `foreman` or `owner`.

**Fix:**
1. **Database migration** — Create a `SECURITY DEFINER` function `accept_invitation(invitation_id uuid)` that:
   - Validates the invitation exists, is `pending`, and matches `auth.jwt()->>'email'`
   - Inserts into `project_members` using the role **from the invitation record** (not user input)
   - Updates the invitation status to `accepted` with `responded_at = now()`
   - Returns success/error
2. **Database migration** — Remove the "Users can add themselves via pending invitation" INSERT policy on `project_members` (the function handles it securely)
3. **Frontend** — Update `PendingInvitationsPanel.tsx`:
   - Replace the two-step insert+update with a single RPC call to `accept_invitation`

## Summary of Changes

| Area | File/Table | Change |
|------|-----------|--------|
| DB | `user_trials` | New `use_one_trial()` function; lock down INSERT/UPDATE policies |
| DB | `project_members` | New `accept_invitation()` function; remove self-add INSERT policy |
| Frontend | `src/hooks/useDbTrialUsage.tsx` | Use RPC instead of direct upsert |
| Frontend | `src/components/PendingInvitationsPanel.tsx` | Use RPC instead of direct insert+update |

