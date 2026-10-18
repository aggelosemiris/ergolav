import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    // Playwright fixtures call a `use` callback that is not a React hook
    files: ['e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts', 'replica/**'],
  },
];

export default config;
