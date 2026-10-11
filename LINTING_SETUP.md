# Linting and Code Quality Setup

## Current Status

**TypeScript Version**: 7.0.2  
**Issue**: `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` do not yet support TypeScript 7.0  
**Tracking**: https://github.com/typescript-eslint/typescript-eslint/issues/10940

## Workaround Strategy

Due to the incompatibility between TypeScript 7.0 and typescript-eslint, we're using a hybrid approach:

### 1. TypeScript Compiler for Type Checking

The TypeScript compiler itself provides excellent linting capabilities through strict mode:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Run with**: `npm run typecheck`

This catches:
- Type errors
- Unused variables
- Implicit any types
- Null/undefined issues
- Missing return statements
- Switch statement fallthrough

### 2. Prettier for Code Formatting

Prettier ensures consistent code style:

```bash
npm run format       # Format all files
npm run format:check # Check formatting without changing
```

### 3. Pre-commit Hooks

Husky + lint-staged runs checks before commit:

```bash
# .husky/pre-commit
npx lint-staged
npm run typecheck
```

```json
// package.json lint-staged
{
  "lint-staged": {
    "src/**/*.ts": [
      "prettier --write"
    ]
  }
}
```

## When TypeScript-ESLint Supports TS 7.x

Once typescript-eslint adds support for TypeScript 7, we can uncomment the full ESLint configuration:

1. Install updated packages:
   ```bash
   npm install --save-dev @typescript-eslint/parser@latest @typescript-eslint/eslint-plugin@latest
   ```

2. Update `eslint.config.js` to use TypeScript-specific rules

3. Enable the full lint script:
   ```bash
   npm run lint
   npm run lint:fix
   ```

## Manual Code Quality Checks

Until ESLint works, developers should manually check for:

### Security Issues
- ✓ No `eval()` or `new Function()`
- ✓ No SQL string concatenation
- ✓ No innerHTML with user input
- ✓ All user input sanitized
- ✓ No secrets in code

### Code Quality
- ✓ Use `const` over `let` when possible
- ✓ No `var` declarations
- ✓ Use optional chaining (`?.`) and nullish coalescing (`??`)
- ✓ Proper error handling (try-catch for async operations)
- ✓ No console.log in production code (use console.warn/console.error)

### Async/Await
- ✓ Always await promises
- ✓ Use try-catch with await
- ✓ No floating promises (unhandled rejections)

## IDE Integration

### VS Code

Install extensions:
- **TypeScript Vue Plugin** (TypeScript 7 support)
- **Prettier - Code formatter**
- **Error Lens** (inline errors)

Enable in settings.json:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run typecheck` | Run TypeScript compiler checks |
| `npm run compile` | Compile TypeScript to JavaScript |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

## Future Enhancement

When ESLint support is available, the following rules will be enabled:

### TypeScript Rules
- `@typescript-eslint/no-explicit-any` - Warn on `any` usage
- `@typescript-eslint/no-unused-vars` - Error on unused variables
- `@typescript-eslint/no-floating-promises` - Error on unhandled promises
- `@typescript-eslint/await-thenable` - Error on awaiting non-promises
- `@typescript-eslint/no-misused-promises` - Error on promise misuse

### Security Rules
- `security/detect-object-injection` - Warn on dynamic object access
- `security/detect-unsafe-regex` - Error on ReDoS-vulnerable regexes
- `security/detect-eval-with-expression` - Error on eval usage
- `security/detect-possible-timing-attacks` - Warn on timing attack vectors

### Code Quality Rules
- `no-console` - Warn on console.log (allow warn/error)
- `no-debugger` - Error on debugger statements
- `prefer-const` - Error when let could be const
- `eqeqeq` - Error on == (require ===)
- `curly` - Error on missing braces
- `no-eval` - Error on eval usage

## Verification

To verify your code meets quality standards:

```bash
# 1. Type check
npm run typecheck

# 2. Format check
npm run format:check

# 3. Build
npm run build

# All pass? You're good to commit!
```

## References

- [TypeScript 7.0 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [typescript-eslint TS 7 Support Issue](https://github.com/typescript-eslint/typescript-eslint/issues/10940)
- [ESLint Flat Config Migration](https://eslint.org/docs/latest/use/configure/migration-guide)
