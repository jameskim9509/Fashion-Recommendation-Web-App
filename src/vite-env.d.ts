/// <reference types="vite/client" />

/**
 * Figma Make export로 생성된 코드에서 사용하는 가상 모듈 prefix.
 * vite.config.ts의 figmaAssetResolver 플러그인이 `src/assets/<filename>`로
 * 변환합니다. 예: `import hero from 'figma:asset/hero.png'`
 */
declare module 'figma:asset/*' {
  const src: string;
  export default src;
}
