import { describe, expect, it } from 'vitest';
import { refinementGroupsFor, refinementPayload } from './refinements';

describe('refinements', () => {
  it('shows groups for chosen tastes or category, always with Vibe last', () => {
    expect(refinementGroupsFor({ tastes: ['taste_nightlife'] }).map((g) => g.key)).toEqual(['nightlife', 'vibe']);
    expect(refinementGroupsFor({ tastes: ['taste_food', 'taste_art'] }).map((g) => g.key)).toEqual(['food', 'culture', 'vibe']);
    expect(refinementGroupsFor({ category: 'restaurant' }).map((g) => g.key)).toEqual(['food', 'vibe']);
    expect(refinementGroupsFor({ category: 'bar' }).map((g) => g.key)).toEqual(['nightlife', 'vibe']);
    expect(refinementGroupsFor({ category: 'kids' }).map((g) => g.key)).toEqual(['vibe']);
  });

  it('builds the payload from labels and free text', () => {
    expect(refinementPayload(['ref_cocktail_bar'], ' con terraza ', (k) => `L:${k}`)).toEqual(['L:ref_cocktail_bar', 'con terraza']);
    expect(refinementPayload([], '', (k) => k)).toEqual([]);
  });
});
