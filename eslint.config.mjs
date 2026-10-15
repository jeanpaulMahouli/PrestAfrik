import tseslint from "typescript-eslint";

const eslintConfig = tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "src/generated/prisma/**",
      "next-env.d.ts",
      "PrestAfrik maquettes UX UI/**",
    ],
  },
  ...tseslint.configs.recommended,
);

export default eslintConfig;
