import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';

import { AppStateProvider, useAppState } from '@/components/app-state';
import { addRecipeNotificationListener, getLastRecipeNotification } from '@/services/recipe-notifications';

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AppStateProvider>
  );
}

function AppNavigator() {
  const { isOnline } = useAppState();

  useEffect(() => {
    const openRecipe = (recipeId: string) => router.push({ pathname: '/recipe/[id]', params: { id: recipeId } });
    const subscription = addRecipeNotificationListener(openRecipe);
    getLastRecipeNotification()
      .then((recipeId) => { if (recipeId) openRecipe(recipeId); })
      .catch((error: unknown) => console.error('Não foi possível abrir a notificação recebida.', error));
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      {isOnline === false ? (
        <View accessibilityRole="alert" style={{ position: 'absolute', top: Platform.OS === 'web' ? 8 : 40, left: 16, right: 16, minHeight: 34, borderRadius: 18, backgroundColor: '#7A2E22', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, zIndex: 20 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Sem conexão — recursos online indisponíveis.</Text>
        </View>
      ) : null}
    </View>
  );
}
