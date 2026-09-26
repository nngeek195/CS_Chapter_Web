declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: {
    src: string;
    height?: number;
    width?: number;
    blurDataURL?: string;
  };
  export default content;
}

declare module '*.jpg' {
  const content: {
    src: string;
    height?: number;
    width?: number;
    blurDataURL?: string;
  };
  export default content;
}

declare module '*.jpeg' {
  const content: {
    src: string;
    height?: number;
    width?: number;
    blurDataURL?: string;
  };
  export default content;
}

declare module '*.svg' {
  const content: any;
  export default content;
}

declare module '*.webp' {
  const content: {
    src: string;
    height?: number;
    width?: number;
    blurDataURL?: string;
  };
  export default content;
}

declare module '@designcodeio/threeui' {
  import React from 'react';
  export const ConstellationField: React.ComponentType<any>;
  export const WaterHeroOrb: React.ComponentType<any>;
  const content: any;
  export default content;
}
