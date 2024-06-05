export default {
	root: true,
	env: {
		browser: true,
		node: true,
	},
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	extends: [
		'eslint:recommended',
		'plugin:vue/vue3-recommended',
		'@vue/typescript/recommended',
		'prettier',
	],
	plugins: ['@typescript-eslint', 'eslint-plugin-prettier'],
	rules: {
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'sort-imports': 'off',
	},
	ignorePatterns: ['**/node_modules/**', '**/*.cjs'],
	ignore: ['.vscode', 'dist', 'coverage', 'node', 'test/*.js'],
}
