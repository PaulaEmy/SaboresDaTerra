import { StyleSheet } from 'react-native';

import { Fonts } from '@/constants/theme';

export const signupStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop: 32,
  },
  title: {
    color: '#171714',
    fontFamily: Fonts.serif,
    fontSize: 30,
    fontStyle: 'italic',
    marginBottom: 41,
  },
  form: {
    gap: 24,
  },
});
