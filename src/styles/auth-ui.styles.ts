import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export const authUiStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    height: 69,
    paddingHorizontal: 18,
    borderBottomColor: '#E8E1D2',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    backgroundColor: '#F1EADB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#1E1E1B',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -3,
  },
  headerTitle: {
    color: '#181816',
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontStyle: 'italic',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: '#706C64',
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  input: {
    height: 55,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE5D7',
    borderWidth: 1,
    paddingHorizontal: 16,
    color: '#24231F',
    fontFamily: Fonts.sans,
    fontSize: 14,
    shadowColor: '#BDAF96',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 2,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithToggle: {
    paddingRight: 92,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: Colors.brandGreen,
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: Colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    color: Colors.cream,
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  inlineLinkPressable: {
    alignSelf: 'center',
  },
  inlineLink: {
    color: Colors.clay,
    fontFamily: Fonts.sans,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2B09C',
    paddingBottom: 3,
  },
  inlineLinkLight: {
    color: Colors.cream,
    borderBottomColor: Colors.cream,
  },
  pressed: {
    opacity: 0.8,
  },
});
