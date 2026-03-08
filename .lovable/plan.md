

# Phase 3-5: Upsell Banner, Affiliate Card, DNA Motivation Banner

Three new UI components added to the Stage 8 Dashboard in `Stage8FinalReview.tsx`.

---

## Phase 3: Upsell Banner (under DNA Score)

**Location**: Inside the `messa-deep-audit` panel, directly after the DNA Integrity Score summary (line ~13170, after the score badge).

- Orange-gold gradient banner with prominent text: *"Upgrade to Premium ($49.99/mo) for unlimited projects + priority AI -- unlock full DNA score now!"*
- Only visible when user is NOT on Premium tier (use existing `useTierFeatures` hook -- check `tier !== 'premium'`)
- Orange-gold CTA button linking to `/buildunion/pricing`
- Subtle border glow, not blocking content

---

## Phase 4: Affiliate Card (under Grok in Column 4)

**Location**: Replace the placeholder "Affiliate Hub - Coming soon" div (lines 12923-12927) in Column 4 (Claude/Grok section).

- Card with Grok silver accent: *"Grok Insights: Cheaper Material Options"*
- Dynamic content using template data if available, fallback example: *"Douglas Fir $1,585 @ RONA -- Save $184"*
- Orange-gold accent on the savings badge
- Clickable external affiliate link (placeholder URL for now)
- Small Grok icon from `engineGrokImg`

---

## Phase 5: DNA Motivation Banner (under DNA Score, after upsell)

**Location**: Same `messa-deep-audit` panel, after the upsell banner (or after DNA score if user is Premium).

- Green-themed motivational banner
- Dynamic text based on `passCount` and `totalPillars`: e.g., *"DNA {passCount}/{totalPillars} -- upload 1 photo/doc and reach {passCount+1}/{totalPillars}! This could save $5k+ fines"*
- Only shown when `passCount < totalPillars`
- Green upload button that triggers the document panel (`setActiveOrbitalPanel('documents')` or similar)
- Warning tone with dollar-saving emphasis

---

## Technical Details

**File modified**: `src/components/project-wizard/Stage8FinalReview.tsx`

**No database changes needed** -- purely UI additions using existing data (tier, DNA pillar counts, citations).

**Approach**:
1. Add upsell banner JSX after line ~13170 (DNA score summary closing div), conditionally rendered based on tier
2. Replace affiliate placeholder (lines 12924-12927) with functional Grok Insights card
3. Add motivation banner after upsell banner, conditionally rendered when `passCount < totalPillars`

