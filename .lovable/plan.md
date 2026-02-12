
## Plan: Apply Amber Outline Styling to Stage 8 Left Sidebar Panels

### Understanding the Request
The user wants to apply the same elegant outline styling (border-only, no fill) that was applied to the wizard chat bubbles to the left sidebar panels in Stage 8 (Panels 1-4: Basics, Area, Trade, Team).

### Current State
- Left sidebar panels in Stage 8 have gradient backgrounds with colored borders
- Example: `bg-gradient-to-br from-cyan-50/50 via-blue-50 to-indigo-50` with `border-cyan-300`
- Chat bubbles now use: `border-2 border-amber-400 dark:border-amber-500 bg-card` (outline only)

### Target Style Changes

**For all left-column panels (Panel 1-4):**
1. **Border**: Change to `border-2 border-amber-400 dark:border-amber-500` (consistent with chat bubbles)
2. **Background**: Change to `bg-card` (transparent/neutral background instead of gradient fills)
3. **Hover State**: Add subtle hover effect like `hover:bg-amber-50/20 dark:hover:bg-amber-950/10`
4. **Overall**: Maintain the elegant, minimal aesthetic that keeps focus on the content

### Affected Code Sections
- **Line ~8850-9000**: Left panel button styling in the grid layout
- **Line ~8790-8810**: Visual elements and styling within each panel card
- Remove colored gradient backgrounds from all left-side panel containers
- Ensure dark mode text remains readable with the new outline style

### Implementation Strategy
1. Locate the `motion.button` elements for left-column panels (around line 8850)
2. Change background from colored gradients to `bg-card` 
3. Update borders to amber-400/amber-500 (2px width)
4. Add smooth hover transitions
5. Ensure proper contrast and readability in both light and dark modes
6. Keep the data count badges, icons, and summary text styling intact

### Why This Works
- Creates visual consistency with the chat interface
- Reduces visual weight by removing gradient fills
- Maintains professional, elegant appearance
- Improves focus on actual content/data within each panel
- Matches the memory preference for amber outline styling

