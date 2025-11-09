# Codebase Cleanup Plan
**Date:** November 9, 2025  
**Status:** PENDING APPROVAL

## Overview
This plan outlines the removal of deprecated code, unused files, and redundant components without affecting functionality.

---

## 🔴 CRITICAL REMOVALS (High Impact)

### 1. Old React Frontend (`/app/frontend/`)
**Action:** DELETE entire directory  
**Size:** ~580 MB (with node_modules)  
**Reason:** Fully replaced by Next.js frontend (`/app/frontend-nextjs/`)  
**Risk:** LOW - No references found in Next.js codebase

**What will be removed:**
```
/app/frontend/
├── node_modules/          (580MB)
├── src/                   (old React components)
├── public/
├── package.json
├── yarn.lock
└── All configuration files
```

**Verification before deletion:**
- ✅ No imports from `/app/frontend` in Next.js app
- ✅ Server only serves `/app/frontend-nextjs`
- ✅ All functionality migrated to Next.js

---

## 🟡 BACKEND CLEANUP (Moderate Impact)

### 2. Deprecated Simulation Components

#### A. `simulation_tracker.py`
**Action:** KEEP (Currently in use)  
**Reason:** Used by server.py for:
- `create_simulation_session()`
- `update_simulation_session()`
- `get_simulation_session()`
- `stop_simulation()`
- `list_simulation_sessions()`

**Note:** This is legacy session tracking. Could be migrated to thread_status.py in future, but keep for now.

#### B. `generation_jobs.py`
**Action:** KEEP (Active)  
**Reason:** Used for async job tracking (persona/goal generation)
- `create_job()`, `get_job()`, `update_job()`, `cleanup_old_jobs()`

---

### 3. Test Files & Sprint Documentation

#### A. `/app/backend/testbed/tests/`
**Action:** REVIEW & POTENTIALLY KEEP  
**Size:** 20 test files  
**Reason:** Test files are valuable for CI/CD  
**Decision:** Keep for now, can be removed if not using automated testing

#### B. `/app/backend/testbed/sprints/`
**Action:** ARCHIVE or KEEP  
**Size:** ~10 sprint markdown files  
**Reason:** Documentation/historical context  
**Recommendation:** Keep in codebase as they're lightweight (<1MB total)

---

## 🟢 FRONTEND CLEANUP (Low Impact)

### 4. Unused Next.js Components

**Location:** `/app/frontend-nextjs/components/simulations/`

#### Files to DELETE:
1. **`ChatOnlyThread.tsx`** (83 lines)
   - Replaced by LangGraph SDK integration
   - No imports found in codebase

2. **`SimpleMessageView.tsx`** (147 lines)
   - Replaced by MessageRenderer.tsx
   - No imports found in codebase

3. **`SimpleThreadMessages.tsx`** (213 lines)
   - Replaced by direct SDK usage in simulation/[thread_id]/page.tsx
   - No imports found in codebase

4. **`ThreadMessagesOnly.tsx`** (149 lines)
   - Replaced by MessageRenderer.tsx + LangGraph SDK
   - No imports found in codebase

**Current Active Components:**
- ✅ `EvaluateTab.tsx` (used)
- ✅ `MessageRenderer.tsx` (used)

---

## 🔵 TESTBED INTERNAL CLEANUP

### 5. Potentially Unused Modules (Needs Investigation)

**Action:** INVESTIGATE before removal

#### Check these directories:
```
/app/backend/testbed/src/cli/          - CLI commands (may not be used via web)
/app/backend/testbed/src/tracing/      - Observability (check if active)
```

**Method:**
- Search for imports in server.py and active modules
- Test functionality after removal in dev environment

---

## 📊 ESTIMATED IMPACT

### Disk Space Savings:
- Old frontend: ~580 MB
- Unused components: ~2 KB
- **Total: ~580 MB**

### Code Cleanup:
- Remove: ~600 lines of unused frontend code
- Remove: ~15,000+ lines of old React code
- Simplified maintenance

### Risk Assessment:
- **High confidence:** frontend/ removal (fully replaced)
- **Medium confidence:** Unused Next.js components (verified no imports)
- **Low confidence:** Test files (may want to keep for future)

---

## 🔧 EXECUTION PLAN

### Phase 1: Preparation (Pre-execution)
1. ✅ Create git commit: "Pre-cleanup checkpoint"
2. ✅ Verify backup on GitHub
3. ✅ Document current working state
4. ✅ Take supervisor service snapshot

### Phase 2: Safe Removals (Low Risk)
1. Delete unused Next.js components:
   ```bash
   rm /app/frontend-nextjs/components/simulations/ChatOnlyThread.tsx
   rm /app/frontend-nextjs/components/simulations/SimpleMessageView.tsx
   rm /app/frontend-nextjs/components/simulations/SimpleThreadMessages.tsx
   rm /app/frontend-nextjs/components/simulations/ThreadMessagesOnly.tsx
   ```

2. Verify frontend still works (run tests)

### Phase 3: Major Removals (High Impact)
1. Remove old React frontend:
   ```bash
   rm -rf /app/frontend/
   ```

2. Update supervisord config if needed
3. Restart services and verify

### Phase 4: Verification
1. Test all critical paths:
   - Persona generation
   - Goal generation
   - Simulation execution
   - Evaluation
2. Check API endpoints
3. Verify UI functionality

### Phase 5: Cleanup
1. Remove empty directories
2. Update .gitignore if needed
3. Commit changes: "Cleanup: Remove deprecated code"

---

## ⚠️ ROLLBACK PLAN

If anything breaks:
1. User has code on GitHub (can rollback)
2. Git reset to pre-cleanup commit
3. Restore from checkpoint

---

## 📋 CHECKLIST FOR APPROVAL

### Before Execution:
- [ ] Confirm GitHub push completed successfully
- [ ] Verify all functionality working in current state
- [ ] User approval received

### After Execution:
- [ ] All tests passing
- [ ] No broken imports/references
- [ ] Services restart successfully
- [ ] UI loads and functions correctly
- [ ] API endpoints responsive

---

## 🎯 RECOMMENDED APPROACH

**Option A: Conservative (Recommended)**
1. Phase 2 only: Remove unused Next.js components
2. Test thoroughly
3. If successful, proceed to Phase 3 (remove old frontend)

**Option B: Aggressive**
1. Execute all phases in sequence
2. Higher risk but cleaner result

**Option C: Minimal**
1. Only remove old frontend (`/app/frontend/`)
2. Keep everything else for now

---

## 📝 NOTES

### Items NOT Removed (Keep):
- `simulation_tracker.py` - Still in use
- `generation_jobs.py` - Active job tracking
- `thread_status.py` - Active status tracking
- `testbed_bridge.py` - Main integration layer
- All active simulation/generation modules
- Test files (valuable for future CI/CD)
- Sprint documentation (historical context)

### Items to Remove:
- Old React frontend (confirmed deprecated)
- 4 unused Next.js components (verified no imports)

---

## ⏭️ NEXT STEPS

**Awaiting User Approval:**
- [ ] Approve full plan
- [ ] Approve Option A/B/C
- [ ] Request modifications

Once approved, execute phases in order with verification at each step.
