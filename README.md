---

-   Install Dev Dependencies for automatic class to className. And Other Hygiene factor

```bash
npm install --save-dev eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

```json
    "devDependencies": {
        "eslint": "^8",
        "eslint-config-next": "14.1.0",
        "eslint-plugin-react": "^7.33.2",
        "eslint-plugin-react-hooks": "^4.6.0",
        "eslint-plugin-react-refresh": "^0.4.5"
    }
```

-   If You Prefer liniting (We Are Using AirBnb Linting Rules)
-   Create a `.eslintrc.cjs` file in the project root and enter the below contents:

```js
module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: ["next/core-web-vitals", "eslint:recommended", "plugin:react/recommended", "plugin:react/jsx-runtime"],
    ignorePatterns: ["dist", ".eslintrc.cjs"],
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    settings: { react: { version: "18.2" } },
    plugins: ["react-refresh"],
    rules: {
        "react/prop-types": "off",
        "react/jsx-no-target-blank": "off",
        "react-refresh/only-export-components": ["off", { allowConstantExport: true }],
    },
};
```

`.vscode/settings.json`

```json
{
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit",
        "source.fixAll.tslint": "explicit",
        "source.organizeImports": "explicit"
    },
    "eslint.run": "onSave",
    "emmet.includeLanguages": {
        "javascript": "javascriptreact"
    },
    "path-autocomplete.extensionOnImport": true,
    "path-autocomplete.excludedItems": {
        "*/.js": {
            "when": "**"
        },
        "*/.jsx": {
            "when": "**"
        }
    },
    "javascript.validate.enable": false,
    "typescript.validate.enable": false,

    // extra
    "editor.fontFamily": "Fira Code, Operator Mono",
    "editor.cursorSmoothCaretAnimation": "on",
    "editor.cursorBlinking": "expand",
    "editor.cursorStyle": "line",
    "editor.cursorWidth": 2,
    "editor.fontLigatures": true,
    "editor.fontSize": 16.5,
    "editor.lineHeight": 24,
    "editor.detectIndentation": true,
    "editor.wordWrap": "on",

    // terminal
    "terminal.integrated.fontFamily": "Fira Code, Operator Mono",
    "terminal.integrated.fontSize": 15,

    // file exclude for run node js project in smooth position
    "files.exclude": {
        "**/.git": true,
        "**/.svn": true,
        "**/.hg": true,
        "**/CVS": true,
        "**/.DS_Store": true,
        "**/Thumbs.db": true,
        "**/tmp": true,
        "**/node_modules": true,
        "**/dist": true
    }
}
```
