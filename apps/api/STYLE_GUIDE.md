# Project Style Guide

This document outlines the coding style and conventions for the project.

## General Principles

*   **Consistency:** Adhere to existing patterns and styles within the codebase.
*   **Readability:** Write clear, concise, and easily understandable code.
*   **Maintainability:** Design code that is easy to modify and extend.

## JavaScript/Node.js Conventions

*   **ESLint:** Follow the ESLint rules defined in `.eslintrc.json` and `eslint.config.js`.
*   **Naming Conventions:**
    *   **Variables & Functions:** `camelCase` (e.g., `myVariable`, `calculateTotal`).
    *   **Classes:** `PascalCase` (e.g., `UserModel`, `AuthService`).
    *   **Constants:** `SCREAMING_SNAKE_CASE` for global constants (e.g., `API_KEY`).
    *   **Files:** `kebab-case` for directories and `camelCase` or `kebab-case` for files, depending on context (e.g., `user.handler.js`, `auth.middleware.js`).
    *   **Model Properties:** `camelCase` (e.g., `userName`, `createdAt`).
*   **Indentation:** Use 2 spaces for indentation.
*   **Quotes:** Use single quotes for strings, unless escaping is necessary.
*   **Semicolons:** Use semicolons at the end of statements.
*   **Arrow Functions:** Prefer arrow functions for callbacks and concise functions.
*   **Error Handling:** Implement robust error handling using `try...catch` blocks where appropriate.
*   **Comments:** Add comments to explain complex logic or non-obvious decisions. Avoid commenting on obvious code.

## Project-Specific Guidelines

*   **Linting:** Always run the linter after making changes to ensure code quality.
*   **Testing:** Always run tests after making changes to verify functionality.

## Directory Structure