import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

// ESLint 9 flat config (migrated from the legacy .eslintrc.cjs).
export default [
	{
		ignores: ['dist', 'node_modules', 'coverage', 'docs/**'],
	},
	js.configs.recommended,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2024,
			sourceType: 'module',
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			import: importPlugin,
			prettier: prettierPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			// TypeScript handles these; disable the base rules to avoid false positives.
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/consistent-generic-constructors': ['error', 'constructor'],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					disallowTypeAnnotations: true,
					fixStyle: 'inline-type-imports',
				},
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					vars: 'all',
					args: 'after-used',
					ignoreRestSiblings: false,
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
			curly: 'error',
			'no-console': 'off',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'import/no-default-export': 'error',
			'padding-line-between-statements': [
				'error',
				{ blankLine: 'always', prev: 'import', next: '*' },
				{ blankLine: 'any', prev: 'import', next: 'import' },
			],
			'prettier/prettier': 'error',
		},
	},
	prettierConfig,
]
