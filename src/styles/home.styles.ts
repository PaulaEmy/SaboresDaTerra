import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandGreen,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 42,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 80,
  },
  eyebrow: {
    color: Colors.cream,
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    marginBottom: 24,
  },
  title: {
    color: Colors.cream,
    fontFamily: Fonts.serif,
    fontSize: 44,
    marginBottom: 18,
    textAlign: 'center',
  },
  description: {
    color: Colors.cream,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 26,
  },
  primaryButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.clay,
    borderRadius: 32,
    height: 57,
  },
  primaryButtonLabel: {
    color: Colors.cream,
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
  },
  accountLink: {
    color: Colors.cream,
    fontFamily: Fonts.sans,
    fontSize: 14,
    paddingBottom: 3,
    borderBottomColor: Colors.cream,
    borderBottomWidth: 1,
  },
});
