import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Colors } from '@/constants/theme';
import { appStyles } from '@/styles/app.styles';

type NavItem = {
  label: string;
  icon: 'home' | 'search' | 'bookmark' | 'user';
  path: '/app-home' | '/search' | '/favorites' | '/profile';
};

const navItems: NavItem[] = [
  { label: 'Início', icon: 'home', path: '/app-home' },
  { label: 'Busca', icon: 'search', path: '/search' },
  { label: 'Favoritos', icon: 'bookmark', path: '/favorites' },
  { label: 'Perfil', icon: 'user', path: '/profile' },
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
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => router.push(item.path)}
            style={[appStyles.navItem, isActive && appStyles.navItemActive]}>
            <AppIcon name={item.icon} size={21} color={isActive ? Colors.brandGreen : '#7F7A71'} strokeWidth={isActive ? 2.4 : 1.9} />
            <Text style={[appStyles.navLabel, isActive && appStyles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
