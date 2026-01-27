// AI Cache Utilities - Smart caching to reduce API calls
// Implements hash-based cache invalidation to prevent stale results

import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface CacheEntry {
  hash: string;
  result: Json;
  createdAt: string;
  model: string;
  tier: string;
}

interface AICache {
  entries: CacheEntry[];
  lastCleared: string;
}

// Generate a deterministic hash for cache key
export function generateCacheHash(
  imageUrl: string | null,
  description: string,
  tier: string,
  additionalContext?: string
): string {
  const input = [
    imageUrl?.substring(0, 100) || 'no-image',
    description.toLowerCase().trim().substring(0, 200),
    tier,
    additionalContext || ''
  ].join('|');
  
  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
  }
  return `cache_${Math.abs(hash).toString(36)}`;
}

// Check if cache entry is valid (not expired, not stale)
function isCacheValid(entry: CacheEntry, maxAgeHours = 24): boolean {
  const createdAt = new Date(entry.createdAt);
  const now = new Date();
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return ageHours < maxAgeHours;
}

// Get cached AI result if available
export async function getCachedAIResult(
  projectId: string,
  cacheHash: string
): Promise<Json | null> {
  try {
    const { data: summary } = await supabase
      .from('project_summaries')
      .select('verified_facts')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (!summary?.verified_facts) return null;
    
    const facts = summary.verified_facts as { ai_cache?: AICache };
    const aiCache = facts.ai_cache;
    
    if (!aiCache?.entries) return null;
    
    const entry = aiCache.entries.find(e => e.hash === cacheHash);
    if (!entry) return null;
    
    if (!isCacheValid(entry)) {
      console.log('[AI Cache] Entry expired:', cacheHash);
      return null;
    }
    
    console.log('[AI Cache] HIT:', cacheHash);
    return entry.result;
  } catch (error) {
    console.error('[AI Cache] Error reading cache:', error);
    return null;
  }
}

// Store AI result in cache
export async function setCachedAIResult(
  projectId: string,
  cacheHash: string,
  result: Json,
  model: string,
  tier: string
): Promise<void> {
  try {
    const { data: summary } = await supabase
      .from('project_summaries')
      .select('verified_facts')
      .eq('project_id', projectId)
      .maybeSingle();
    
    const facts = (summary?.verified_facts || {}) as { ai_cache?: AICache };
    const aiCache: AICache = facts.ai_cache || { entries: [], lastCleared: new Date().toISOString() };
    
    // Remove old entry with same hash if exists
    aiCache.entries = aiCache.entries.filter(e => e.hash !== cacheHash);
    
    // Add new entry (keep max 5 entries per project)
    aiCache.entries = [
      { hash: cacheHash, result, createdAt: new Date().toISOString(), model, tier },
      ...aiCache.entries.slice(0, 4)
    ];
    
    // Update in database
    await supabase
      .from('project_summaries')
      .update({
        verified_facts: { ...facts, ai_cache: aiCache } as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId);
    
    console.log('[AI Cache] SET:', cacheHash);
  } catch (error) {
    console.error('[AI Cache] Error writing cache:', error);
  }
}

// Invalidate cache when data changes
export async function invalidateAICache(projectId: string): Promise<void> {
  try {
    const { data: summary } = await supabase
      .from('project_summaries')
      .select('verified_facts')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (!summary?.verified_facts) return;
    
    const facts = summary.verified_facts as { ai_cache?: AICache };
    const clearedCache: AICache = { entries: [], lastCleared: new Date().toISOString() };
    
    await supabase
      .from('project_summaries')
      .update({
        verified_facts: { ...facts, ai_cache: clearedCache } as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId);
    
    console.log('[AI Cache] INVALIDATED for project:', projectId);
  } catch (error) {
    console.error('[AI Cache] Error invalidating cache:', error);
  }
}

// Hook to invalidate cache on data changes
export function useAICacheInvalidation(projectId: string | null) {
  const invalidate = async () => {
    if (projectId) {
      await invalidateAICache(projectId);
    }
  };
  
  return { invalidateCache: invalidate };
}
