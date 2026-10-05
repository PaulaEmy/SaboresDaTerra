import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { getRecipeMediaUrl, listRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

export default function AppHomeScreen() {
  const { user } = useAppState();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    listRecipes()
      .then((items) => { if (active) setRecipes(items); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar receitas.'); });
    return () => { active = false; };
  }, []);

  const seasonalRecipes = recipes.slice(0, 2);
  const recommendedRecipes = recipes.slice(2);

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
          {loadError ? <Text style={appStyles.emptyState}>{loadError}</Text> : null}
          {!loadError && recipes.length === 0 ? <Text style={appStyles.emptyState}>Ainda não há receitas publicadas.</Text> : null}

          {recommendedRecipes.length > 0 ? <View style={appStyles.sectionHeader}>
            <Text style={appStyles.sectionTitle}>Mais receitas</Text>
          </View> : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={appStyles.horizontalList}>
            {recommendedRecipes.map((recipe) => (
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
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}
