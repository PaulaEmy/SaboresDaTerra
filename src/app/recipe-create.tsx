import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AuthHeader, AuthScreen, Field, PrimaryButton } from '@/components/auth-ui';
import { createRecipe, getRecipe, updateRecipe, uploadRecipeMedia, type RecipeMediaUpload, type UserRecipe } from '@/services/auth-api';
import { userRecipesStyles as styles } from '@/styles/user-recipes.styles';

const difficultyOptions: UserRecipe['difficulty'][] = ['Fácil', 'Médio', 'Difícil'];

export default function CreateRecipeScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recordingState = useAudioRecorderState(audioRecorder);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState<UserRecipe['difficulty'] | ''>('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
  const [steps, setSteps] = useState(['']);
  const [audio, setAudio] = useState<RecipeMediaUpload | null>(null);
  const [video, setVideo] = useState<RecipeMediaUpload | null>(null);
  const [image, setImage] = useState<RecipeMediaUpload | null>(null);
  const [createdRecipeId, setCreatedRecipeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(Boolean(editId));

  useEffect(() => {
    if (!editId) return;
    let active = true;
    getRecipe(editId)
      .then((recipe) => {
        if (!active) return;
        setTitle(recipe.title);
        setDescription(recipe.description);
        setPrepTime(String(recipe.prepTimeMinutes));
        setServings(String(recipe.servings));
        setDifficulty(recipe.difficulty);
        setIngredients(recipe.ingredients.length ? recipe.ingredients : [{ name: '', quantity: '' }]);
        setSteps(recipe.steps.length ? recipe.steps : ['']);
        setCreatedRecipeId(recipe.id);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a receita.');
      })
      .finally(() => {
        if (active) setLoadingRecipe(false);
      });
    return () => { active = false; };
  }, [editId]);

  async function toggleAudioRecording() {
    setError('');
    try {
      if (recordingState.isRecording) {
        await audioRecorder.stop();
        if (audioRecorder.uri) {
          setAudio({
            uri: audioRecorder.uri,
            name: `receita-${Date.now()}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`,
            type: Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4',
          });
        }
        return;
      }

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Permita o acesso ao microfone para gravar o áudio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : 'Não foi possível gravar o áudio.');
    }
  }

  async function captureVideo() {
    setError('');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Permita o acesso à câmera para gravar um vídeo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 180 });
      if (result.canceled) return;

      const asset = result.assets[0];
      setVideo({
        uri: asset.uri,
        name: asset.fileName ?? `receita-${Date.now()}.mp4`,
        type: asset.mimeType ?? 'video/mp4',
        file: asset.file,
      });
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Não foi possível gravar o vídeo.');
    }
  }

  async function chooseRecipeImage() {
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Permita o acesso às fotos para escolher uma imagem da receita.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled) return;

      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        name: asset.fileName ?? `receita-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        file: asset.file,
      });
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Não foi possível escolher a imagem.');
    }
  }

  async function handleCreateRecipe() {
    if (submitting) return;
    setError('');
    const missingFields: string[] = [];
    if (!title.trim()) missingFields.push('nome');
    if (!description.trim()) missingFields.push('descrição');
    if (!Number.isInteger(Number(prepTime)) || Number(prepTime) < 1 || Number(prepTime) > 1440) missingFields.push('tempo de preparo');
    if (!Number.isInteger(Number(servings)) || Number(servings) < 1 || Number(servings) > 99) missingFields.push('porções');
    if (!difficulty) missingFields.push('dificuldade');
    if (!ingredients.length || ingredients.some((item) => !item.name.trim() || !item.quantity.trim())) missingFields.push('ingredientes e quantidades');
    if (!steps.length || steps.some((step) => !step.trim())) missingFields.push('todos os passos');
    if (missingFields.length) {
      setError(`Preencha os campos obrigatórios: ${missingFields.join(', ')}.`);
      return;
    }
    if (!difficulty) return;
    setSubmitting(true);
    try {
      const cleanIngredients = ingredients
        .map((item) => ({ name: item.name.trim(), quantity: item.quantity.trim() }))
        .filter((item) => item.name);
      const cleanSteps = steps.map((step) => step.trim()).filter(Boolean);
      const input = {
        title: title.trim(),
        description: description.trim(),
        prepTimeMinutes: Number(prepTime),
        servings: Number(servings),
        difficulty,
        ingredients: cleanIngredients,
        steps: cleanSteps,
      };
      let recipeId = editId ?? createdRecipeId;

      if (editId) {
        await updateRecipe(editId, input);
      } else if (!recipeId) {
        const result = await createRecipe(input);
        recipeId = result.id;
        setCreatedRecipeId(recipeId);
      }

      if (recipeId && (image || audio || video)) {
        await uploadRecipeMedia(recipeId, {
          image: image ?? undefined,
          audio: audio ?? undefined,
          video: video ?? undefined,
        });
      }
      router.replace('/my-recipes');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Não foi possível salvar a receita.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title={editId ? 'Editar receita' : 'Nova receita'} />
      <View style={styles.form}>
        {loadingRecipe ? <Text style={styles.emptyText}>Carregando receita...</Text> : null}
        <Field label="NOME DA RECEITA" placeholder="Ex.: Sopa de abóbora" autoCapitalize="sentences" value={title} onChangeText={setTitle} />
        <Field label="DESCRIÇÃO" placeholder="Conte um pouco sobre o prato" multiline numberOfLines={4} value={description} onChangeText={setDescription} style={styles.multiline} />
        <View style={styles.twoColumns}>
          <View style={styles.halfField}>
            <Field label="TEMPO (MIN)" keyboardType="number-pad" value={prepTime} onChangeText={setPrepTime} />
          </View>
          <View style={styles.halfField}>
            <Field label="PORÇÕES" keyboardType="number-pad" value={servings} onChangeText={setServings} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dificuldade</Text>
        <View style={styles.choices}>
          {difficultyOptions.map((option) => (
            <Pressable key={option} onPress={() => setDifficulty(option)} style={[styles.choice, difficulty === option && styles.choiceSelected]}>
              <Text style={[styles.choiceText, difficulty === option && styles.choiceTextSelected]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Ingredientes</Text>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.row}>
            <View style={styles.rowField}>
              <Field label={`INGREDIENTE ${index + 1}`} placeholder="Ex.: farinha" value={ingredient.name} onChangeText={(name) => setIngredients((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item))} />
            </View>
            <View style={styles.rowField}>
              <Field label="QUANTIDADE" placeholder="Ex.: 2 xícaras" value={ingredient.quantity} onChangeText={(quantity) => setIngredients((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, quantity } : item))} />
            </View>
            {ingredients.length > 1 ? (
              <Pressable accessibilityLabel={`Remover ingrediente ${index + 1}`} onPress={() => setIngredients((items) => items.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeButton}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable onPress={() => setIngredients((items) => [...items, { name: '', quantity: '' }])} style={styles.addButton}>
          <Text style={styles.addText}>+ Adicionar ingrediente</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Modo de preparo</Text>
        {steps.map((step, index) => (
          <View key={index} style={styles.row}>
            <View style={styles.rowField}>
              <Field label={`PASSO ${index + 1}`} placeholder="Descreva esta etapa" multiline numberOfLines={3} value={step} onChangeText={(value) => setSteps((items) => items.map((item, itemIndex) => itemIndex === index ? value : item))} style={styles.smallMultiline} />
            </View>
            {steps.length > 1 ? (
              <Pressable accessibilityLabel={`Remover passo ${index + 1}`} onPress={() => setSteps((items) => items.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeButton}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable onPress={() => setSteps((items) => [...items, ''])} style={styles.addButton}>
          <Text style={styles.addText}>+ Adicionar passo</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Imagem, áudio e vídeo</Text>
        <View style={styles.mediaSection}>
          <Pressable onPress={chooseRecipeImage} style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>{image ? '✓ Imagem selecionada · escolher outra' : '▧ Escolher imagem do celular'}</Text>
          </Pressable>
          {image ? <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" /> : null}
          <Pressable onPress={toggleAudioRecording} style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>{recordingState.isRecording ? '■ Parar gravação de áudio' : audio ? '✓ Áudio gravado · gravar novamente' : '● Gravar áudio da receita'}</Text>
          </Pressable>
          {audio && !recordingState.isRecording ? <Text style={styles.success}>Áudio pronto para anexar.</Text> : null}
          <Pressable onPress={captureVideo} style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>{video ? '✓ Vídeo gravado · gravar novamente' : '▣ Gravar vídeo da receita'}</Text>
          </Pressable>
          {video ? <Text style={styles.success}>Vídeo pronto para anexar.</Text> : null}
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={submitting ? 'SALVANDO...' : editId ? 'SALVAR ALTERAÇÕES' : 'SALVAR RECEITA'} onPress={handleCreateRecipe} disabled={submitting || loadingRecipe || recordingState.isRecording} />
      </View>
    </AuthScreen>
  );
}