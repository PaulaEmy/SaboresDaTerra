import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/components/app-state';
import { homeStyles } from '@/styles/home.styles';

export default function HomeScreen() {
  const { signOut } = useAppState();
  const [error, setError] = useState('');

  async function continueAsVisitor() {
    try {
      await signOut();
      router.replace('/app-home');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Não foi possível iniciar como visitante.');
    }
  }

  return (
    <View style={homeStyles.container}>
      <SafeAreaView style={homeStyles.safeArea}>
        <View style={homeStyles.content}>
          <Text style={homeStyles.eyebrow}>CULINÁRIA CONSCIENTE</Text>
          <Text style={homeStyles.title}>Sabores da Terra</Text>
          <Text style={homeStyles.description}>
            Receitas de estação, feitas com{ '\n' }ingredientes que vêm da horta e da{ '\n' }memória.
          </Text>
        </View>

        <View style={homeStyles.actions}>
          <Pressable style={homeStyles.primaryButton} onPress={() => router.push('/login')}>
            <Text style={homeStyles.primaryButtonLabel}>ENTRAR</Text>
          </Pressable>
          <Pressable onPress={() => void continueAsVisitor()}>
            <Text style={homeStyles.accountLink}>Continuar como visitante</Text>
          </Pressable>
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
