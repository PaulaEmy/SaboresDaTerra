import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { appStyles } from '@/styles/app.styles';

type NavItem = {
  label: string;
  icon: string;
  path: '/app-home' | '/search' | '/favorites' | '/profile';
};

const navItems: NavItem[] = [
  { label: 'Início', icon: '⌂', path: '/app-home' },
  { label: 'Busca', icon: '⌕', path: '/search' },
  { label: 'Favoritos', icon: '♡', path: '/favorites' },
  { label: 'Perfil', icon: '♙', path: '/profile' },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <View style={appStyles.bottomNav}>
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Pressable
            key={item.path}
            accessibilityLabel={item.label}
            onPress={() => router.push(item.path)}
            style={appStyles.navItem}>
            <Text style={[appStyles.navIcon, isActive && appStyles.navIconActive]}>{item.icon}</Text>
            <Text style={[appStyles.navLabel, isActive && appStyles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
