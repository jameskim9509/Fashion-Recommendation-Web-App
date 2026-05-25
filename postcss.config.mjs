/**
 * PostCSS Configuration
 *
 * Next.js의 빌드 파이프라인이 이 파일을 읽어 Tailwind CSS v4를 처리한다.
 * Vite 빌드(@tailwindcss/vite)는 이 설정을 사용하지 않는다.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
