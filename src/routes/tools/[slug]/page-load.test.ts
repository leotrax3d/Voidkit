import { describe, expect, it } from 'vitest';
import { entries, load } from './+page';
import { tools } from '$lib/tools';

describe('tools/[slug] page load', () => {
  it('generates entries for all tool slugs', async () => {
    const generated = await entries();
    expect(generated).toHaveLength(tools.length);
    expect(generated[0]).toHaveProperty('slug');
  });

  it('loads a valid slug', async () => {
    const slug = tools[0].slug;
    const result = (await load({ params: { slug } } as never)) as { tool: { slug: string } };
    expect(result.tool.slug).toBe(slug);
  });

  it('throws a 404 for invalid slug', async () => {
    await expect(load({ params: { slug: 'does-not-exist' } } as never)).rejects.toMatchObject({ status: 404 });
  });
});
