import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/components/app-state';
import { AppIcon } from '@/components/app-icon';
import { shoppingStyles as styles } from '@/styles/shopping.styles';

export default function ShoppingListScreen() {
  const { user, shoppingItems, addIngredient, setShoppingItemCompleted, removeShoppingItem } = useAppState();
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState('');

  async function handleAddItem() {
    if (!newItem.trim()) return;
    setError('');
    try {
      await addIngredient(newItem.trim());
      setNewItem('');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Não foi possível adicionar o item.');
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AppIcon name="arrow-left" size={20} color="#1E1E1B" />
          </Pressable>

          <Text style={styles.title}>Lista de compras</Text>
        </View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {!user ? <Pressable onPress={() => router.push('/login')}><Text style={styles.error}>Entre ou crie uma conta para criar e gerenciar sua lista de compras.</Text></Pressable> : null}
          {shoppingItems.map((item) => (
            <View key={item.id} style={styles.item}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                onPress={() => void setShoppingItemCompleted(item.id, !item.completed)}
                style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
                {item.completed ? <AppIcon name="check" size={16} color="#FCFAF5" /> : null}
              </Pressable>

              <Text style={[styles.itemText, item.completed && styles.itemTextCompleted]}>
                {item.name}
              </Text>

              <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${item.name}`} onPress={() => void removeShoppingItem(item.id)}>
                <AppIcon name="x" size={18} color="#807A70" />
              </Pressable>
            </View>
          ))}

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          {user ? <View style={styles.addRow}>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={() => void handleAddItem()}
              placeholder="Adicionar item..."
              placeholderTextColor="#99928A"
              style={styles.addInput}
            />

            <Pressable
              style={styles.addButton}
              onPress={() => void handleAddItem()}
            >
              <AppIcon name="plus" size={22} color="#FCFAF5" />
            </Pressable>
          </View> : null}
        </ScrollView>

        {user ? <Pressable style={styles.exportButton}>
          <AppIcon name="download" size={19} color="#FCFAF5" />
          <Text style={styles.exportText}>Exportar lista</Text>
        </Pressable> : null}

      </SafeAreaView>
    </View>
  );
}
