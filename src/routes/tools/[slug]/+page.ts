import { getToolBySlug, tools } from '$lib/tools';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
  return tools.map((tool) => ({
    slug: tool.slug
  }));
};

export const load: PageLoad = async ({ params }) => {
  const tool = getToolBySlug(params.slug);

  if (!tool) {
    throw error(404, `Tool not found: ${params.slug}`);
  }

  return {
    tool
  };
};
