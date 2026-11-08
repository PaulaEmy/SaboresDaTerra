import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/components/app-state';
import { addRecipeComment, deleteRecipeRating, getIngredientSubstitutions, getRecipe, getRecipeMediaUrl, reportRecipe, saveRecipeRating, type IngredientSubstitution, type Recipe, type RecipeMedia, type RecipeReview } from '@/services/auth-api';
import { recipeStyles as styles } from '@/styles/recipe.styles';

type Tab = 'ingredients' | 'steps' | 'comments';
const reportReasons = ['Conteúdo ofensivo', 'Informação incorreta', 'Imagem inadequada', 'Plágio'];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, hiddenIngredients, offlineRecipes, saveRecipeOffline, removeOfflineRecipe, addIngredient, addIngredients, toggleSavedRecipe, savedRecipeIds, savedLists, saveRecipeToList } = useAppState();
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
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [addingAllIngredients, setAddingAllIngredients] = useState(false);
  const [substitutionIngredient, setSubstitutionIngredient] = useState('');
  const [substitutions, setSubstitutions] = useState<IngredientSubstitution[]>([]);
  const [substitutionMessage, setSubstitutionMessage] = useState('');
  const [substitutionLoading, setSubstitutionLoading] = useState(false);
  const [substitutionVisible, setSubstitutionVisible] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [ratingComment, setRatingComment] = useState('');
  const isSaved = recipe ? savedRecipeIds.includes(recipe.id) : false;
  const isOfflineSaved = recipe ? offlineRecipes.some((item) => item.id === recipe.id) : false;
  const isRecipeAuthor = recipe?.authorId === user?.id;
  const coverImage = recipe?.media.find((item) => item.type === 'image');
  const averageRating = recipe?.averageRating?.toFixed(1) ?? '—';

  useEffect(() => {
    let active = true;
    getRecipe(id, user?.id)
      .then((item) => { if (active) setRecipe(item); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a receita.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user?.id]);

  const restrictionMatches = recipe?.ingredients.filter((recipeIngredient) =>
    hiddenIngredients.some((restrictedIngredient) =>
      recipeIngredient.name.toLocaleLowerCase().includes(restrictedIngredient.toLocaleLowerCase())))
    .map((ingredient) => ingredient.name) ?? [];

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
      const rating = await saveRecipeRating(recipe.id, selectedRating, ratingComment);
      setRecipe((current) => current ? { ...current, ...rating } : current);
      setRatingModalVisible(false);
      setSelectedRating(0);
      setRatingComment('');
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar a avaliação.');
    }
  }

  async function removeMyRating() {
    if (!recipe) return;
    try {
      const result = await deleteRecipeRating(recipe.id);
      setRecipe((current) => current ? { ...current, ...result } : current);
      setFeedbackMessage('Sua avaliação foi excluída.');
      setFeedbackVisible(true);
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível excluir sua avaliação.');
    }
  }

  async function openSubstitutions(ingredient: string) {
    if (!recipe) return;
    setSubstitutionIngredient(ingredient);
    setSubstitutions([]);
    setSubstitutionMessage('');
    setSubstitutionVisible(true);
    setSubstitutionLoading(true);
    try {
      const result = await getIngredientSubstitutions(recipe.id, ingredient);
      setSubstitutions(result.alternatives);
      setSubstitutionMessage(result.message ?? '');
    } catch (actionError) {
      setSubstitutionMessage(actionError instanceof Error ? actionError.message : 'Não foi possível buscar substituições.');
    } finally {
      setSubstitutionLoading(false);
    }
  }

  async function toggleOfflineSave() {
    if (!recipe || !user || savingOffline) return;
    setSavingOffline(true);
    setError('');
    try {
      if (isOfflineSaved) {
        await removeOfflineRecipe(recipe.id);
        setFeedbackMessage('Receita removida do acesso offline.');
      } else {
        await saveRecipeOffline(recipe);
        setFeedbackMessage('Receita salva para acesso offline.');
      }
      setFeedbackVisible(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível atualizar o acesso offline.');
    } finally {
      setSavingOffline(false);
    }
  }

  function openRatingForm() {
    setSelectedRating(recipe?.userReview?.rating ?? 0);
    setRatingComment(recipe?.userReview?.comment ?? '');
    setRatingModalVisible(true);
  }

  async function submitReport() {
    if (!recipe) return;
    try {
      await reportRecipe({ recipeId: recipe.id, targetType: reportTarget, commentId: reportCommentId, reason: selectedReason, details: reportComment });
      setReportVisible(false);
      setReportComment('');
      setFeedbackMessage('Denúncia enviada.');
      setFeedbackVisible(true);
      setError('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível enviar a denúncia.');
    }
  }

  async function addAllIngredients() {
    if (!recipe || addingAllIngredients) return;
    setAddingAllIngredients(true);
    setError('');
    try {
      await addIngredients(recipe.ingredients.map((ingredient) => `${ingredient.quantity} ${ingredient.name}`.trim()));
      setFeedbackMessage('Ingredientes adicionados à lista!');
      setFeedbackVisible(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível adicionar os ingredientes.');
    } finally {
      setAddingAllIngredients(false);
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
            {recipe.offlineCopy ? <Text style={styles.offlineNotice}>Cópia offline: fotos, áudio, vídeos e interações precisam de internet.</Text> : null}
            {restrictionMatches.length > 0
              ? <Text style={styles.restrictionNotice}>Atenção: esta receita contém ingrediente(s) marcados no seu perfil ({restrictionMatches.join(', ')}). Confira rótulos e possíveis contaminações.</Text>
              : null}
            {recipe.tags.length ? <Text style={styles.recipeTags}>{recipe.tags.join(' · ')}</Text> : null}
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
            {tab === 'ingredients' && <Ingredients
              ingredients={recipe.ingredients}
              addingAll={addingAllIngredients}
              onAddAll={() => void addAllIngredients()}
              onSubstitute={(ingredient) => void openSubstitutions(ingredient)}
              onAdd={(ingredient, quantity) => {
                void addIngredient(`${quantity} ${ingredient}`.trim())
                  .then(() => { setFeedbackMessage('Ingrediente adicionado com sucesso!'); setFeedbackVisible(true); })
                  .catch((actionError: unknown) => setError(actionError instanceof Error ? actionError.message : 'Não foi possível adicionar o ingrediente.'));
              }}
            />}
            {tab === 'steps' && <Steps steps={recipe.steps} media={recipe.media} />}
            {tab === 'comments' && <>
              <Reviews reviews={recipe.reviews} userId={user?.id} onDelete={() => void removeMyRating()} />
              <Comments comments={recipe.comments} text={commentText} setText={setCommentText} onAdd={() => void submitComment()} onReport={(commentId) => openReport('comment', commentId)} />
            </>}
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
            <Pressable onPress={() => openReport('recipe')}><Text style={styles.reportLink}>Denunciar receita</Text></Pressable>
            <View style={styles.bottomActions}>{user && !isRecipeAuthor ? <Pressable style={styles.rateButton} onPress={openRatingForm}><Text style={styles.actionText}>{recipe.userReview ? 'Editar avaliação' : 'Avaliar'}</Text></Pressable> : null}<Pressable style={styles.saveButton} onPress={() => setSaveModalVisible(true)}><Text style={styles.saveText}>{isSaved ? 'Salva' : 'Salvar'}</Text></Pressable></View>
            {user ? <Pressable accessibilityRole="button" disabled={savingOffline} style={styles.offlineButton} onPress={() => void toggleOfflineSave()}><Text style={styles.actionText}>{savingOffline ? 'Salvando...' : isOfflineSaved ? 'Remover acesso offline' : 'Salvar para acesso offline'}</Text></Pressable> : null}
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
          <Text style={styles.modalTitleSave}>{recipe.userReview ? 'Edite sua avaliação' : 'Avalie esta receita'}</Text>
          <Text style={styles.ratingHint}>Como foi sua experiência?</Text>
          <View style={styles.starPicker}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} onPress={() => setSelectedRating(star)}><Text style={[styles.ratingStar, star <= selectedRating && styles.ratingStarActive]}>★</Text></Pressable>)}</View>
          <TextInput value={ratingComment} onChangeText={setRatingComment} multiline maxLength={1000} placeholder="Conte sua experiência (opcional)" placeholderTextColor="#99928A" style={styles.reviewInput} />
          <View style={styles.modalActions}><Pressable style={styles.cancelButton} onPress={() => setRatingModalVisible(false)}><Text style={styles.actionText}>Cancelar</Text></Pressable><Pressable disabled={!selectedRating} style={[styles.saveButton, !selectedRating && styles.disabledButton]} onPress={() => void submitRating()}><Text style={styles.saveText}>Enviar</Text></Pressable></View>
        </View></View>
      </Modal>
      <Modal visible={substitutionVisible} transparent animationType="slide" onRequestClose={() => setSubstitutionVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.reportModal}>
          <Text style={styles.modalTitleSave}>Alternativas para {substitutionIngredient}</Text>
          <Text style={styles.ratingHint}>Sugestões aproximadas; podem alterar sabor e textura. A escolha não altera a receita original.</Text>
          {substitutionLoading ? <Text style={styles.commentText}>Buscando alternativas...</Text> : null}
          {!substitutionLoading && substitutions.map((alternative) => (
            <View key={alternative.name} style={styles.substitutionOption}>
              <Text style={styles.substitutionName}>{alternative.name}</Text>
              <Text style={styles.substitutionDetail}>Proporção: {alternative.ratio}</Text>
              <Text style={styles.substitutionDetail}>{alternative.reason}</Text>
            </View>
          ))}
          {!substitutionLoading && substitutionMessage ? <Text style={styles.commentText}>{substitutionMessage}</Text> : null}
          <Text style={styles.safetyNotice}>Em caso de alergia ou intolerância, confirme os ingredientes no rótulo e evite contaminação cruzada. Esta sugestão não é garantia de segurança.</Text>
          <Pressable style={styles.cancelButton} onPress={() => setSubstitutionVisible(false)}><Text style={styles.actionText}>Fechar</Text></Pressable>
        </View></View>
      </Modal>
      {feedbackVisible && <Pressable style={styles.feedbackToast} onPress={() => setFeedbackVisible(false)}><Text style={styles.feedbackIcon}>✓</Text><Text style={styles.feedbackText}>{feedbackMessage}</Text></Pressable>}
    </View>
  );
}

function Ingredients({ ingredients, addingAll, onAdd, onAddAll, onSubstitute }: {
  ingredients: Recipe['ingredients'];
  addingAll: boolean;
  onAdd: (name: string, quantity: string) => void;
  onAddAll: () => void;
  onSubstitute: (name: string) => void;
}) {
  return (
    <View style={styles.tabContent}>
      <Pressable accessibilityRole="button" disabled={addingAll} onPress={onAddAll} style={[styles.addAllButton, addingAll && styles.disabledButton]}>
        <Text style={styles.addAllText}>{addingAll ? 'Adicionando ingredientes...' : 'Adicionar todos à lista de compras'}</Text>
      </Pressable>
      {ingredients.map((ingredient, index) => <View key={`${ingredient.name}-${index}`} style={styles.ingredientRow}><Text style={styles.ingredient}>{ingredient.quantity ? `${ingredient.quantity} ` : ''}{ingredient.name}</Text><View style={styles.ingredientActions}><Pressable onPress={() => onAdd(ingredient.name, ingredient.quantity)}><Text style={styles.addToList}>+ LISTA</Text></Pressable><Pressable onPress={() => onSubstitute(ingredient.name)}><Text style={styles.substituteAction}>TROCAR</Text></Pressable></View></View>)}
    </View>
  );
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

function Reviews({ reviews, userId, onDelete }: { reviews: RecipeReview[]; userId?: string; onDelete: () => void }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Avaliações</Text>
      {reviews.map((review) => (
        <View key={review.userId} style={styles.commentCard}>
          <View style={styles.commentLine}>
            <Text style={styles.commentAuthor}>{review.author}</Text>
            <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}</Text>
          </View>
          {review.comment ? <Text style={styles.commentText}>{review.comment}</Text> : <Text style={styles.commentText}>Sem comentário.</Text>}
          {userId === review.userId ? <Pressable accessibilityRole="button" onPress={onDelete}><Text style={styles.removeReview}>Excluir sua avaliação</Text></Pressable> : null}
        </View>
      ))}
      {reviews.length === 0 ? <Text style={styles.commentText}>Ainda não há avaliações.</Text> : null}
    </View>
  );
}
