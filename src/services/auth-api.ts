import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'sabores-da-terra-auth-token';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type UserRecipe = {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  servings: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  ingredients: { name: string; quantity: string }[];
  steps: string[];
  media: RecipeMedia[];
  createdAt: string;
};

export type RecipeComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

export type RecipeMedia = {
  id: string;
  type: 'image' | 'audio' | 'video';
  mimeType: string;
  fileSize: number;
  url: string;
};

export type Recipe = UserRecipe & {
  author: string;
  authorId: string;
  comments: RecipeComment[];
  averageRating: number | null;
  ratingCount: number;
};

export type RecipeSummary = Pick<UserRecipe, 'id' | 'title' | 'description' | 'prepTimeMinutes' | 'servings' | 'difficulty'> & {
  author: string;
  imageUrl: string | null;
  averageRating: number | null;
  ratingCount: number;
};

export type SavedRecipeList = { id: string; name: string; recipeIds: string[] };
export type ShoppingListItem = { id: string; name: string; completed: boolean };
export type PersonalRecipeState = {
  savedRecipeIds: string[];
  savedLists: SavedRecipeList[];
  shoppingItems: ShoppingListItem[];
};

export type RecipeMediaUpload = {
  uri: string;
  name: string;
  type: string;
  file?: Blob | null;
};

async function request<T>(path: string, body: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira a URL da API e tente novamente.');
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? result.message ?? 'Não foi possível concluir a solicitação.');
  return result as T;
}

async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

async function getToken() {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function clearAuthToken() {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function register(name: string, email: string, password: string) {
  return request<{ message: string }>('/api/auth/register', { name, email, password });
}

export async function login(email: string, password: string) {
  const result = await request<LoginResponse>('/api/auth/login', { email, password });
  await storeToken(result.token);
  return result.user;
}

export async function getCurrentUser() {
  const token = await getToken();
  if (!token) return null;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor para validar sua sessão.');
  }

  if (response.status === 401) {
    await clearAuthToken();
    return null;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível validar sua sessão.');
  return result.user as AuthUser;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const token = await getToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira a URL da API e tente novamente.');
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível alterar a senha.');
  return result as { message: string };
}

async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const token = await getToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');

  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira a URL da API e tente novamente.');
  }
}

export async function listMyRecipes() {
  const response = await authenticatedFetch('/api/recipes/mine');
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível carregar suas receitas.');
  return result.recipes as UserRecipe[];
}

export type RecipeInput = {
  title: string;
  description: string;
  prepTimeMinutes: number;
  servings: number;
  difficulty: UserRecipe['difficulty'];
  ingredients: { name: string; quantity: string }[];
  steps: string[];
};

export async function createRecipe(input: RecipeInput) {
  const response = await authenticatedFetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível salvar a receita.');
  return result as { id: string };
}

export async function updateRecipe(recipeId: string, input: RecipeInput) {
  const response = await authenticatedFetch(`/api/recipes/${encodeURIComponent(recipeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível atualizar a receita.');
}

export async function deleteRecipe(recipeId: string) {
  const response = await authenticatedFetch(`/api/recipes/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível excluir a receita.');
}

export async function uploadRecipeMedia(recipeId: string, media: { image?: RecipeMediaUpload; audio?: RecipeMediaUpload; video?: RecipeMediaUpload }) {
  for (const field of ['image', 'audio', 'video'] as const) {
    const asset = media[field];
    if (!asset) continue;
    if (Platform.OS === 'web') {
      const form = new FormData();
      if (asset.file) {
        form.append(field, asset.file, asset.name);
      } else {
        const fileResponse = await fetch(asset.uri);
        if (!fileResponse.ok) throw new Error(`Não foi possível ler o arquivo de ${field}.`);
        const file = await fileResponse.blob();
        form.append(field, file, asset.name);
      }
      const response = await authenticatedFetch(`/api/recipes/${recipeId}/media`, { method: 'POST', body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Não foi possível enviar o arquivo de ${field}.`);
      continue;
    }

    const token = await getToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    let uploadResponse: FileSystem.FileSystemUploadResult;
    try {
      uploadResponse = await FileSystem.uploadAsync(`${API_URL}/api/recipes/${recipeId}/media`, asset.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: field,
        mimeType: asset.type,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (uploadError) {
      const reason = uploadError instanceof Error ? uploadError.message : String(uploadError);
      throw new Error(`Não foi possível enviar o arquivo de ${field} para ${API_URL}: ${reason}`);
    }
    const result = JSON.parse(uploadResponse.body || '{}');
    if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
      throw new Error(result.error ?? `Não foi possível enviar o arquivo de ${field}.`);
    }
  }
  return { message: 'Mídia anexada à receita.' };
}

export async function resendVerification(email: string) {
  return request<{ message: string }>('/api/auth/resend-verification', { email });
}

export async function listRecipes() {
  return searchRecipes({});
}

export async function searchRecipes(filters: { query?: string; maxTime?: number; difficulty?: string }) {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set('q', filters.query.trim());
  if (filters.maxTime) params.set('maxTime', String(filters.maxTime));
  if (filters.difficulty && filters.difficulty !== 'Qualquer') params.set('difficulty', filters.difficulty);
  const query = params.toString();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/recipes${query ? `?${query}` : ''}`);
  } catch {
    throw new Error('Não foi possível conectar ao servidor para carregar receitas.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível carregar as receitas.');
  return result.recipes as RecipeSummary[];
}

export async function getRecipe(recipeId: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/recipes/${encodeURIComponent(recipeId)}`);
  } catch {
    throw new Error('Não foi possível conectar ao servidor para carregar a receita.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível carregar a receita.');
  return result.recipe as Recipe;
}

export async function addRecipeComment(recipeId: string, text: string) {
  const response = await authenticatedFetch(`/api/recipes/${encodeURIComponent(recipeId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível enviar o comentário.');
  return result.comment as RecipeComment;
}

export async function saveRecipeRating(recipeId: string, rating: number) {
  const response = await authenticatedFetch(`/api/recipes/${encodeURIComponent(recipeId)}/rating`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível salvar a avaliação.');
  return result as { averageRating: number | null; ratingCount: number };
}

export async function getPersonalRecipeState() {
  const response = await authenticatedFetch('/api/me/state');
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível carregar seus dados.');
  return result as PersonalRecipeState;
}

export async function setRecipeSaved(recipeId: string, saved: boolean) {
  const response = await authenticatedFetch(`/api/me/saved-recipes/${encodeURIComponent(recipeId)}`, { method: saved ? 'POST' : 'DELETE' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'Não foi possível atualizar os favoritos.');
  }
}

export async function createRecipeList(name: string) {
  const response = await authenticatedFetch('/api/me/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível criar a lista.');
  return result as SavedRecipeList;
}

export async function addRecipeToList(listId: string, recipeId: string) {
  const response = await authenticatedFetch(`/api/me/lists/${encodeURIComponent(listId)}/recipes/${encodeURIComponent(recipeId)}`, { method: 'POST' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'Não foi possível salvar a receita na lista.');
  }
}

export async function removeRecipeFromList(listId: string, recipeId: string) {
  const response = await authenticatedFetch(`/api/me/lists/${encodeURIComponent(listId)}/recipes/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'Não foi possível remover a receita da lista.');
  }
}

export async function addShoppingItem(name: string) {
  const response = await authenticatedFetch('/api/me/shopping-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível adicionar o item.');
  return result.item as ShoppingListItem;
}

export async function updateShoppingItem(id: string, completed: boolean) {
  const response = await authenticatedFetch(`/api/me/shopping-items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'Não foi possível atualizar o item.');
  }
}

export async function deleteShoppingItem(id: string) {
  const response = await authenticatedFetch(`/api/me/shopping-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'Não foi possível remover o item.');
  }
}

export async function reportRecipe(input: {
  recipeId: string;
  targetType: 'recipe' | 'comment';
  commentId?: string;
  reason: string;
  details: string;
}) {
  const response = await authenticatedFetch(`/api/recipes/${encodeURIComponent(input.recipeId)}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType: input.targetType,
      commentId: input.commentId,
      reason: input.reason,
      details: input.details,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Não foi possível enviar a denúncia.');
  return result as { message: string };
}

export function getRecipeMediaUrl(path: string) {
  return `${API_URL}${path}`;
}