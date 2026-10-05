import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { useAppState } from '@/components/app-state';
import { profileStyles as styles } from '@/styles/profile.styles';

const menuItems = ['Minhas receitas', 'Salvas', 'Histórico', 'Ajuda'];

export default function ProfileScreen() {
  const { user, signOut } = useAppState();

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  const displayName = user?.name ?? 'Visitante';

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.trim().charAt(0).toUpperCase() || '?'}</Text></View>
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{user?.email ?? ''}</Text>
            </View>
          </View>
          {menuItems.map((item) => (
            <Pressable key={item} style={styles.menuItem} onPress={item === 'Minhas receitas' ? () => router.push('/my-recipes') : undefined}>
              <Text style={styles.menuText}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Pressable style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Text style={styles.menuText}>Configurações</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.logout} onPress={handleSignOut}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <AppBottomNav />
    </View>
  );
}
