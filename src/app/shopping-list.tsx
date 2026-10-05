import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/components/app-state';
import { shoppingStyles as styles } from '@/styles/shopping.styles';

export default function ShoppingListScreen() {
  const { shoppingItems, addIngredient, setShoppingItemCompleted, removeShoppingItem } = useAppState();
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
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>

          <Text style={styles.title}>Lista de compras</Text>
        </View>

        <View style={styles.content}>
          {shoppingItems.map((item) => (
            <View key={item.id} style={styles.item}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                onPress={() => void setShoppingItemCompleted(item.id, !item.completed)}
                style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
                {item.completed ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </Pressable>

              <Text style={[styles.itemText, item.completed && styles.itemTextCompleted]}>
                {item.name}
              </Text>

              <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${item.name}`} onPress={() => void removeShoppingItem(item.id)}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <View style={styles.addRow}>
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
              <Text style={styles.addIcon}>+</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.exportButton}>
          <Text style={styles.exportIcon}>⇩</Text>
          <Text style={styles.exportText}>Exportar lista</Text>
        </Pressable>

      </SafeAreaView>
    </View>
  );
}
