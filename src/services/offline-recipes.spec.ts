import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteOfflineRecipe, getOfflineRecipes, saveOfflineRecipe } from './offline-recipes';

import type { Recipe } from '@/services/auth-api';

// Runtime validation coverage for offline recipe storage.
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-file-system/legacy', () => ({}));

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});

const recipe: Recipe = {
  id: 'recipe-1',
  title: 'Sopa de abóbora',
  description: 'Sopa simples',
  prepTimeMinutes: 30,
  servings: 4,
  difficulty: 'Fácil',
  ingredients: [{ name: 'Abóbora', quantity: '500 g' }],
  tags: ['Vegano'],
  steps: ['Cozinhe a abóbora.'],
  media: [{ id: 'media-1', type: 'image', mimeType: 'image/jpeg', fileSize: 1, url: '/image.jpg' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  author: 'Autora',
  authorId: 'user-1',
  comments: [],
  reviews: [],
  userReview: null,
  averageRating: null,
  ratingCount: 0,
};

afterEach(() => storage.clear());

describe('offline recipe storage', () => {
  it('keeps recipe data per user, omits media, and removes only the selected user copy', async () => {
    const saved = await saveOfflineRecipe('user-1', recipe);
    await saveOfflineRecipe('user-2', recipe);

    expect(saved.media).toEqual([]);
    expect(await getOfflineRecipes('user-1')).toEqual([{ ...recipe, media: [] }]);

    await deleteOfflineRecipe('user-1', recipe.id);

    expect(await getOfflineRecipes('user-1')).toEqual([]);
    expect(await getOfflineRecipes('user-2')).toEqual([{ ...recipe, media: [] }]);
  });
});
