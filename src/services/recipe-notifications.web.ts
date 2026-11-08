import type { RecipeSummary } from '@/services/auth-api';

export async function scheduleDailyRecipeSuggestion(_recipe: RecipeSummary) {
  throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
}

export async function cancelDailyRecipeSuggestions() {}

export async function hasDailyRecipeSuggestion() {
  return false;
}

export function addRecipeNotificationListener(_onRecipeSelected: (recipeId: string) => void) {
  return { remove() {} };
}

export async function getLastRecipeNotification() {
  return null;
}
