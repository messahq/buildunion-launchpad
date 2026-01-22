# Security Documentation

This document outlines the security considerations, implementations, and best practices for this project.

## Table of Contents

- [Authentication](#authentication)
- [Authorization & Row Level Security](#authorization--row-level-security)
- [Backend Function Security](#backend-function-security)
- [API Key Management](#api-key-management)
- [Input Validation](#input-validation)
- [Storage Security](#storage-security)
- [Security Best Practices](#security-best-practices)

---

## Authentication

### Password Policy

- **Leaked password protection** is enabled to prevent users from using compromised passwords
- Auto-confirm email signups are enabled for streamlined onboarding
- Anonymous sign-ups are **disabled** to ensure all users have valid credentials

### Session Management

- JWT tokens are used for authentication
- Tokens are validated server-side using `auth.getUser()` or `auth.getClaims()`
- All protected endpoints require a valid `Authorization: Bearer <token>` header

---

## Authorization & Row Level Security

### RLS Policies Overview

All database tables have Row Level Security (RLS) enabled with granular access controls:

| Table | Policy Summary |
|-------|----------------|
| `bu_profiles` | Users can view own profile + collaborators who share projects |
| `projects` | Owner full access; members can view |
| `project_members` | Project owners can manage; members can view |
| `project_documents` | Project owners/members only |
| `project_tasks` | Project owners/members only |
| `project_summaries` | User-scoped access |
| `notification_logs` | Server-side insert only; no client access |
| `push_subscriptions` | User-scoped access |

### Security Definer Functions

These functions bypass RLS to perform authorized cross-table queries:

```sql
-- Check if two users share a project (for profile visibility)
users_share_project(_viewer_id uuid, _profile_owner_id uuid) → boolean

-- Check project ownership
is_project_owner(_project_id uuid, _user_id uuid) → boolean

-- Check project membership
is_project_member(_project_id uuid, _user_id uuid) → boolean

-- Add project member with server-side validation
add_project_member_validated(_project_id uuid, _user_id uuid, _role text) → jsonb
```

### Role-Based Access

Project members are assigned roles with specific permissions:
- `foreman` - Site supervision access
- `worker` - Basic task access
- `inspector` - Inspection and verification access
- `subcontractor` - Limited project access
- `member` - Default role with basic access

---

## Backend Function Security

### Authentication Requirements

All backend functions require JWT validation:

```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
}
```

### Protected Functions

| Function | Security Measures |
|----------|-------------------|
| `get-maps-key` | JWT validation, returns key only to authenticated users |
| `send-push-notification` | JWT + project membership/ownership verification |
| `extract-pdf-text` | JWT validation, UUID format validation |
| `generate-summary` | JWT validation, project access verification |

### Input Validation

All backend functions validate inputs:
- UUID format validation using regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Array length limits (e.g., max 100 user IDs per notification request)
- Type checking and sanitization

---

## API Key Management

### Secure Storage

All sensitive API keys are stored as backend secrets, never in client-side code:

| Secret | Purpose |
|--------|---------|
| `GOOGLE_MAPS_API_KEY` | Maps integration (retrieved via secure endpoint) |
| `STRIPE_SECRET_KEY` | Payment processing |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push notifications |
| `LOVABLE_API_KEY` | AI features |

### Google Maps API Security

The Google Maps API key requires additional protection in Google Cloud Console:

#### HTTP Referrer Restrictions

1. Go to **APIs & Services > Credentials**
2. Click on your Maps API key
3. Under **Application restrictions**, select **HTTP referrers (websites)**
4. Add allowed domains:
   - `https://your-app.lovable.app/*`
   - `https://your-custom-domain.com/*`

#### API Quotas

1. Go to **APIs & Services > Quotas**
2. Set daily request limits for Maps JavaScript API
3. Configure per-user quotas to prevent abuse

---

## Input Validation

### Client-Side Validation

Use Zod schemas for type-safe validation:

```typescript
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(1000)
});
```

### URL Parameter Encoding

Always encode user input in URLs:

```typescript
const safeUrl = `https://api.example.com?query=${encodeURIComponent(userInput)}`;
```

### HTML Sanitization

- **Never** use `dangerouslySetInnerHTML` with user-provided content
- Use DOMPurify if HTML rendering is required
- Validate CSS values if allowing custom styling

---

## Storage Security

### Bucket Configuration

| Bucket | Public | Access Control |
|--------|--------|----------------|
| `avatars` | Yes | Public read, authenticated write |
| `project-documents` | No | Project owners/members only |

### File Upload Security

- Files are stored with UUID-prefixed paths to prevent conflicts
- File size limits are enforced
- MIME type validation is performed

### RLS Policies for Storage

```sql
-- Only project members can access project documents
CREATE POLICY "Project members can access documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' 
  AND (
    public.is_project_owner(/* extracted project_id */, auth.uid())
    OR public.is_project_member(/* extracted project_id */, auth.uid())
  )
);
```

---

## Security Best Practices

### Development

- ✅ Never log sensitive data (passwords, tokens, API keys)
- ✅ Use environment variables for configuration
- ✅ Validate all inputs on both client and server
- ✅ Use parameterized queries (handled by Supabase SDK)

### Deployment

- ✅ Enable HTTPS only
- ✅ Configure CORS appropriately
- ✅ Set up monitoring and alerting for unusual activity
- ✅ Regularly rotate API keys and secrets

### Monitoring

- ✅ Review authentication logs for failed attempts
- ✅ Monitor API usage for anomalies
- ✅ Set up billing alerts for cloud services
- ✅ Periodically run security scans

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the project maintainers directly. Do not create public issues for security vulnerabilities.

---

## Security Scan Results

The project undergoes regular security scans. Current status:

- **RLS Policies**: All tables protected
- **Authentication**: Enforced on all protected endpoints
- **Input Validation**: Implemented on all backend functions
- **API Keys**: Securely stored in backend secrets

### Intentionally Accepted Risks

| Finding | Reason | Mitigation |
|---------|--------|------------|
| `project_syntheses` no UPDATE policy | Immutable AI records by design | Use delete-and-recreate pattern |
| Google Maps API key exposure | Required by client-side library | HTTP referrer restrictions + quotas |
