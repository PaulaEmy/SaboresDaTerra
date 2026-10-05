import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export const confirmationStyles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 64,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: '#F1EADB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  icon: {
    color: Colors.brandGreen,
    fontSize: 35,
  },
  title: {
    color: '#171714',
    fontFamily: Fonts.serif,
    fontSize: 30,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 17,
  },
  description: {
    color: '#706C64',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 17,
    marginTop: 39,
  },
});
