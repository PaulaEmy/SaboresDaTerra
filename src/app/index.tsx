import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { homeStyles } from '@/styles/home.styles';

export default function HomeScreen() {
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
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={homeStyles.accountLink}>Continuar sem uma conta</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

