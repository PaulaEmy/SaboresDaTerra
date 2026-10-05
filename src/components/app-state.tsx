import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  addRecipeToList as addRecipeToListRequest,
  addShoppingItem as addShoppingItemRequest,
  clearAuthToken,
  createRecipeList as createRecipeListRequest,
  deleteShoppingItem as deleteShoppingItemRequest,
  getCurrentUser,
  getPersonalRecipeState,
  removeRecipeFromList as removeRecipeFromListRequest,
  setRecipeSaved as setRecipeSavedRequest,
  updateShoppingItem as updateShoppingItemRequest,
  type AuthUser,
  type SavedRecipeList,
  type ShoppingListItem,
} from '@/services/auth-api';

type AppStateValue = {
  user: AuthUser | null;
  authLoading: boolean;
  personalDataLoading: boolean;
  personalDataError: string;
  shoppingItems: ShoppingListItem[];
  savedRecipeIds: string[];
  savedLists: SavedRecipeList[];
  addIngredient: (ingredient: string) => Promise<void>;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [personalDataReadyForUser, setPersonalDataReadyForUser] = useState<string | null>(null);
  const [personalDataError, setPersonalDataError] = useState('');
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [savedLists, setSavedLists] = useState<SavedRecipeList[]>([]);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
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
      : Promise.resolve({ savedRecipeIds: [], savedLists: [], shoppingItems: [] });
    state
      .then((data) => {
        if (!active) return;
        setSavedRecipeIds(data.savedRecipeIds);
        setSavedLists(data.savedLists);
        setShoppingItems(data.shoppingItems);
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

  const value = useMemo<AppStateValue>(() => ({
    user,
    authLoading,
    personalDataLoading: Boolean(user && personalDataReadyForUser !== user.id),
    personalDataError,
    shoppingItems,
    savedRecipeIds,
    savedLists,
    addIngredient: async (ingredient) => {
      if (!user) throw new Error('Entre na sua conta para salvar itens na lista de compras.');
      const item = await addShoppingItemRequest(ingredient);
      setShoppingItems((current) => [...current, item]);
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
    setAuthenticatedUser: setUser,
    signOut: async () => {
      await clearAuthToken();
      setUser(null);
      setSavedRecipeIds([]);
      setSavedLists([]);
      setShoppingItems([]);
    },
  }), [authLoading, personalDataError, personalDataReadyForUser, savedLists, savedRecipeIds, shoppingItems, user]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
