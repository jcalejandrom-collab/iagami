import js from '@eslint/js';
import security from 'eslint-plugin-security';
import promise from 'eslint-plugin-promise';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

export default [
  // ── Archivos ignorados ──────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      '**/*.min.js',
      // Subdirectorios con entorno propio (Node.js/Vite/ES modules)
      'sistema-control/**',
      'siga-iagami/**',
      // Scripts de datos/semillas no incluidos en producción
      'cms/seed_comunas.js',
      'cms/db.js',
      // La propia config de ESLint es ES module, no script de browser
      'eslint.config.js',
    ],
  },

  // ── Base recomendada ────────────────────────────────────────────────────────
  js.configs.recommended,
  security.configs.recommended,
  promise.configs['flat/recommended'],
  sonarjs.configs.recommended,

  // ── Configuración principal ─────────────────────────────────────────────────
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',        // Vanilla JS sin módulos ES en producción
      globals: {
        ...globals.browser,        // window, document, fetch, etc.
      },
    },

    rules: {
      // ── Calidad general ────────────────────────────────────────────────────
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'no-var': 'error',

      // ── Seguridad (OWASP) ─────────────────────────────────────────────────
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-non-literal-fs-filename': 'off',  // no aplica en browser

      // ── Promesas ──────────────────────────────────────────────────────────
      'promise/always-return': 'warn',
      'promise/catch-or-return': ['warn', { allowFinally: true }],
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/avoid-new': 'off',          // usamos new Promise() en varios lugares
      'promise/no-nesting': 'warn',

      // ── SonarJS (complejidad y código duplicado) ──────────────────────────
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/prefer-immediate-return': 'warn',
    },
  },

  // ── cms/pb.js: módulo central con patrones avanzados ────────────────────────
  {
    files: ['cms/pb.js'],
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 35],
      'no-console': 'off',
    },
  },

  // ── Módulos que consumen CMSDB/DB como globals de browser ──────────────────
  {
    files: ['planificacion/app.js', 'admin/**/*.js'],
    languageOptions: {
      globals: { CMSDB: 'readonly', DB: 'readonly' },
    },
  },

  // ── cms/animations.js: IIFEs anidadas son el patrón intencional ──────────
  {
    files: ['cms/animations.js'],
    rules: {
      'sonarjs/no-nested-functions': 'off',
    },
  },

  // ── planificacion/db.js: Math.random() como fallback de crypto.randomUUID ─
  {
    files: ['planificacion/db.js'],
    rules: {
      'sonarjs/pseudo-random': 'off',
    },
  },

  // ── cms/config.js: catch vacío intencional (URL validation helper) ─────────
  {
    files: ['cms/config.js'],
    rules: {
      'sonarjs/no-ignored-exceptions': 'off',
    },
  },
];
