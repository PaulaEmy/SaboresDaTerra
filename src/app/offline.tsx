import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { appStyles } from '@/styles/app.styles';

export default function OfflineRecipesScreen() {
  const { offlineRecipes, offlineSyncError, removeOfflineRecipe } = useAppState();
  const [error, setError] = useState('');

  async function handleRemove(recipeId: string) {
    setError('');
    try {
      await removeOfflineRecipe(recipeId);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover a receita offline.');
    }
  }

  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={appStyles.scrollContent}>
          <Text style={appStyles.userName}>Receitas offline</Text>
          <Text style={appStyles.featureMeta}>As receitas salvas ficam disponíveis sem conexão com ingredientes e modo de preparo. Fotos, vídeos, áudio e interações precisam de internet.</Text>
          {offlineSyncError || error ? <Text accessibilityRole="alert" style={appStyles.emptyState}>{error || offlineSyncError}</Text> : null}
          {offlineRecipes.map((recipe) => (
            <View key={recipe.id} style={appStyles.offlineRecipeCard}>
              <Pressable onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <Text style={appStyles.smallTitle}>{recipe.title}</Text>
                <Text style={appStyles.featureMeta}>{recipe.prepTimeMinutes} min · {recipe.difficulty} · {recipe.ingredients.length} ingredientes</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void handleRemove(recipe.id)}>
                <Text style={appStyles.offlineRemove}>Remover</Text>
              </Pressable>
            </View>
          ))}
          {offlineRecipes.length === 0 ? <Text style={appStyles.emptyState}>Nenhuma receita salva para acesso offline.</Text> : null}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}
