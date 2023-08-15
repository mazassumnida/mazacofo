module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "plugin:import/recommended",
    "airbnb-base",
    "airbnb-typescript/base",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.js"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json"],
  },
  ignorePatterns: ["node_modules/", "dist/"],
  rules: {
    "@typescript-eslint/quotes": "off",
    "operator-linebreak": "off",
    "import/prefer-default-export": "off",
  },
};
