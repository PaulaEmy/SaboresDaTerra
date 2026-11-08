import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { RecipeSummary } from '@/services/auth-api';

const NOTIFICATION_KIND = 'daily-recipe-suggestion';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleDailyRecipeSuggestion(recipe: RecipeSummary) {
  if (Platform.OS === 'web') throw new Error('Notificações diárias estão disponíveis no aplicativo Android ou iOS.');
  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.granted ? currentPermission : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Permita notificações nas configurações do dispositivo para ativar as sugestões.');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recipe-suggestions', {
      name: 'Sugestões de receitas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content.data?.kind === NOTIFICATION_KIND)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));

  const trigger: Notifications.NotificationTriggerInput = Platform.OS === 'ios'
    ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: 10, minute: 0, repeats: true }
    : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 10, minute: 0, channelId: 'recipe-suggestions' };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Uma receita para descobrir',
      body: `${recipe.title} — uma sugestão baseada nas suas preferências.`,
      data: { kind: NOTIFICATION_KIND, recipeId: recipe.id },
    },
    trigger,
  });
}

export async function cancelDailyRecipeSuggestions() {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content.data?.kind === NOTIFICATION_KIND)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
}

export async function hasDailyRecipeSuggestion() {
  if (Platform.OS === 'web') return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((notification) => notification.content.data?.kind === NOTIFICATION_KIND);
}

export function addRecipeNotificationListener(onRecipeSelected: (recipeId: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const recipeId = response.notification.request.content.data?.recipeId;
    if (typeof recipeId === 'string') onRecipeSelected(recipeId);
  });
}

export async function getLastRecipeNotification() {
  if (Platform.OS === 'web') return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  const recipeId = response?.notification.request.content.data?.recipeId;
  return typeof recipeId === 'string' ? recipeId : null;
}
