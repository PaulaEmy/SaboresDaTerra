import type { RecipeSummary } from '@/services/auth-api';

export async function scheduleDailyRecipeSuggestion(_recipe: RecipeSummary) {
  throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
}

export async function cancelDailyRecipeSuggestions(): Promise<void> {
  throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
}

export async function hasDailyRecipeSuggestion(): Promise<boolean> {
  throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
}

export function addRecipeNotificationListener(_onRecipeSelected: (recipeId: string) => void): { remove(): void } {
  throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
}

export async function getLastRecipeNotification(): Promise<string | null> {
  throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
}
