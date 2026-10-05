import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { getRecipeMediaUrl, listRecipes as loadRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

export default function FavoriteListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { savedLists, personalDataLoading, removeRecipeFromList } = useAppState();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadRecipes()
      .then((items) => { if (active) setRecipes(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar receitas.');
      });
    return () => { active = false; };
  }, []);

  const list = savedLists.find((item) => item.id === listId);
  const recipesInList = recipes.filter((recipe) => list?.recipeIds.includes(recipe.id));

  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={appStyles.scrollContent}>
          <View style={appStyles.sectionHeader}>
            <Pressable accessibilityRole="button" onPress={() => router.back()}>
              <Text style={appStyles.seeAll}>‹ VOLTAR</Text>
            </Pressable>
          </View>
          <Text style={appStyles.userName}>{list?.name ?? (personalDataLoading ? 'Carregando lista...' : 'Lista não encontrada')}</Text>
          {error ? <Text style={appStyles.emptyState}>{error}</Text> : null}
          {recipesInList.map((recipe) => (
            <View key={recipe.id} style={[appStyles.smallCard, { width: '100%', marginBottom: 16 }]}>
              <Pressable onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <View style={appStyles.smallImage}>
                  {recipe.imageUrl ? <Image source={{ uri: getRecipeMediaUrl(recipe.imageUrl) }} style={appStyles.smallPhoto} resizeMode="cover" /> : <Text style={appStyles.imageIcon}>♨</Text>}
                </View>
                <Text style={appStyles.smallTitle}>{recipe.title}</Text>
                <Text style={appStyles.featureMeta}>{recipe.prepTimeMinutes} min · {recipe.difficulty}</Text>
              </Pressable>
              <Pressable onPress={() => {
                void removeRecipeFromList(recipe.id, listId).catch((removeError: unknown) => {
                  setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover a receita.');
                });
              }}>
                <Text style={appStyles.seeAll}>REMOVER DA LISTA</Text>
              </Pressable>
            </View>
          ))}
          {list && recipesInList.length === 0 && !error ? <Text style={appStyles.emptyState}>Esta lista ainda não tem receitas.</Text> : null}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}