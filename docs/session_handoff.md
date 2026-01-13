# Session Handoff Document

## 1. Current Session Summary
- **Date:** 2026-01-14 / Deployment Failure Debugging & Security Strengthening
- **Focus:** Resolving GitHub Pages deployment timeout and strengthening security (env & ignore policy).
- **Wait:** **N/A** (All changes pushed to main, deployment confirmed successful)

## 2. Key Changes & Achievements
- **[DevOps] Deployment Failure Resolution (Issue-030):**
  - **The Root Cause:** Identified that non-ASCII (Korean) filenames in `.agent/workflows/` were causing Jekyll engine timeouts during deployment.
  - **Policy Update:** Added `.nojekyll` to root to bypass the Jekyll build process.
  - **Exclusion Policy:** Excluded `.agent/workflows/` from Git tracking via `.gitignore` to keep local convenience (Korean commands) while preventing deployment interference.
- **[Security] Credential Protection:**
  - Removed accidental tracking of `.env` files and strictly added them to `.gitignore`.
  - Deleted unused external service (Supabase, OneSignal) credentials and legacy code.
- **[Guideline] Deployment Policy:** Updated `GEMINI.md` with a new "Deployment Stability & Security" section to prevent future regressions.

## 3. Unresolved Issues & Technical Debts
- None. Deployment is now extremely stable (completes in ~1 min).

## 4. Next Steps (Prioritized)
1. **[Migration] Issue-029 Execution:** Resume porting V2 stability patches into the V3 branch.
2. **[Security] Token Revocation:** Advise user to rotate leaked Supabase/OneSignal keys for absolute safety.

---
*Historical Session Summaries:*

## Session Handoff (2026-01-14 / UI Rendering Stability)
- Focus: Fixing UI rendering bugs and deploying v2.17.5.
- Achievements: Fixed malformed HTML tags, enabled `innerHTML` for modals, removed unused variables.

## Session Handoff (2026-01-11)
- Focus: PiP precision & UI Rendering Stability (v2.17.4)
- achievements: DOM-based PIP resizing, fixed timetable HTML tags, Zen Calculator Date preservation.

---
## Session Handoff (2026-01-10)
- Focus: Scheduler Deduplication, Reverse Migration & Sync Optimization.
- achievements: Fixed phantom bosses, implemented intelligent data re-integration, restored GEMINI.md core docs list.

---
## Session Handoff (2026-01-09)
- Focus: Self-Healing System, SSOT Purification & Timetable Bug Fixes.
- achievements: Silent migration, Data diet (today 00:00 filter), Subset matching check.
