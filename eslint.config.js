module.exports = [
  {
    rules: {
      "no-plusplus": "off",
      "no-bitwise": "off",
      "consistent-return": "off",
      "jsdoc/require-returns": "off"
    },
    ignores: ["node_modules", "coverage", "dist"]
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: { jest: true }
    },
    settings: {
      "import/resolver": {
        node: { moduleDirectory: ["node_modules", "src"] }
      }
    },
    rules: {
      "require-jsdoc": "off",
      "jsdoc/require-jsdoc": "off",
      "unicorn/prevent-abbreviations": "off"
    }
  },
  {
    files: ["examples/*.js"],
    rules: {
      "no-console": "off",
      "require-jsdoc": "off"
    }
  },
  {
    files: ["**/attributes/stun-*.js"],
    rules: {
      "class-methods-use-this": "off"
    }
  }
];


