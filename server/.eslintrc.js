module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'unused-imports',
  ],
  rules: {
    // Enforce no unused variables
    '@typescript-eslint/no-unused-vars': 'off', // turned off in favor of unused-imports/no-unused-vars
    'unused-imports/no-unused-vars': [
      'error',
      { 
        vars: 'all', 
        varsIgnorePattern: '^_', 
        args: 'after-used', 
        argsIgnorePattern: '^_' 
      }
    ],
    
    // Enforce no unused imports
    'unused-imports/no-unused-imports': 'error',
    
    // Additional rules for code quality - set to warn instead of error for now
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-empty-interface': 'warn',
    
    // Enforce consistent code style - all set to warn for now
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'default',
        format: ['camelCase'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'memberLike',
        modifiers: ['private'],
        format: ['camelCase'],
        leadingUnderscore: 'require',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
      // Allow UPPER_CASE for object literal properties (constants)
      {
        selector: 'objectLiteralProperty',
        format: ['camelCase', 'UPPER_CASE'],
      },
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'jest.config.js', '*.js'],
};
