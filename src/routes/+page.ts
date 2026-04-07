import { stats } from '$lib/tools';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
  return {
    title: `Voidkit — ${stats.tools} Tools, ${stats.categories} Categories`,
    description: `Minimal developer utilities, organized and extensible by design. ${stats.tools} tools across ${stats.categories} categories for developers.`
  };
};
