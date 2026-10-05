import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export const shoppingStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  safeArea: { flex: 1 },
  header: { height: 69, paddingHorizontal: 18, borderBottomColor: '#E8E1D2', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 24, backgroundColor: '#F1EADB', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#1E1E1B', fontSize: 28, lineHeight: 30, marginTop: -3 },
  title: { color: '#181816', fontFamily: Fonts.serif, fontSize: 24, fontStyle: 'italic' },
  content: { padding: 30, gap: 24 },
  item: { height: 70, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderColor: '#EDE5D7', borderWidth: 1, borderRadius: 36, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#BDAF96', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  checkbox: { width: 30, height: 30, borderRadius: 16, borderColor: '#D8D1C3', borderWidth: 1 },
  checkboxCompleted: { backgroundColor: Colors.brandGreen, borderColor: Colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { color: Colors.cream, fontSize: 17, fontWeight: '700' },
  itemText: { flex: 1, color: '#181816', fontFamily: Fonts.sans, fontSize: 16 },
  itemTextCompleted: { color: '#807A70', textDecorationLine: 'line-through' },
  remove: { color: '#807A70', fontSize: 24 },
  error: { color: '#A33228', fontFamily: Fonts.sans, fontSize: 14 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addInput: { flex: 1, height: 61, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderColor: '#EDE5D7', borderWidth: 1, borderRadius: 32, color: '#181816', fontFamily: Fonts.sans, fontSize: 16 },
  addButton: { width: 61, height: 61, borderRadius: 32, backgroundColor: Colors.clay, alignItems: 'center', justifyContent: 'center' },
  addIcon: { color: Colors.cream, fontSize: 32, fontWeight: '300' },
  exportButton: { position: 'absolute', left: 37, right: 37, bottom: 24, height: 70, borderRadius: 36, backgroundColor: Colors.brandGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  exportIcon: { color: Colors.cream, fontSize: 22 },
  exportText: { color: Colors.cream, fontFamily: Fonts.sans, fontSize: 18, fontWeight: '700' },
});
