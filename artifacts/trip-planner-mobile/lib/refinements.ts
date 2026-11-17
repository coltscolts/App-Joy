import type { TranslationKey } from '@/lib/i18n';

/**
 * Filtros para «afinar» las ideas de IA desde los resultados: cada grupo se
 * muestra si la persona eligió uno de sus gustos (Ayúdame con ideas) o si la
 * categoría coincide (AI Ideas del formulario). «Ambiente» siempre aparece.
 */
export type RefinementGroup = {
  key: 'nightlife' | 'food' | 'culture' | 'shopping' | 'nature' | 'vibe';
  title: TranslationKey;
  tastes: string[];
  categories: string[];
  options: TranslationKey[];
};

export const REFINEMENT_GROUPS: RefinementGroup[] = [
  {
    key: 'nightlife',
    title: 'refine_group_nightlife',
    tastes: ['taste_nightlife'],
    categories: ['bar', 'nightlife'],
    options: ['ref_cocktail_bar', 'ref_speakeasy', 'ref_classic_bar', 'ref_sports_bar', 'ref_club', 'ref_rooftop', 'ref_mezcal_bar', 'ref_wine_bar', 'ref_craft_beer', 'ref_live_music', 'ref_karaoke', 'ref_lgbt'],
  },
  {
    key: 'food',
    title: 'refine_group_food',
    tastes: ['taste_food', 'taste_local'],
    categories: ['restaurant'],
    options: ['ref_local_food', 'ref_street_food', 'ref_fine_dining', 'ref_seafood', 'ref_steakhouse', 'ref_italian', 'ref_asian', 'ref_vegetarian', 'ref_brunch', 'ref_cafe', 'ref_dessert', 'ref_food_market', 'ref_with_view'],
  },
  {
    key: 'culture',
    title: 'refine_group_culture',
    tastes: ['taste_culture', 'taste_art', 'taste_history'],
    categories: ['cultural', 'tour'],
    options: ['ref_art_museum', 'ref_contemporary_art', 'ref_history_museum', 'ref_archaeology', 'ref_science_museum', 'ref_galleries', 'ref_architecture', 'ref_shows', 'ref_free_entry', 'ref_guided_tour'],
  },
  {
    key: 'shopping',
    title: 'refine_group_shopping',
    tastes: ['taste_shopping'],
    categories: [],
    options: ['ref_markets', 'ref_local_design', 'ref_vintage', 'ref_malls', 'ref_luxury', 'ref_crafts'],
  },
  {
    key: 'nature',
    title: 'refine_group_nature',
    tastes: ['taste_nature', 'taste_adventure', 'taste_beach', 'taste_photo'],
    categories: [],
    options: ['ref_parks', 'ref_viewpoints', 'ref_gardens', 'ref_day_trip', 'ref_water'],
  },
  {
    key: 'vibe',
    title: 'refine_group_vibe',
    tastes: [],
    categories: [],
    options: ['ref_trendy', 'ref_hidden_gems', 'ref_romantic', 'ref_groups', 'ref_quiet', 'ref_outdoor'],
  },
];

/** Grupos visibles para unos gustos y/o una categoría; «Ambiente» siempre al final. */
export function refinementGroupsFor({ tastes = [], category }: { tastes?: readonly string[]; category?: string | null }): RefinementGroup[] {
  return REFINEMENT_GROUPS.filter((group) =>
    group.key === 'vibe'
    || group.tastes.some((taste) => tastes.includes(taste))
    || (category ? group.categories.includes(category) : false));
}

/** Filtros para enviar a la IA: etiquetas elegidas + texto libre. */
export function refinementPayload(selected: readonly TranslationKey[], extra: string, translate: (key: TranslationKey) => string): string[] {
  const list = selected.map(translate);
  const text = extra.trim();
  if (text) list.push(text.slice(0, 60));
  return list;
}
