import { Image, ImageStyle } from 'expo-image';

const logoSource = require('@/assets/images/tekuna-logo.png');

interface TekunaLogoProps {
  /** Width of the logo — height scales proportionally (image is ~1:1 ratio) */
  width?: number;
  style?: ImageStyle;
}

export function TekunaLogo({ width = 260, style }: TekunaLogoProps) {
  // The original image is roughly square; the logo content inside is wider than tall
  const height = width * 0.65;

  return (
    <Image
      source={logoSource}
      style={[
        {
          width,
          height,
        },
        style,
      ]}
      contentFit="contain"
      transition={300}
    />
  );
}
