import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { getRecipeMediaUrl, searchRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

export default function SearchScreen() {
  const [ingredient, setIngredient] = useState('');
  const [time, setTime] = useState('');
  const [difficulty, setDifficulty] = useState('Qualquer');
  const [openFilter, setOpenFilter] = useState<'difficulty' | null>(null);
  const [filteredRecipes, setFilteredRecipes] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState('');
  const difficultyOptions = ['Qualquer', 'Fácil', 'Médio', 'Difícil'];

  useEffect(() => {
    let active = true;
    searchRecipes({ query: ingredient, maxTime: Number(time) || undefined, difficulty })
      .then((items) => { if (active) { setFilteredRecipes(items); setError(''); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível buscar receitas.'); });
    return () => { active = false; };
  }, [difficulty, ingredient, time]);
  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={appStyles.scrollContent}>
          <Text style={appStyles.userName}>Buscar receitas</Text>
          <View style={appStyles.searchBar}>
            <Text style={appStyles.searchIcon}>⌕</Text>
            <TextInput value={ingredient} onChangeText={setIngredient} placeholder="Nome da receita ou ingrediente..." placeholderTextColor="#77736C" style={appStyles.searchInput} />
          </View>
          <Text style={appStyles.filterLabel}>TEMPO DE PREPARO</Text>
          <TextInput value={time} onChangeText={(value) => setTime(value.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="Digite o tempo máximo em minutos" placeholderTextColor="#77736C" style={appStyles.filterInput} />
          <Text style={appStyles.filterLabel}>DIFICULDADE</Text>
          <View style={appStyles.dropdownWrapper}><Pressable style={appStyles.filterButton} onPress={() => setOpenFilter(openFilter === 'difficulty' ? null : 'difficulty')}><Text style={appStyles.filterText}>{difficulty}</Text><Text style={appStyles.dropdownArrow}>⌄</Text></Pressable>{openFilter === 'difficulty' && <DropdownOptions options={difficultyOptions} onSelect={(value) => { setDifficulty(value); setOpenFilter(null); }} />}</View>
          <View style={appStyles.sectionHeader}>
            <Text style={appStyles.sectionTitle}>{filteredRecipes.length} receitas</Text>
          </View>
          {error ? <Text style={appStyles.emptyState}>{error}</Text> : null}
          {filteredRecipes.map((recipe) => (
            <Pressable key={recipe.id} style={[appStyles.smallCard, { width: '100%', marginBottom: 16 }]} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
              <View style={appStyles.smallImage}>
                {recipe.imageUrl ? <Image source={{ uri: getRecipeMediaUrl(recipe.imageUrl) }} style={appStyles.smallPhoto} resizeMode="cover" /> : <Text style={appStyles.imageIcon}>♨</Text>}
              </View>
              <Text style={appStyles.smallTitle}>{recipe.title}</Text>
              <Text style={appStyles.featureMeta}>{recipe.prepTimeMinutes} min • Dificuldade {recipe.difficulty}</Text>
            </Pressable>
          ))}
          {!error && filteredRecipes.length === 0 && <Text style={appStyles.emptyState}>Nenhuma receita encontrada com esses filtros.</Text>}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}

function DropdownOptions({ options, onSelect }: { options: string[]; onSelect: (value: string) => void }) {
  return <View style={appStyles.dropdownOptions}>{options.map((option) => <Pressable key={option} style={appStyles.dropdownOption} onPress={() => onSelect(option)}><Text style={appStyles.filterText}>{option}</Text></Pressable>)}</View>;
}
