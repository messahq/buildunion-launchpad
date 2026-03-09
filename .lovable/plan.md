

# BuildUnion -- Technical Briefing for New Team Member

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Routing** | react-router-dom v6 (BrowserRouter, ~25 routes) |
| **State Management** | React Context (AuthProvider, RegionProvider, UnitProvider, ThemeProvider) + TanStack React Query for server state |
| **UI Library** | shadcn/ui (Radix primitives + Tailwind CSS 3) |
| **Animations** | Framer Motion |
| **Forms** | react-hook-form + zod validation |
| **i18n** | i18next (11 languages: en, fr, es, de, hu, ar, hi, ja, pt, ru, zh) |
| **PDF** | jspdf + html2canvas |
| **Maps** | @react-google-maps/api |
| **Charts** | Recharts |
| **PWA** | vite-plugin-pwa + custom service worker for push notifications |
| **Backend** | Lovable Cloud (Supabase under the hood) -- Edge Functions (Deno), PostgreSQL, Auth, Storage |

## 2. Repository

- **Platform**: Lovable (bidirectional GitHub sync)
- **Published URL**: https://buildunionca.lovable.app
- **Branch structure**: Lovable manages the main branch automatically. Feature development happens within Lovable's version system.

## 3. Database Tables (Active)

The project has **~30+ tables**. Key ones:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (full_name, avatar, username) |
| `bu_profiles` | Extended BuildUnion profiles (trade, experience, company, certifications, location) |
| `projects` | Core project records (name, address, type, status, user_id) |
| `project_summaries` | AI workflow config, detected areas, financial data |
| `project_members` | Team membership (project_id, user_id, role) |
| `project_tasks` | Task management with assignments |
| `project_documents` | Uploaded docs with AI analysis |
| `project_chat_messages` | In-project chat |
| `team_messages` | Direct messaging between users |
| `team_invitations` | Invitation system (email-based, with status) |
| `contracts` | Contract generation & digital signing |
| `contract_events` | Contract audit trail |
| `site_logs` | Daily site logs |
| `site_checkins` | GPS-based site check-ins |
| `material_deliveries` | Material delivery tracking |
| `pending_budget_changes` | Owner-approval workflow for budget modifications |
| `baseline_versions` | Version snapshots for project baselines |
| `blueprint_zones` | Blueprint annotation zones |
| `forum_posts` / `forum_replies` | Community forum |
| `notification_logs` | Push & in-app notifications |
| `user_roles` | RBAC (admin, moderator, user -- separate from profiles!) |
| `obc_chunks` / `obc_embeddings` / `obc_sections` | Ontario Building Code RAG system (pgvector) |
| `affiliate_products` / `affiliate_clicks` / `affiliate_revenue` | Affiliate revenue tracking |
| `ai_model_usage` | AI call analytics |
| `push_subscriptions` | Web push subscriptions |
| `user_draft_data` | Auto-saved drafts |
| `task_templates` / `user_templates` | Reusable templates |
| `trade_obc_mapping` | Trade-to-OBC section mapping |

### Auth Flow
- Email/password signup with **email verification required** (no auto-confirm)
- Password reset flow (forgot-password -> reset-password)
- `RequireEmailVerification` wrapper on protected routes
- `handle_new_user()` trigger creates profile on signup

### RLS & Security
- All tables have RLS enabled
- `SECURITY DEFINER` helper functions: `is_project_owner()`, `is_project_member()`, `has_role()`, `is_admin()`, `get_project_role()`, `can_manage_tasks()`, `can_upload_documents()`, `has_pending_invitation()`
- Role hierarchy: owner > foreman > worker/inspector/subcontractor/member
- `add_project_member_validated()` -- server-side validated member addition

### Edge Functions (~30+)
Key ones: `ask-messa` (general AI chat), `ask-messa-project` (project-context AI), `ai-project-analysis`, `ai-engine-report`, `generate-project-brief`, `quick-estimate`, `generate-invoice`, `generate-summary`, `generate-team-report`, `operational-truth` (Supabase Pro sync), `external-db` (dual-storage proxy), `obc-rag-query` / `obc-generate-embeddings` (OBC RAG), `send-*-email` (various email flows via Resend), `send-push-notification`, `contact-form`, `create-checkout` / `stripe-webhook` / `check-subscription` / `customer-portal` (Stripe), `delete-account`, `delete-project`, `get-weather`, `get-maps-key`, `geolocation-check`, `extract-pdf-text`

## 4. Current App Status -- Key Features

**Done/Live:**
- Landing page with hero video, features section, waitlist
- Full auth flow (register, login, email verify, password reset)
- Project creation wizard (8 stages: definition, blueprint upload, AI analysis, materials/labor, team setup, Gantt, command bar, final review)
- Project workspace/dashboard with project cards
- Material calculation engine ("3 Iron Laws" -- dynamic calc, state persistence, dual logic)
- AI-powered MESSA assistant (general + project-context)
- Team management (invite by email, role-based access)
- In-project chat + direct messaging
- Contract generation & digital signing (public share links)
- Site logs & GPS check-ins
- Material delivery tracking
- Budget modification approval workflow (pending changes -> owner review)
- Community: member directory, forum, public profiles
- OBC (Ontario Building Code) RAG system with pgvector embeddings
- Affiliate product recommendations
- Push notifications (VAPID/Web Push)
- PWA support (installable, offline-capable)
- Multi-language support (11 languages)
- Admin dashboard
- Weather widget integration
- Pricing page with Stripe checkout
- PDF generation (quotes, invoices, site logs)
- Dark/light theme
- Mobile-first responsive design with landscape mode support

**Remaining for launch:**
- Production hardening, final QA
- Stripe subscription enforcement on feature gates
- Marketing/SEO optimization

## 5. Stripe Integration

**Yes, fully integrated:**
- **Type**: Recurring subscriptions (Free/Pro/Enterprise tiers)
- **Flow**: `create-checkout` edge function -> Stripe Checkout -> `stripe-webhook` for event handling -> `check-subscription` for status verification -> `customer-portal` for management
- **Secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Trial usage tracking via `useTrialUsage` / `useDbTrialUsage` hooks
- `TrialLimitUpgradeModal` for upgrade prompts
- Tier-based feature gating via `useTierFeatures` hook

## 6. Required Secrets / API Keys

| Secret Name | Purpose |
|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `RESEND_API_KEY` | Email sending (Resend) |
| `GOOGLE_MAPS_API_KEY` | Google Maps & Places API |
| `OPENWEATHERMAP_API_KEY` | Weather data |
| `VAPID_PUBLIC_KEY` | Web Push (public) |
| `VAPID_PRIVATE_KEY` | Web Push (private) |
| `EXTERNAL_SUPABASE_URL` | Dual-storage Supabase Pro instance |
| `EXTERNAL_SUPABASE_SERVICE_KEY` | Dual-storage service key |
| `LOVABLE_API_KEY` | Lovable AI model access |
| `SUPABASE_URL` | Auto-configured |
| `SUPABASE_ANON_KEY` | Auto-configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-configured |
| `SUPABASE_PUBLISHABLE_KEY` | Auto-configured |
| `SUPABASE_DB_URL` | Auto-configured |

## Architecture Notes

- **Dual-Storage Strategy**: Lovable Cloud (operational) + External Supabase Pro ("operational truth" for finalized/locked data). Synced via `external-db` and `operational-truth` edge functions.
- **Owner Lock Protocol**: Finalized project data is password-locked by the owner before syncing to the external DB.
- **Citation System**: AI outputs include source citations (OBC references, material data sources).
- **SSOT**: ProjectContext serves as Single Source of Truth for active project data in the wizard flow.

Welcome aboard, Klod!

