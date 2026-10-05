import { StyleSheet } from 'react-native';

import { Fonts } from '@/constants/theme';

export const loginStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 27,
    paddingTop: 34,
    gap: 25,
  },
  title: {
    color: '#171714',
    fontFamily: Fonts.serif,
    fontSize: 30,
    fontStyle: 'italic',
    marginBottom: 40,
  },
  form: {
    gap: 25,
  },
});
