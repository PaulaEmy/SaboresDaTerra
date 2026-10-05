import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/components/app-state';
import { addRecipeComment, getRecipe, getRecipeMediaUrl, reportRecipe, saveRecipeRating, type Recipe, type RecipeMedia } from '@/services/auth-api';
import { recipeStyles as styles } from '@/styles/recipe.styles';

type Tab = 'ingredients' | 'steps' | 'comments';
const reportReasons = ['Conteúdo ofensivo', 'Informação incorreta', 'Imagem inadequada', 'Plágio'];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, addIngredient, toggleSavedRecipe, savedRecipeIds, savedLists, saveRecipeToList } = useAppState();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('ingredients');
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<'recipe' | 'comment'>('recipe');
  const [reportCommentId, setReportCommentId] = useState<string | undefined>();
  const [selectedReason, setSelectedReason] = useState(reportReasons[0]);
  const [reportComment, setReportComment] = useState('');
  const [commentText, setCommentText] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const isSaved = recipe ? savedRecipeIds.includes(recipe.id) : false;
  const isRecipeAuthor = recipe?.authorId === user?.id;
  const coverImage = recipe?.media.find((item) => item.type === 'image');
  const averageRating = recipe?.averageRating?.toFixed(1) ?? '—';

  useEffect(() => {
    let active = true;
    getRecipe(id)
      .then((item) => { if (active) setRecipe(item); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a receita.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function openReport(target: 'recipe' | 'comment', commentId?: string) {
    setReportTarget(target);
    setReportCommentId(commentId);
    setReportVisible(true);
  }

  async function submitComment() {
    if (!recipe || !commentText.trim()) return;
    try {
      const comment = await addRecipeComment(recipe.id, commentText.trim());
      setRecipe((current) => current ? { ...current, comments: [...current.comments, comment] } : current);
      setCommentText('');
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível enviar o comentário.');
    }
  }

  async function submitRating() {
    if (!recipe || !selectedRating) return;
    try {
      const rating = await saveRecipeRating(recipe.id, selectedRating);
      setRecipe((current) => current ? { ...current, ...rating } : current);
      setRatingModalVisible(false);
      setSelectedRating(0);
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar a avaliação.');
    }
  }

  async function submitReport() {
    if (!recipe) return;
    try {
      await reportRecipe({ recipeId: recipe.id, targetType: reportTarget, commentId: reportCommentId, reason: selectedReason, details: reportComment });
      setReportVisible(false);
      setReportComment('');
      setFeedbackVisible(true);
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível enviar a denúncia.');
    }
  }

  if (loading || !recipe || recipe.id !== id) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable>
            <Text style={styles.headerTitle}>Receita</Text>
          </View>
          <Text style={styles.description}>{loading ? 'Carregando receita...' : error || 'Receita não encontrada.'}</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.headerTitle}>{recipe.title}</Text>
            <Pressable style={styles.headerSave} onPress={() => setSaveModalVisible(true)}>
            <Text style={styles.headerSaveIcon}>{isSaved ? '▮' : '▯'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {coverImage
              ? <Image source={{ uri: getRecipeMediaUrl(coverImage.url) }} style={styles.heroImage} resizeMode="cover" />
              : <Text style={styles.heroIcon}>♨</Text>}
            <Pressable style={styles.favoriteButton} onPress={() => setSaveModalVisible(true)}>
              <Text style={[styles.favoriteIcon, isSaved && styles.favoriteIconActive]}>{isSaved ? '♥' : '♡'}</Text>
            </Pressable>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{recipe.title}</Text>
            <Text style={styles.meta}>Por {recipe.author} • Dificuldade {recipe.difficulty}</Text>
            <Text style={styles.description}>{recipe.description}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>◷  {recipe.prepTimeMinutes} min</Text><Text style={styles.stat}>♧  {recipe.servings} porções</Text><Text style={styles.stat}>★  {averageRating} ({recipe.ratingCount})</Text>
            </View>
            <View style={styles.tabs}>
              {([['ingredients', 'Ingredientes'], ['steps', 'Passos'], ['comments', 'Comentários']] as const).map(([value, label]) => (
                <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}>
                  <Text style={[styles.tabText, tab === value && styles.activeTabText]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {tab === 'ingredients' && <Ingredients ingredients={recipe.ingredients} onAdd={(ingredient, quantity) => {
              void addIngredient(`${quantity} ${ingredient}`.trim()).then(() => setFeedbackVisible(true)).catch((actionError: unknown) => setError(actionError instanceof Error ? actionError.message : 'Não foi possível adicionar o ingrediente.'));
            }} />}
            {tab === 'steps' && <Steps steps={recipe.steps} media={recipe.media} />}
            {tab === 'comments' && <Comments comments={recipe.comments} text={commentText} setText={setCommentText} onAdd={() => void submitComment()} onReport={(commentId) => openReport('comment', commentId)} />}
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
            <Pressable onPress={() => openReport('recipe')}><Text style={styles.reportLink}>Denunciar receita</Text></Pressable>
            <View style={styles.bottomActions}>{user && !isRecipeAuthor ? <Pressable style={styles.rateButton} onPress={() => setRatingModalVisible(true)}><Text style={styles.actionText}>Avaliar</Text></Pressable> : null}<Pressable style={styles.saveButton} onPress={() => setSaveModalVisible(true)}><Text style={styles.saveText}>{isSaved ? 'Salva' : 'Salvar'}</Text></Pressable></View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.reportModal}>
          <Text style={styles.modalTitle}>Denunciar {reportTarget === 'recipe' ? 'receita' : 'comentário'}</Text>
          <Text style={styles.modalLabel}>MOTIVO</Text>
          <View style={styles.reasonList}>{reportReasons.map((reason) => <Pressable key={reason} onPress={() => setSelectedReason(reason)} style={styles.reasonRow}><View style={[styles.radio, selectedReason === reason && styles.radioSelected]} /><Text style={styles.reasonText}>{reason}</Text></Pressable>)}</View>
          <Text style={styles.modalLabel}>DETALHES (OPCIONAL)</Text>
          <TextInput multiline value={reportComment} onChangeText={setReportComment} style={styles.reportInput} placeholder="Conte mais sobre o problema..." placeholderTextColor="#99928A" />
          <View style={styles.modalActions}><Pressable style={styles.cancelButton} onPress={() => setReportVisible(false)}><Text style={styles.actionText}>Cancelar</Text></Pressable><Pressable style={styles.dangerButton} onPress={() => void submitReport()}><Text style={styles.saveText}>Denunciar</Text></Pressable></View>
        </View></View>
      </Modal>
      <Modal visible={saveModalVisible} transparent animationType="slide" onRequestClose={() => setSaveModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.reportModal}>
          <Text style={styles.modalTitleSave}>{isSaved ? 'Receita salva' : 'Salvar receita'}</Text>
          {!isSaved && <Pressable style={styles.saveOption} onPress={() => { void toggleSavedRecipe(recipe.id).then(() => setSaveModalVisible(false)).catch((actionError: unknown) => setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar a receita.')); }}><Text style={styles.saveOptionText}>Salvar nos favoritos</Text></Pressable>}
          {savedLists.map((list) => <Pressable key={list.id} style={styles.saveOption} onPress={() => { void saveRecipeToList(recipe.id, list.id).then(() => setSaveModalVisible(false)).catch((actionError: unknown) => setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar na lista.')); }}><Text style={styles.saveOptionText}>Salvar em {list.name}</Text></Pressable>)}
          {isSaved && <Pressable style={styles.removeSaveOption} onPress={() => { void toggleSavedRecipe(recipe.id).then(() => setSaveModalVisible(false)).catch((actionError: unknown) => setError(actionError instanceof Error ? actionError.message : 'Não foi possível atualizar favoritos.')); }}><Text style={styles.removeSaveText}>Remover dos favoritos</Text></Pressable>}
          <Pressable style={styles.cancelButton} onPress={() => setSaveModalVisible(false)}><Text style={styles.actionText}>Cancelar</Text></Pressable>
        </View></View>
      </Modal>
      <Modal visible={ratingModalVisible} transparent animationType="slide" onRequestClose={() => setRatingModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.reportModal}>
          <Text style={styles.modalTitleSave}>Avalie esta receita</Text>
          <Text style={styles.ratingHint}>Como foi sua experiência?</Text>
          <View style={styles.starPicker}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} onPress={() => setSelectedRating(star)}><Text style={[styles.ratingStar, star <= selectedRating && styles.ratingStarActive]}>★</Text></Pressable>)}</View>
          <View style={styles.modalActions}><Pressable style={styles.cancelButton} onPress={() => setRatingModalVisible(false)}><Text style={styles.actionText}>Cancelar</Text></Pressable><Pressable disabled={!selectedRating} style={[styles.saveButton, !selectedRating && styles.disabledButton]} onPress={() => void submitRating()}><Text style={styles.saveText}>Enviar</Text></Pressable></View>
        </View></View>
      </Modal>
      {feedbackVisible && <Pressable style={styles.feedbackToast} onPress={() => setFeedbackVisible(false)}><Text style={styles.feedbackIcon}>✓</Text><Text style={styles.feedbackText}>Ingrediente adicionado com sucesso!</Text></Pressable>}
    </View>
  );
}

function Ingredients({ ingredients, onAdd }: { ingredients: Recipe['ingredients']; onAdd: (name: string, quantity: string) => void }) {
  return <View style={styles.tabContent}>{ingredients.map((ingredient, index) => <View key={`${ingredient.name}-${index}`} style={styles.ingredientRow}><Text style={styles.ingredient}>{ingredient.quantity ? `${ingredient.quantity} ` : ''}{ingredient.name}</Text><Pressable onPress={() => onAdd(ingredient.name, ingredient.quantity)}><Text style={styles.addToList}>+ LISTA</Text></Pressable></View>)}</View>;
}

function Steps({ steps, media }: { steps: Recipe['steps']; media: Recipe['media'] }) {
  const audio = media.find((item) => item.type === 'audio');
  const video = media.find((item) => item.type === 'video');
  const [showVideo, setShowVideo] = useState(false);
  return (
    <View style={styles.tabContent}>
      {audio || video ? (
        <View style={styles.mediaActions}>
          {audio ? <RecipeAudioControls media={audio} /> : null}
          {video ? <Pressable accessibilityRole="button" onPress={() => setShowVideo((visible) => !visible)} style={[styles.mediaAction, styles.videoAction]}><Text style={styles.mediaActionText}>{showVideo ? 'Ocultar vídeo' : 'Ver vídeo'}</Text></Pressable> : null}
        </View>
      ) : null}
      {showVideo && video ? <InlineRecipeVideo media={video} /> : null}
      {steps.map((step, index) => <View key={`${index}-${step}`} style={styles.stepRow}><Text style={styles.stepNumber}>{index + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}
    </View>
  );
}

function RecipeAudioControls({ media }: { media: RecipeMedia }) {
  const player = useAudioPlayer(getRecipeMediaUrl(media.url));
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable accessibilityRole="button" onPress={() => status.playing ? player.pause() : player.play()} style={[styles.mediaAction, styles.audioAction]}>
      <Text style={styles.mediaActionText}>{status.playing ? 'Pausar áudio' : 'Ouvir áudio'}</Text>
    </Pressable>
  );
}

function InlineRecipeVideo({ media }: { media: RecipeMedia }) {
  const player = useVideoPlayer(getRecipeMediaUrl(media.url));
  return <VideoView player={player} nativeControls playsInline contentFit="contain" style={styles.mediaPlayer} />;
}

function Comments({ comments, text, setText, onAdd, onReport }: { comments: Recipe['comments']; text: string; setText: (value: string) => void; onAdd: () => void; onReport: (commentId: string) => void }) {
  return <View style={styles.tabContent}>{comments.map((comment) => <View key={comment.id} style={styles.commentCard}><View style={styles.commentLine}><Text style={styles.commentAuthor}>{comment.author}</Text><Pressable accessibilityLabel="Denunciar comentário" onPress={() => onReport(comment.id)}><Text style={styles.flag}>⚑</Text></Pressable></View><Text style={styles.commentText}>{comment.text}</Text></View>)}{comments.length === 0 ? <Text style={styles.commentText}>Ainda não há comentários.</Text> : null}<TextInput value={text} onChangeText={setText} placeholder="Escreva um comentário..." placeholderTextColor="#99928A" style={styles.commentInput} /><Pressable style={styles.commentButton} onPress={onAdd}><Text style={styles.actionText}>Comentar</Text></Pressable></View>;
}
