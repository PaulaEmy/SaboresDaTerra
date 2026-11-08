import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNetworkState } from 'expo-network';

import {
  addRecipeToList as addRecipeToListRequest,
  addShoppingItem as addShoppingItemRequest,
  addShoppingItems as addShoppingItemsRequest,
  clearAuthToken,
  createRecipeList as createRecipeListRequest,
  deleteShoppingItem as deleteShoppingItemRequest,
  getCurrentUser,
  getPersonalRecipeState,
  getRecipeOnline,
  removeRecipeFromList as removeRecipeFromListRequest,
  setRecipeSaved as setRecipeSavedRequest,
  setHiddenIngredients as setHiddenIngredientsRequest,
  setPreferredTags as setPreferredTagsRequest,
  updateShoppingItem as updateShoppingItemRequest,
  type AuthUser,
  type Recipe,
  type SavedRecipeList,
  type ShoppingListItem,
} from '@/services/auth-api';
import { deleteOfflineRecipe, getOfflineRecipes, saveOfflineRecipe } from '@/services/offline-recipes';

type AppStateValue = {
  user: AuthUser | null;
  authLoading: boolean;
  authError: string;
  personalDataLoading: boolean;
  personalDataError: string;
  offlineSyncError: string;
  isOnline: boolean | null;
  shoppingItems: ShoppingListItem[];
  hiddenIngredients: string[];
  preferredTags: string[];
  offlineRecipes: Recipe[];
  savedRecipeIds: string[];
  savedLists: SavedRecipeList[];
  addIngredient: (ingredient: string) => Promise<void>;
  addIngredients: (ingredients: string[]) => Promise<void>;
  setHiddenIngredients: (ingredients: string[]) => Promise<void>;
  setPreferredTags: (tags: string[]) => Promise<void>;
  saveRecipeOffline: (recipe: Recipe) => Promise<void>;
  removeOfflineRecipe: (recipeId: string) => Promise<void>;
  toggleSavedRecipe: (recipeId: string, saved?: boolean) => Promise<void>;
  createList: (name: string) => Promise<void>;
  saveRecipeToList: (recipeId: string, listId?: string) => Promise<void>;
  removeRecipeFromList: (recipeId: string, listId: string) => Promise<void>;
  setShoppingItemCompleted: (itemId: string, completed: boolean) => Promise<void>;
  removeShoppingItem: (itemId: string) => Promise<void>;
  setAuthenticatedUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const networkState = useNetworkState();
  const isOnline = networkState.isInternetReachable ?? networkState.isConnected ?? null;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [personalDataReadyForUser, setPersonalDataReadyForUser] = useState<string | null>(null);
  const [personalDataError, setPersonalDataError] = useState('');
  const [offlineSyncError, setOfflineSyncError] = useState('');
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [hiddenIngredients, setHiddenIngredientsState] = useState<string[]>([]);
  const [preferredTags, setPreferredTagsState] = useState<string[]>([]);
  const [offlineRecipes, setOfflineRecipes] = useState<Recipe[]>([]);
  const [offlineRecipesOwnerId, setOfflineRecipesOwnerId] = useState<string | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [savedLists, setSavedLists] = useState<SavedRecipeList[]>([]);
  const previousOnline = useRef<boolean | null>(isOnline);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
          setAuthError('');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setUser(null);
          setAuthError(error instanceof Error ? error.message : 'Não foi possível restaurar sua sessão.');
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const state = user
      ? getPersonalRecipeState()
      : Promise.resolve({ savedRecipeIds: [], savedLists: [], shoppingItems: [], hiddenIngredients: [], preferredTags: [] });
    state
      .then((data) => {
        if (!active) return;
        setSavedRecipeIds(data.savedRecipeIds);
        setSavedLists(data.savedLists);
        setShoppingItems(data.shoppingItems);
        setHiddenIngredientsState(data.hiddenIngredients);
        setPreferredTagsState(data.preferredTags);
        setPersonalDataError('');
        setPersonalDataReadyForUser(user?.id ?? null);
      })
      .catch((error: unknown) => {
        if (active) {
          setPersonalDataError(error instanceof Error ? error.message : 'Não foi possível carregar seus dados.');
          setPersonalDataReadyForUser(user?.id ?? null);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    getOfflineRecipes(user.id)
      .then((recipes) => {
        if (active) {
          setOfflineRecipes(recipes);
          setOfflineRecipesOwnerId(user.id);
          setOfflineSyncError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setOfflineSyncError(error instanceof Error ? error.message : 'Não foi possível carregar as receitas offline.');
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const shouldRefresh = isOnline === true && previousOnline.current !== true;
    previousOnline.current = isOnline;
    if (!shouldRefresh || !user) return;
    let active = true;
    (async () => {
      try {
        const cachedRecipes = await getOfflineRecipes(user.id);
        const refreshedRecipes = await Promise.all(cachedRecipes.map((recipe) => getRecipeOnline(recipe.id)));
        const storedRecipes = await Promise.all(refreshedRecipes.map((recipe) => saveOfflineRecipe(user.id, recipe)));
        if (active) {
          setOfflineRecipes(storedRecipes);
          setOfflineSyncError('');
        }
      } catch (error) {
        if (active) setOfflineSyncError(error instanceof Error ? error.message : 'Não foi possível sincronizar as receitas offline.');
      }
    })();
    return () => { active = false; };
  }, [isOnline, user]);

  const value = useMemo<AppStateValue>(() => ({
    user,
    authLoading,
    authError,
    personalDataLoading: Boolean(user && personalDataReadyForUser !== user.id),
    personalDataError,
    offlineSyncError,
    isOnline,
    shoppingItems,
    hiddenIngredients,
    preferredTags,
    offlineRecipes: offlineRecipesOwnerId === user?.id ? offlineRecipes : [],
    savedRecipeIds,
    savedLists,
    addIngredient: async (ingredient) => {
      if (!user) throw new Error('Entre na sua conta para salvar itens na lista de compras.');
      const item = await addShoppingItemRequest(ingredient);
      setShoppingItems((current) => [...current, item]);
    },
    addIngredients: async (ingredients) => {
      if (!user) throw new Error('Entre na sua conta para salvar itens na lista de compras.');
      const items = await addShoppingItemsRequest(ingredients);
      setShoppingItems((current) => [...current, ...items]);
    },
    setHiddenIngredients: async (ingredients) => {
      if (!user) throw new Error('Entre na sua conta para configurar suas restrições alimentares.');
      const savedIngredients = await setHiddenIngredientsRequest(ingredients);
      setHiddenIngredientsState(savedIngredients);
    },
    setPreferredTags: async (tags) => {
      if (!user) throw new Error('Entre na sua conta para configurar suas preferências.');
      const savedTags = await setPreferredTagsRequest(tags);
      setPreferredTagsState(savedTags);
    },
    saveRecipeOffline: async (recipe) => {
      if (!user) throw new Error('Entre na sua conta para salvar receitas offline.');
      const savedRecipe = await saveOfflineRecipe(user.id, recipe);
      setOfflineRecipes((current) => [
        ...current.filter((item) => item.id !== savedRecipe.id),
        savedRecipe,
      ]);
      setOfflineRecipesOwnerId(user.id);
    },
    removeOfflineRecipe: async (recipeId) => {
      if (!user) throw new Error('Entre na sua conta para gerenciar receitas offline.');
      await deleteOfflineRecipe(user.id, recipeId);
      setOfflineRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
    },
    toggleSavedRecipe: async (recipeId, saved) => {
      if (!user) throw new Error('Entre na sua conta para salvar receitas.');
      const shouldSave = saved ?? !savedRecipeIds.includes(recipeId);
      await setRecipeSavedRequest(recipeId, shouldSave);
      setSavedRecipeIds((current) => shouldSave
        ? current.includes(recipeId) ? current : [...current, recipeId]
        : current.filter((id) => id !== recipeId));
    },
    createList: async (name) => {
      if (!user) throw new Error('Entre na sua conta para criar listas.');
      const list = await createRecipeListRequest(name);
      setSavedLists((current) => [...current, list]);
    },
    saveRecipeToList: async (recipeId, listId) => {
      if (!user) throw new Error('Entre na sua conta para salvar receitas em listas.');
      if (!listId) return;
      await addRecipeToListRequest(listId, recipeId);
      setSavedLists((current) => current.map((list) => list.id === listId
        ? { ...list, recipeIds: list.recipeIds.includes(recipeId) ? list.recipeIds : [...list.recipeIds, recipeId] }
        : list));
    },
    removeRecipeFromList: async (recipeId, listId) => {
      await removeRecipeFromListRequest(listId, recipeId);
      setSavedLists((current) => current.map((list) => list.id === listId
        ? { ...list, recipeIds: list.recipeIds.filter((id) => id !== recipeId) }
        : list));
    },
    setShoppingItemCompleted: async (itemId, completed) => {
      await updateShoppingItemRequest(itemId, completed);
      setShoppingItems((current) => current.map((item) => item.id === itemId ? { ...item, completed } : item));
    },
    removeShoppingItem: async (itemId) => {
      await deleteShoppingItemRequest(itemId);
      setShoppingItems((current) => current.filter((item) => item.id !== itemId));
    },
    setAuthenticatedUser: (authenticatedUser) => {
      setAuthError('');
      setUser(authenticatedUser);
    },
    signOut: async () => {
      await clearAuthToken();
      setUser(null);
      setSavedRecipeIds([]);
      setSavedLists([]);
      setShoppingItems([]);
      setHiddenIngredientsState([]);
      setPreferredTagsState([]);
      setOfflineRecipes([]);
      setOfflineRecipesOwnerId(null);
      setAuthError('');
    },
  }), [authError, authLoading, hiddenIngredients, isOnline, offlineRecipes, offlineRecipesOwnerId, offlineSyncError, personalDataError, personalDataReadyForUser, preferredTags, savedLists, savedRecipeIds, shoppingItems, user]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
