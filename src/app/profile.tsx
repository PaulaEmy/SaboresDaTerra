import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { dietaryTags } from '@/constants/diet-tags';
import { getRecommendations } from '@/services/auth-api';
import { cancelDailyRecipeSuggestions, hasDailyRecipeSuggestion, scheduleDailyRecipeSuggestion } from '@/services/recipe-notifications';
import { profileStyles as styles } from '@/styles/profile.styles';

const menuItems = [
  { label: 'Minhas receitas', path: '/my-recipes' as const },
  { label: 'Salvas', path: '/favorites' as const },
  { label: 'Receitas offline', path: '/offline' as const },
];

export default function ProfileScreen() {
  const { user, authError, hiddenIngredients, preferredTags, personalDataError, personalDataLoading, setHiddenIngredients, setPreferredTags, signOut } = useAppState();
  const [ingredientInput, setIngredientInput] = useState('');
  const [restrictionError, setRestrictionError] = useState('');
  const [preferenceError, setPreferenceError] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [savingRestrictions, setSavingRestrictions] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  const displayName = user?.name ?? 'Visitante';

  async function updateRestrictions(ingredients: string[]) {
    setSavingRestrictions(true);
    setRestrictionError('');
    try {
      await setHiddenIngredients(ingredients);
    } catch (error) {
      setRestrictionError(error instanceof Error ? error.message : 'Não foi possível salvar as restrições.');
      return;
    } finally {
      setSavingRestrictions(false);
    }
    try {
      await refreshScheduledSuggestion();
      setNotificationError('');
    } catch (error) {
      setNotificationError(error instanceof Error ? `Restrições salvas, mas não foi possível atualizar a sugestão diária: ${error.message}` : 'Restrições salvas, mas não foi possível atualizar a sugestão diária.');
    }
  }

  function addRestriction() {
    const ingredient = ingredientInput.trim();
    if (personalDataError) return;
    if (!ingredient || hiddenIngredients.some((item) => item.toLocaleLowerCase() === ingredient.toLocaleLowerCase())) return;
    if (hiddenIngredients.length >= 50) {
      setRestrictionError('Você pode esconder até 50 ingredientes.');
      return;
    }
    setIngredientInput('');
    void updateRestrictions([...hiddenIngredients, ingredient]);
  }

  async function togglePreference(tag: string) {
    if (!user || savingPreferences || personalDataError || personalDataLoading) return;
    const updatedTags = preferredTags.includes(tag)
      ? preferredTags.filter((item) => item !== tag)
      : [...preferredTags, tag];
    setSavingPreferences(true);
    setPreferenceError('');
    try {
      await setPreferredTags(updatedTags);
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : 'Não foi possível salvar suas preferências.');
      return;
    } finally {
      setSavingPreferences(false);
    }
    try {
      await refreshScheduledSuggestion();
      setNotificationError('');
    } catch (error) {
      setNotificationError(error instanceof Error ? `Preferências salvas, mas não foi possível atualizar a sugestão diária: ${error.message}` : 'Preferências salvas, mas não foi possível atualizar a sugestão diária.');
    }
  }

  async function refreshScheduledSuggestion() {
    if (!await hasDailyRecipeSuggestion()) return;
    const recommendations = await getRecommendations();
    if (recommendations[0]) await scheduleDailyRecipeSuggestion(recommendations[0]);
    else await cancelDailyRecipeSuggestions();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.trim().charAt(0).toUpperCase() || '?'}</Text></View>
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{user?.email ?? ''}</Text>
            </View>
            {authError ? <Text accessibilityRole="alert" style={styles.errorText}>{authError}</Text> : null}
          </View>
          {menuItems.map((item) => (
            <Pressable key={item.label} style={styles.menuItem} onPress={() => router.push(item.path)}>
              <Text style={styles.menuText}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Pressable style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Text style={styles.menuText}>Configurações</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.restrictionsCard}>
            <Text style={styles.restrictionsTitle}>Preferências alimentares</Text>
            <Text style={styles.restrictionsDescription}>Escolha os tipos de receita que devem aparecer nas recomendações. A busca continua mostrando todas as receitas.</Text>
            <View style={styles.preferenceChoices}>
              {dietaryTags.map((tag) => {
                const selected = preferredTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: !user || savingPreferences || personalDataLoading || Boolean(personalDataError) }}
                    disabled={!user || savingPreferences || personalDataLoading || Boolean(personalDataError)}
                    onPress={() => void togglePreference(tag)}
                    style={[styles.preferenceChoice, selected && styles.preferenceChoiceSelected]}>
                    <Text style={[styles.preferenceChoiceText, selected && styles.preferenceChoiceTextSelected]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!user ? <Text style={styles.restrictionsDescription}>Entre na sua conta para salvar suas preferências.</Text> : null}
            {savingPreferences ? <Text style={styles.restrictionsDescription}>Salvando preferências...</Text> : null}
            {preferenceError ? <Text accessibilityRole="alert" style={styles.errorText}>{preferenceError}</Text> : null}
            {notificationError ? <Text accessibilityRole="alert" style={styles.errorText}>{notificationError}</Text> : null}
          </View>
          <View style={styles.restrictionsCard}>
            <Text style={styles.restrictionsTitle}>Restrições alimentares</Text>
            <Text style={styles.restrictionsDescription}>Receitas que contenham estes ingredientes serão excluídas das recomendações. A busca continuará mostrando os resultados; confira sempre os ingredientes e rótulos, pois isso não garante segurança contra alergênicos.</Text>
            {!user ? <Text style={styles.restrictionsDescription}>Entre na sua conta para salvar suas restrições.</Text> : null}
            {personalDataLoading ? <Text style={styles.restrictionsDescription}>Carregando preferências...</Text> : null}
            {personalDataError ? <Text accessibilityRole="alert" style={styles.errorText}>{personalDataError}</Text> : null}
            <View style={styles.restrictionInputRow}>
              <TextInput
                value={ingredientInput}
                onChangeText={setIngredientInput}
                onSubmitEditing={addRestriction}
                placeholder="Ex.: amendoim"
                placeholderTextColor="#99928A"
                style={styles.restrictionInput}
                editable={Boolean(user) && !savingRestrictions && !personalDataLoading && !personalDataError}
                returnKeyType="done"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar ingrediente a esconder"
                disabled={!user || savingRestrictions || personalDataLoading || Boolean(personalDataError) || !ingredientInput.trim()}
                onPress={addRestriction}
                style={styles.restrictionAddButton}>
                <Text style={styles.restrictionAddText}>+</Text>
              </Pressable>
            </View>
            {hiddenIngredients.map((ingredient) => (
              <View key={ingredient} style={styles.restrictionRow}>
                <Text style={styles.restrictionName}>{ingredient}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover restrição de ${ingredient}`}
                  disabled={savingRestrictions || Boolean(personalDataError)}
                  onPress={() => void updateRestrictions(hiddenIngredients.filter((item) => item !== ingredient))}>
                  <Text style={styles.restrictionRemove}>Remover</Text>
                </Pressable>
              </View>
            ))}
            {restrictionError ? <Text accessibilityRole="alert" style={styles.errorText}>{restrictionError}</Text> : null}
          </View>
          <Pressable style={styles.logout} onPress={handleSignOut}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}
