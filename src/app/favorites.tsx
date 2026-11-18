import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { AppIcon } from '@/components/app-icon';
import { RecipeImage } from '@/components/recipe-image';
import { useAppState } from '@/components/app-state';
import { getRecipeMediaUrl, listRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

export default function FavoritesScreen() {
  const { user, savedRecipeIds, savedLists, createList } = useAppState();
  const [tab, setTab] = useState<'lists' | 'recipes'>('lists');
  const [newList, setNewList] = useState('');
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    let active = true;
    listRecipes().then((items) => { if (active) setRecipes(items); }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar receitas.');
    });
    return () => { active = false; };
  }, [user]);
  const savedRecipes = recipes.filter((recipe) => savedRecipeIds.includes(recipe.id));
  async function handleCreateList() {
    if (!newList.trim()) return;
    try {
      await createList(newList.trim());
      setNewList('');
      setError('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Não foi possível criar a lista.');
    }
  }
  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={appStyles.scrollContent}>
          <Text style={appStyles.userName}>Lista de favoritos</Text>
          {user ? <View style={appStyles.favoriteTabs}><Pressable onPress={() => setTab('lists')} style={[appStyles.favoriteTab, tab === 'lists' && appStyles.favoriteTabActive]}><Text style={appStyles.favoriteTabText}>Minhas Listas</Text></Pressable><Pressable onPress={() => setTab('recipes')} style={[appStyles.favoriteTab, tab === 'recipes' && appStyles.favoriteTabActive]}><Text style={appStyles.favoriteTabText}>Receitas</Text></Pressable></View> : (
            <View style={appStyles.visitorCard}>
              <View style={appStyles.visitorIcon}><AppIcon name="bookmark" size={20} color="#28551D" /></View>
              <View style={appStyles.visitorCopy}>
                <Text style={appStyles.visitorTitle}>Seus favoritos ficam aqui</Text>
                <Text style={appStyles.visitorDescription}>Entre ou crie uma conta para salvar receitas e montar suas listas.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Entrar" style={appStyles.visitorAction} onPress={() => router.push('/login')}>
                <AppIcon name="arrow-right" size={18} color="#FCFAF5" />
              </Pressable>
            </View>
          )}
          {user ? (
            <>
          {tab === 'lists' ? <View style={appStyles.listCreateRow}><TextInput value={newList} onChangeText={setNewList} placeholder="Nova pasta..." placeholderTextColor="#99928A" style={appStyles.listInput} /><Pressable accessibilityRole="button" accessibilityLabel="Criar lista" style={appStyles.listCreateButton} onPress={() => void handleCreateList()}><AppIcon name="plus" size={20} color="#FCFAF5" /></Pressable></View> : null}
          {error ? <Text style={appStyles.emptyState}>{error}</Text> : null}
          <View style={appStyles.sectionHeader}>
            <Text style={appStyles.sectionTitle}>{tab === 'lists' ? 'Pastas de receitas' : 'Receitas salvas'}</Text>
          </View>
          {tab === 'lists' && savedLists.map((list) => <Pressable key={list.id} style={appStyles.folderRow} onPress={() => router.push({ pathname: '/favorites/[listId]', params: { listId: list.id } })}><Text style={appStyles.folderName}>{list.name}</Text><Text style={appStyles.folderCount}>{list.recipeIds.length} RECEITAS</Text></Pressable>)}
          {tab === 'recipes' && savedRecipes.map((recipe) => (
            <Pressable key={recipe.id} style={[appStyles.smallCard, { width: '100%', marginBottom: 16 }]} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
              <View style={appStyles.smallImage}>
                {recipe.imageUrl ? <RecipeImage uri={getRecipeMediaUrl(recipe.imageUrl)} style={appStyles.smallPhoto} /> : <AppIcon name="chef-hat" size={30} color="#AAA391" />}
              </View>
              <Text style={appStyles.smallTitle}>{recipe.title}</Text>
              <View style={appStyles.ratingRow}>{recipe.averageRating !== null ? <AppIcon name="star" size={14} color="#DCA52A" /> : null}<Text style={appStyles.rating}>{recipe.averageRating?.toFixed(1) ?? 'Sem avaliações'}</Text></View>
            </Pressable>
          ))}
          {tab === 'recipes' && savedRecipes.length === 0 && <Text style={appStyles.emptyState}>Você ainda não salvou nenhuma receita.</Text>}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}
