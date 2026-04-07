/**
 * Utilities for tracking and retrieving recently visited tools.
 * Stores up to 5 recent tools (by slug) in localStorage.
 */
import { browser } from '$app/environment';

const RECENT_TOOLS_KEY = 'voidkit_recent_tools';
const MAX_RECENT = 5;

export interface RecentTool {
  slug: string;
  timestamp: number;
}

/**
 * Add a tool to recent history.
 * Automatically removes duplicates and enforces max limit.
 */
export function addRecentTool(slug: string): void {
  if (!browser) return;

  try {
    const stored = localStorage.getItem(RECENT_TOOLS_KEY);
    let recent: RecentTool[] = stored ? JSON.parse(stored) : [];

    // Remove if already exists (will be added at front)
    recent = recent.filter((t) => t.slug !== slug);

    // Add new entry at front
    recent.unshift({ slug, timestamp: Date.now() });

    // Enforce max limit
    recent = recent.slice(0, MAX_RECENT);

    localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(recent));
  } catch (err) {
    console.warn('Failed to update recent tools:', err);
  }
}

/**
 * Get list of recently visited tools (ordered newest first).
 */
export function getRecentTools(): RecentTool[] {
  if (!browser) return [];

  try {
    const stored = localStorage.getItem(RECENT_TOOLS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.warn('Failed to read recent tools:', err);
    return [];
  }
}

/**
 * Clear all recent tool history.
 */
export function clearRecentTools(): void {
  if (!browser) return;

  try {
    localStorage.removeItem(RECENT_TOOLS_KEY);
  } catch (err) {
    console.warn('Failed to clear recent tools:', err);
  }
}
