import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { AppIcon } from '@/components/app-icon';
import { RecipeImage } from '@/components/recipe-image';
import { useAppState } from '@/components/app-state';
import { getRecipeMediaUrl, listRecipes as loadRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

export default function FavoriteListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { user, savedLists, personalDataLoading, removeRecipeFromList } = useAppState();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadRecipes()
      .then((items) => { if (active) setRecipes(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar receitas.');
      });
    return () => { active = false; };
  }, [user]);

  const list = savedLists.find((item) => item.id === listId);
  const recipesInList = recipes.filter((recipe) => list?.recipeIds.includes(recipe.id));

  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={appStyles.scrollContent}>
          <View style={appStyles.sectionHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()}>
              <AppIcon name="arrow-left" size={20} color="#28551D" />
            </Pressable>
          </View>
          <Text style={appStyles.userName}>{!user ? 'Suas listas' : list?.name ?? (personalDataLoading ? 'Carregando lista...' : 'Lista não encontrada')}</Text>
          {!user ? <Pressable style={appStyles.visitorCard} onPress={() => router.push('/login')}>
            <View style={appStyles.visitorIcon}><AppIcon name="bookmark" size={20} color="#28551D" /></View>
            <View style={appStyles.visitorCopy}>
              <Text style={appStyles.visitorTitle}>Entre para ver suas listas</Text>
              <Text style={appStyles.visitorDescription}>Suas receitas salvas aparecem aqui quando você entra na conta.</Text>
            </View>
            <AppIcon name="chevron-right" size={19} color="#28551D" />
          </Pressable> : null}
          {error ? <Text style={appStyles.emptyState}>{error}</Text> : null}
          {recipesInList.map((recipe) => (
            <View key={recipe.id} style={[appStyles.smallCard, { width: '100%', marginBottom: 16 }]}>
              <Pressable onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <View style={appStyles.smallImage}>
                  {recipe.imageUrl ? <RecipeImage uri={getRecipeMediaUrl(recipe.imageUrl)} style={appStyles.smallPhoto} /> : <AppIcon name="chef-hat" size={30} color="#AAA391" />}
                </View>
                <Text style={appStyles.smallTitle}>{recipe.title}</Text>
                <Text style={appStyles.featureMeta}>{recipe.prepTimeMinutes} min · {recipe.difficulty}</Text>
              </Pressable>
              {user ? <Pressable onPress={() => {
                void removeRecipeFromList(recipe.id, listId).catch((removeError: unknown) => {
                  setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover a receita.');
                });
              }}>
                <Text style={appStyles.seeAll}>REMOVER DA LISTA</Text>
              </Pressable> : null}
            </View>
          ))}
          {user && list && recipesInList.length === 0 && !error ? <Text style={appStyles.emptyState}>Esta lista ainda não tem receitas.</Text> : null}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}