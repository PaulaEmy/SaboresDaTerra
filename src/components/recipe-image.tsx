import { useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

import { AppIcon } from '@/components/app-icon';

type RecipeImageProps = {
  uri: string;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
};

export function RecipeImage({ uri, style, iconSize = 30 }: RecipeImageProps) {
  const [unavailable, setUnavailable] = useState(false);

  if (unavailable) {
    return (
      <View style={[style, { backgroundColor: '#F1EADB', alignItems: 'center', justifyContent: 'center' }]}>
        <AppIcon name="chef-hat" size={iconSize} color="#AAA391" />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setUnavailable(true)} />;
}
