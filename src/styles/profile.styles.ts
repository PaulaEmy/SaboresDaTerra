import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export const profileStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  safeArea: { flex: 1 },
  content: { padding: 33, paddingBottom: 110 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 38 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1EADB', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.brandGreen, fontFamily: Fonts.serif, fontSize: 30 },
  name: { color: '#181816', fontFamily: Fonts.serif, fontSize: 30, fontStyle: 'italic' },
  email: { color: '#756F65', fontFamily: Fonts.sans, fontSize: 16, marginTop: 3 },
  menuItem: { height: 66, borderRadius: 34, backgroundColor: '#FFFFFF', borderColor: '#EDE5D7', borderWidth: 1, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, shadowColor: '#BDAF96', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  menuText: { color: '#181816', fontFamily: Fonts.sans, fontSize: 17 },
  chevron: { color: '#7E786F', fontSize: 26 },
  settingsContent: { padding: 28, gap: 18 },
  settingsTitle: { color: '#181816', fontFamily: Fonts.serif, fontSize: 27, fontStyle: 'italic' },
  settingsDescription: { color: '#756F65', fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, marginBottom: 8 },
  errorText: { color: '#A33228', fontFamily: Fonts.sans, fontSize: 14 },
  successText: { color: Colors.brandGreen, fontFamily: Fonts.sans, fontSize: 14 },
  logout: { height: 65, borderRadius: 34, backgroundColor: '#F7E5DC', alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  logoutText: { color: Colors.clay, fontFamily: Fonts.sans, fontSize: 17, fontWeight: '700' },
});
