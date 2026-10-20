import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { profileStyles as styles } from '@/styles/profile.styles';

const menuItems = ['Minhas receitas', 'Salvas', 'Histórico', 'Ajuda'];

export default function ProfileScreen() {
  const { user, hiddenIngredients, personalDataError, personalDataLoading, setHiddenIngredients, signOut } = useAppState();
  const [ingredientInput, setIngredientInput] = useState('');
  const [restrictionError, setRestrictionError] = useState('');
  const [savingRestrictions, setSavingRestrictions] = useState(false);

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
    } finally {
      setSavingRestrictions(false);
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
          </View>
          {menuItems.map((item) => (
            <Pressable key={item} style={styles.menuItem} onPress={item === 'Minhas receitas' ? () => router.push('/my-recipes') : undefined}>
              <Text style={styles.menuText}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Pressable style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Text style={styles.menuText}>Configurações</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.restrictionsCard}>
            <Text style={styles.restrictionsTitle}>Restrições alimentares</Text>
            <Text style={styles.restrictionsDescription}>Esconda ingredientes das recomendações. Se pesquisar por um deles, as receitas correspondentes ainda aparecem.</Text>
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
