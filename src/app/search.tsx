import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { getRecipeMediaUrl, searchRecipes, type RecipeSummary } from '@/services/auth-api';
import { appStyles } from '@/styles/app.styles';

const suggestedTags = ['Dieta', 'Vegetariano', 'Vegano', 'Low Carb'];

export default function SearchScreen() {
  const { hiddenIngredients, personalDataError, personalDataLoading } = useAppState();
  const [ingredient, setIngredient] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [time, setTime] = useState('');
  const [difficulty, setDifficulty] = useState('Qualquer');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<'difficulty' | null>(null);
  const [filteredRecipes, setFilteredRecipes] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState('');
  const difficultyOptions = ['Qualquer', 'Fácil', 'Médio', 'Difícil'];

  useEffect(() => {
    if (personalDataLoading || personalDataError) return;
    let active = true;
    searchRecipes({
      query: ingredient,
      maxTime: Number(time) || undefined,
      difficulty,
      tags: selectedTags,
      tagQuery,
    })
      .then((items) => { if (active) { setFilteredRecipes(items); setError(''); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível buscar receitas.'); });
    return () => { active = false; };
  }, [difficulty, hiddenIngredients, ingredient, personalDataError, personalDataLoading, selectedTags, tagQuery, time]);
  return (
    <View style={appStyles.screen}>
      <SafeAreaView style={appStyles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={appStyles.scrollContent}>
          <Text style={appStyles.userName}>Buscar receitas</Text>
          <View style={appStyles.searchBar}>
            <Text style={appStyles.searchIcon}>⌕</Text>
            <TextInput value={ingredient} onChangeText={setIngredient} placeholder="Nome, ingrediente ou tag..." placeholderTextColor="#77736C" style={appStyles.searchInput} />
          </View>
          <Text style={appStyles.filterLabel}>TEMPO DE PREPARO</Text>
          <TextInput value={time} onChangeText={(value) => setTime(value.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="Digite o tempo máximo em minutos" placeholderTextColor="#77736C" style={appStyles.filterInput} />
          <Text style={appStyles.filterLabel}>DIFICULDADE</Text>
          <View style={appStyles.dropdownWrapper}><Pressable style={appStyles.filterButton} onPress={() => setOpenFilter(openFilter === 'difficulty' ? null : 'difficulty')}><Text style={appStyles.filterText}>{difficulty}</Text><Text style={appStyles.dropdownArrow}>⌄</Text></Pressable>{openFilter === 'difficulty' && <DropdownOptions options={difficultyOptions} onSelect={(value) => { setDifficulty(value); setOpenFilter(null); }} />}</View>
          <Text style={appStyles.filterLabel}>TAGS</Text>
          <View style={appStyles.tagChoices}>
            {suggestedTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTags((current) => selected ? current.filter((item) => item !== tag) : [...current, tag])}
                  style={[appStyles.tagChoice, selected && appStyles.tagChoiceSelected]}>
                  <Text style={[appStyles.tagChoiceText, selected && appStyles.tagChoiceTextSelected]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={tagQuery}
            onChangeText={setTagQuery}
            placeholder="Digite uma tag (ex.: Sem glúten)"
            placeholderTextColor="#77736C"
            style={appStyles.filterInput}
            autoCapitalize="none"
            returnKeyType="search"
          />
          <View style={appStyles.sectionHeader}>
            <Text style={appStyles.sectionTitle}>{personalDataError ? '— receitas' : `${filteredRecipes.length} receitas`}</Text>
          </View>
          {personalDataError || error ? <Text style={appStyles.emptyState}>{personalDataError || error}</Text> : null}
          {!personalDataError && filteredRecipes.map((recipe) => (
            <Pressable key={recipe.id} style={[appStyles.smallCard, { width: '100%', marginBottom: 16 }]} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
              <View style={appStyles.smallImage}>
                {recipe.imageUrl ? <Image source={{ uri: getRecipeMediaUrl(recipe.imageUrl) }} style={appStyles.smallPhoto} resizeMode="cover" /> : <Text style={appStyles.imageIcon}>♨</Text>}
              </View>
              <Text style={appStyles.smallTitle}>{recipe.title}</Text>
              <Text style={appStyles.featureMeta}>{recipe.prepTimeMinutes} min • Dificuldade {recipe.difficulty}</Text>
              {recipe.tags.length ? <Text style={appStyles.recipeTags}>{recipe.tags.join(' · ')}</Text> : null}
            </Pressable>
          ))}
          {!personalDataError && !error && filteredRecipes.length === 0 && <Text style={appStyles.emptyState}>Nenhuma receita encontrada com esses filtros.</Text>}
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}

function DropdownOptions({ options, onSelect }: { options: string[]; onSelect: (value: string) => void }) {
  return <View style={appStyles.dropdownOptions}>{options.map((option) => <Pressable key={option} style={appStyles.dropdownOption} onPress={() => onSelect(option)}><Text style={appStyles.filterText}>{option}</Text></Pressable>)}</View>;
}
