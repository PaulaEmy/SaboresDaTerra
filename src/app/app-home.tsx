import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { getRecipeMediaUrl, searchRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

export default function AppHomeScreen() {
  const { user, hiddenIngredients, personalDataError, personalDataLoading } = useAppState();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loadError, setLoadError] = useState('');
  const allRecipesList = useRef<ScrollView>(null);
  const [allRecipesListWidth, setAllRecipesListWidth] = useState(0);
  const [allRecipesContentWidth, setAllRecipesContentWidth] = useState(0);
  const [allRecipesOffset, setAllRecipesOffset] = useState(0);

  useEffect(() => {
    if (personalDataLoading || personalDataError) return;
    let active = true;
    searchRecipes({})
      .then((items) => { if (active) setRecipes(items); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar receitas.'); });
    return () => { active = false; };
  }, [hiddenIngredients, personalDataError, personalDataLoading]);

  const visibleRecipes = personalDataError ? [] : recipes;
  const seasonalRecipes = visibleRecipes.slice(0, 5);
  const canScrollAllRecipesBack = allRecipesOffset > 0;
  const canScrollAllRecipesForward = allRecipesOffset + allRecipesListWidth < allRecipesContentWidth - 1;

  function scrollAllRecipes(direction: -1 | 1) {
    const nextOffset = Math.max(0, Math.min(
      allRecipesOffset + direction * Math.max(allRecipesListWidth * 0.8, 240),
      allRecipesContentWidth - allRecipesListWidth,
    ));
    allRecipesList.current?.scrollTo({ x: nextOffset, animated: true });
  }

  function updateAllRecipesOffset(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setAllRecipesOffset(event.nativeEvent.contentOffset.x);
  }

  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={appStyles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Pressable style={appStyles.profileButton} onPress={() => router.push('/profile')}>
              <Text style={appStyles.avatarText}>{user?.name.trim().charAt(0).toUpperCase() ?? '?'}</Text>
          </Pressable>
          <Text style={appStyles.greeting}>Bem-vindo(a),</Text>
          <Text style={appStyles.userName}>{user?.name ?? 'Visitante'}</Text>

          <Pressable style={appStyles.searchBar} onPress={() => router.push('/search')}>
            <Text style={appStyles.searchIcon}>⌕</Text>
            <Text style={appStyles.searchPlaceholder}>Pesquisar receitas...</Text>
          </Pressable>

          <Pressable style={appStyles.shoppingButton} onPress={() => router.push('/shopping-list')}>
            <Text style={appStyles.shoppingIcon}>♧</Text>
            <Text style={appStyles.shoppingLabel}>MINHA LISTA DE COMPRAS</Text>
          </Pressable>

          <View style={appStyles.sectionHeader}>
            <Text style={appStyles.sectionTitle}>Receitas da Estação</Text>
            <Pressable onPress={() => router.push('/search')}>
              <Text style={appStyles.seeAll}>VER TODAS</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={appStyles.horizontalList}>
            {seasonalRecipes.map((recipe) => (
              <Pressable
                key={recipe.id}
                style={appStyles.featureCard}
                onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <View style={appStyles.featureImage}>
                  {recipe.imageUrl
                    ? <Image source={{ uri: getRecipeMediaUrl(recipe.imageUrl) }} style={appStyles.featurePhoto} resizeMode="cover" />
                    : <Text style={appStyles.imageIcon}>♨</Text>}
                </View>
                <Text style={appStyles.featureTitle}>{recipe.title}</Text>
                <Text style={appStyles.featureMeta}>{recipe.prepTimeMinutes} min • Dificuldade {recipe.difficulty}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {personalDataError || loadError ? <Text style={appStyles.emptyState}>{personalDataError || loadError}</Text> : null}
          {!personalDataError && !loadError && visibleRecipes.length === 0 ? <Text style={appStyles.emptyState}>Ainda não há receitas publicadas.</Text> : null}

          {visibleRecipes.length > 0 ? <>
            <View style={appStyles.sectionHeader}>
              <Text style={appStyles.sectionTitle}>Todas as receitas</Text>
              <View style={appStyles.carouselActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver receitas anteriores"
                  disabled={!canScrollAllRecipesBack}
                  onPress={() => scrollAllRecipes(-1)}
                  style={[appStyles.carouselArrow, !canScrollAllRecipesBack && appStyles.carouselArrowDisabled]}>
                  <Text style={appStyles.carouselArrowText}>‹</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver mais receitas"
                  disabled={!canScrollAllRecipesForward}
                  onPress={() => scrollAllRecipes(1)}
                  style={[appStyles.carouselArrow, !canScrollAllRecipesForward && appStyles.carouselArrowDisabled]}>
                  <Text style={appStyles.carouselArrowText}>›</Text>
                </Pressable>
              </View>
            </View>

          <ScrollView
            ref={allRecipesList}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={appStyles.horizontalList}
            onLayout={(event) => setAllRecipesListWidth(event.nativeEvent.layout.width)}
            onContentSizeChange={(width) => setAllRecipesContentWidth(width)}
            onScroll={updateAllRecipesOffset}
            scrollEventThrottle={16}>
            {visibleRecipes.map((recipe) => (
              <Pressable
                key={recipe.id}
                style={appStyles.smallCard}
                onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <View style={appStyles.smallImage}>
                  {recipe.imageUrl
                    ? <Image source={{ uri: getRecipeMediaUrl(recipe.imageUrl) }} style={appStyles.smallPhoto} resizeMode="cover" />
                    : <Text style={appStyles.imageIcon}>♨</Text>}
                </View>
                <Text style={appStyles.smallTitle}>{recipe.title}</Text>
                <Text style={appStyles.rating}>
                  <Text style={appStyles.star}>★ </Text>{recipe.averageRating?.toFixed(1) ?? 'Sem avaliações'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          </> : null}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}
