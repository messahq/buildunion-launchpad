/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         DATA LOCK SYSTEM                                  ║
 * ║                                                                           ║
 * ║   Protects saved financial data from background modifications.            ║
 * ║   Implements State Locking, Permission Control, and Impact Warnings.      ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║   RULES:                                                                  ║
 * ║   1. Saved data is READ-ONLY for background processes                     ║
 * ║   2. Only Owner/Foreman can edit via UI                                   ║
 * ║   3. System changes trigger impact warnings                               ║
 * ║   4. No default values overwrite saved data                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useCallback, useState, useRef } from 'react';

export type DataLockStatus = 'locked' | 'unlocked' | 'pending';

export interface DataLockConfig {
  dataSource: 'saved' | 'ai' | 'tasks';
  userRole?: string;
  isOwner?: boolean;
}

export interface DataLockResult {
  /** Whether data is currently locked (saved state) */
  isLocked: boolean;
  
  /** Whether current user can edit locked data */
  canEdit: boolean;
  
  /** Check if a specific operation should be blocked */
  shouldBlockOperation: (operationType: 'background_sync' | 'ai_inference' | 'default_override' | 'user_edit') => boolean;
  
  /** Request unlock for user edit - returns true if allowed */
  requestUnlock: () => boolean;
  
  /** Check if system change needs impact warning */
  needsImpactWarning: (changeType: 'tax_change' | 'area_change' | 'rate_change' | 'bulk_update' | 'sync_operation') => boolean;
  
  /** Log blocked operation for debugging */
  logBlockedOperation: (operation: string, reason: string) => void;
}

export function useDataLock(config: DataLockConfig): DataLockResult {
  const { dataSource, userRole, isOwner = false } = config;
  const blockedOpsRef = useRef<Array<{ operation: string; reason: string; timestamp: Date }>>([]);
  
  // Data is locked when it comes from saved source
  const isLocked = dataSource === 'saved';
  
  // Permission check - only Owner and Foreman can edit
  const canEdit = isOwner || userRole === 'owner' || userRole === 'foreman';
  
  const shouldBlockOperation = useCallback((operationType: 'background_sync' | 'ai_inference' | 'default_override' | 'user_edit'): boolean => {
    // If data is not locked, allow all operations
    if (!isLocked) return false;
    
    // User edits are only blocked if user doesn't have permission
    if (operationType === 'user_edit') {
      return !canEdit;
    }
    
    // ALL background operations are BLOCKED for locked data
    // This is the core of the Data Lock system
    console.log(`[DATA LOCK] 🔒 BLOCKED: ${operationType} - Data is in SAVED state`);
    return true;
  }, [isLocked, canEdit]);
  
  const requestUnlock = useCallback((): boolean => {
    if (!isLocked) return true;
    if (!canEdit) {
      console.log('[DATA LOCK] ❌ Unlock denied - User lacks permission (requires Owner or Foreman role)');
      return false;
    }
    console.log('[DATA LOCK] ✓ Unlock granted for manual edit');
    return true;
  }, [isLocked, canEdit]);
  
  const needsImpactWarning = useCallback((changeType: 'tax_change' | 'area_change' | 'rate_change' | 'bulk_update' | 'sync_operation'): boolean => {
    // Only need warning if data is locked AND the change would affect it
    if (!isLocked) return false;
    
    // All these change types can affect locked financial data
    const impactfulChanges = ['tax_change', 'area_change', 'rate_change', 'bulk_update', 'sync_operation'];
    return impactfulChanges.includes(changeType);
  }, [isLocked]);
  
  const logBlockedOperation = useCallback((operation: string, reason: string) => {
    const entry = { operation, reason, timestamp: new Date() };
    blockedOpsRef.current.push(entry);
    
    // Keep only last 50 entries
    if (blockedOpsRef.current.length > 50) {
      blockedOpsRef.current = blockedOpsRef.current.slice(-50);
    }
    
    console.warn(`[DATA LOCK] 🚫 Operation blocked:`, entry);
  }, []);
  
  return {
    isLocked,
    canEdit,
    shouldBlockOperation,
    requestUnlock,
    needsImpactWarning,
    logBlockedOperation,
  };
}

/**
 * Strict normalizer that NEVER overwrites saved values with defaults
 * Use this when loading data from database
 */
export function strictNormalizeItem<T extends Record<string, unknown>>(
  item: T,
  isFromSavedSource: boolean
): T {
  if (!isFromSavedSource) {
    return item;
  }
  
  // For saved data: return EXACTLY what was saved
  // Do NOT apply any defaults, inferences, or calculations
  console.log('[DATA LOCK] strictNormalizeItem: Preserving saved values as-is');
  return item;
}

/**
 * Guard function to wrap any operation that might modify saved data
 */
export function guardSavedDataOperation<T>(
  operation: () => T,
  dataSource: 'saved' | 'ai' | 'tasks',
  operationName: string
): T | null {
  if (dataSource === 'saved') {
    console.log(`[DATA LOCK] 🔒 Skipping ${operationName} - Data is LOCKED (saved state)`);
    return null;
  }
  return operation();
}
