import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { AuthHeader, PrimaryButton } from '@/components/auth-ui';
import { deleteRecipe, listMyRecipes, type UserRecipe } from '@/services/auth-api';
import { userRecipesStyles as styles } from '@/styles/user-recipes.styles';

export default function MyRecipesScreen() {
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recipePendingDeletion, setRecipePendingDeletion] = useState<UserRecipe | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    listMyRecipes()
      .then((items) => {
        if (active) setRecipes(items);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar suas receitas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []));

  async function confirmDeleteRecipe() {
    if (!recipePendingDeletion || deleting) return;
    setDeleting(true);
    try {
      await deleteRecipe(recipePendingDeletion.id);
      setRecipes((current) => current.filter((recipe) => recipe.id !== recipePendingDeletion.id));
      setRecipePendingDeletion(null);
      setError('');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a receita.');
      setRecipePendingDeletion(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AuthHeader title="Minhas receitas" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Receitas criadas por você</Text>
          <Text style={styles.description}>Suas receitas, ingredientes e etapas em um só lugar.</Text>
          {loading ? <Text style={styles.emptyText}>Carregando receitas...</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.message}>{error}</Text> : null}
          {!loading && !error && recipes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Você ainda não criou receitas.</Text>
            </View>
          ) : null}
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.recipeRow}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <Text style={styles.recipeTitle}>{recipe.title}</Text>
                <Text style={styles.recipeDescription}>{recipe.description}</Text>
                <Text style={styles.recipeMeta}>{recipe.prepTimeMinutes} min · {recipe.difficulty} · {recipe.servings} porções</Text>
                {recipe.media.length ? (
                  <Text style={styles.recipeDescription}>
                    Mídia: {recipe.media.map((item) => item.type === 'image' ? 'imagem' : item.type === 'audio' ? 'áudio' : 'vídeo').join(', ')}
                  </Text>
                ) : null}
              </Pressable>
              <View style={styles.recipeActions}>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/recipe-create', params: { editId: recipe.id } })} style={styles.editRecipeButton}>
                  <Text style={styles.recipeActionText}>Editar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setRecipePendingDeletion(recipe)} style={styles.deleteRecipeButton}>
                  <Text style={styles.deleteRecipeText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <PrimaryButton label="CRIAR NOVA RECEITA" onPress={() => router.push('/recipe-create')} />
        </ScrollView>
      </SafeAreaView>
      <Modal visible={Boolean(recipePendingDeletion)} transparent animationType="fade" onRequestClose={() => setRecipePendingDeletion(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteTitle}>Excluir receita?</Text>
            <Text style={styles.deleteDescription}>{recipePendingDeletion?.title} e seus anexos serão removidos.</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" disabled={deleting} onPress={() => setRecipePendingDeletion(null)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={deleting} onPress={() => void confirmDeleteRecipe()} style={[styles.confirmDeleteButton, deleting && styles.disabledButton]}>
                <Text style={styles.confirmDeleteText}>{deleting ? 'Excluindo...' : 'Excluir'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <AppBottomNav />
    </View>
  );
}