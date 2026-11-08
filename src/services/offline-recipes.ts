import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import type { Recipe } from '@/services/auth-api';

type OfflineRecipeEntry = { ownerId: string; recipe: Recipe };

const STORAGE_KEY = 'sabores-da-terra-offline-recipes';
let updateQueue: Promise<void> = Promise.resolve();

function getFileUri() {
  if (!FileSystem.documentDirectory) throw new Error('O armazenamento local não está disponível.');
  return `${FileSystem.documentDirectory}${STORAGE_KEY}.json`;
}

async function readEntriesFromStorage(): Promise<OfflineRecipeEntry[]> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') throw new Error('O armazenamento local não está disponível.');
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseEntries(stored) : [];
  }

  const uri = getFileUri();
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? parseEntries(await FileSystem.readAsStringAsync(uri)) : [];
}

function parseEntries(value: string): OfflineRecipeEntry[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((entry) =>
      !entry || typeof entry.ownerId !== 'string' || !entry.recipe ||
      typeof entry.recipe.id !== 'string' || typeof entry.recipe.title !== 'string' ||
      !Array.isArray(entry.recipe.ingredients) || !Array.isArray(entry.recipe.steps) ||
      !Array.isArray(entry.recipe.reviews) || !Array.isArray(entry.recipe.comments))) {
      throw new Error('Formato inválido.');
    }
    return parsed as OfflineRecipeEntry[];
  } catch (error) {
    throw new Error('Não foi possível ler as receitas salvas offline.', { cause: error });
  }
}

async function writeEntries(entries: OfflineRecipeEntry[]) {
  const serialized = JSON.stringify(entries);
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') throw new Error('O armazenamento local não está disponível.');
    localStorage.setItem(STORAGE_KEY, serialized);
    return;
  }
  await FileSystem.writeAsStringAsync(getFileUri(), serialized);
}

async function updateEntries(update: (entries: OfflineRecipeEntry[]) => OfflineRecipeEntry[]) {
  const operation = updateQueue.then(async () => {
    const entries = await readEntriesFromStorage();
    const updatedEntries = update(entries);
    await writeEntries(updatedEntries);
    return updatedEntries;
  });
  updateQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function getOfflineRecipes(ownerId: string): Promise<Recipe[]> {
  await updateQueue;
  return (await readEntriesFromStorage())
    .filter((entry) => entry.ownerId === ownerId)
    .map((entry) => entry.recipe);
}

export async function getOfflineRecipe(recipeId: string, ownerId: string): Promise<Recipe | null> {
  const recipes = await getOfflineRecipes(ownerId);
  return recipes.find((recipe) => recipe.id === recipeId) ?? null;
}

export async function saveOfflineRecipe(ownerId: string, recipe: Recipe) {
  const offlineRecipe = { ...recipe, media: [] };
  delete offlineRecipe.offlineCopy;
  await updateEntries((entries) => [
    ...entries.filter((entry) => entry.ownerId !== ownerId || entry.recipe.id !== recipe.id),
    { ownerId, recipe: offlineRecipe },
  ]);
  return offlineRecipe;
}

export async function deleteOfflineRecipe(ownerId: string, recipeId: string) {
  await updateEntries((entries) =>
    entries.filter((entry) => entry.ownerId !== ownerId || entry.recipe.id !== recipeId));
}
