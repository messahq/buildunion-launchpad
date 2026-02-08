/**
 * Project Persistence & State-Guard System
 * 
 * Ensures project data NEVER gets lost:
 * 1. Immediate DB persistence (active, not draft)
 * 2. localStorage as backup (failsafe sync)
 * 3. No delete/reset allowed without data verification
 * 4. Console logging on errors, not silent failures
 */

import { Citation } from '@/types/citation';

const STORAGE_KEY_PREFIX = 'project_persistence_';
const ACTIVE_PROJECT_KEY = 'active_project_id';

interface ProjectPersistenceState {
  projectId: string;
  userId: string;
  currentStage: number;
  citations: Citation[];
  gfaValue: number;
  timestamp: number;
}

/**
 * Save project state to localStorage (offline backup)
 */
export const saveProjectToLocalStorage = (state: ProjectPersistenceState) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.projectId}`;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(ACTIVE_PROJECT_KEY, state.projectId);
    console.log('[Persistence] Project saved to localStorage:', state.projectId);
  } catch (error) {
    console.error('[Persistence] localStorage write failed:', error);
    // Non-fatal - DB is the source of truth
  }
};

/**
 * Restore project state from localStorage
 */
export const restoreProjectFromLocalStorage = (projectId: string): ProjectPersistenceState | null => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const state = JSON.parse(stored) as ProjectPersistenceState;
      console.log('[Persistence] Project restored from localStorage:', projectId);
      return state;
    }
  } catch (error) {
    console.error('[Persistence] localStorage read failed:', error);
  }
  return null;
};

/**
 * Get the active project ID from localStorage
 */
export const getActiveProjectIdFromStorage = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch (error) {
    console.error('[Persistence] Failed to get active project ID:', error);
    return null;
  }
};

/**
 * Update localStorage when citations change (real-time sync)
 */
export const syncCitationsToLocalStorage = (projectId: string, citations: Citation[], currentStage: number, gfaValue: number) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const state = JSON.parse(stored) as ProjectPersistenceState;
      state.citations = citations;
      state.currentStage = currentStage;
      state.gfaValue = gfaValue;
      state.timestamp = Date.now();
      localStorage.setItem(key, JSON.stringify(state));
      console.log('[Persistence] Citations synced to localStorage');
    }
  } catch (error) {
    console.error('[Persistence] Failed to sync citations:', error);
  }
};

/**
 * Verify project integrity before allowing delete/reset
 * Returns false if data exists - prevents accidental loss
 */
export const canDeleteProject = (citations: Citation[], currentStage: number): boolean => {
  if (citations.length > 0 || currentStage > 0) {
    console.warn('[StateGuard] Delete blocked - project has data:', {
      citationCount: citations.length,
      stage: currentStage,
    });
    return false;
  }
  return true;
};

/**
 * Log critical errors without deleting data
 */
export const logCriticalError = (context: string, error: any, additionalData?: any) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    additionalData,
  };
  
  console.error('[CriticalError]', errorLog);
  
  // Store error log for debugging (non-blocking)
  try {
    const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]') as typeof errorLog[];
    errorLogs.push(errorLog);
    localStorage.setItem('error_logs', JSON.stringify(errorLogs.slice(-10))); // Keep last 10
  } catch (e) {
    console.error('[Persistence] Failed to store error log:', e);
  }
};

/**
 * Clear project from localStorage (only after successful DB deletion)
 */
export const clearProjectFromLocalStorage = (projectId: string) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.removeItem(key);
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === projectId) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
    console.log('[Persistence] Project cleared from localStorage:', projectId);
  } catch (error) {
    console.error('[Persistence] Failed to clear project:', error);
  }
};
