# API Migration Strategy: Express.js to ElysiaJS

This document outlines the strategy for migrating the `apps/api` application from the Express.js framework to ElysiaJS. The migration will be performed incrementally to minimize disruption and ensure stability.

## Goals

*   Improve API performance and efficiency.
*   Leverage ElysiaJS's first-class TypeScript support and built-in validation for enhanced type safety and developer experience.
*   Modernize the API stack and simplify dependency management where possible.

## Migration Strategy

### 1. Initial Setup & Parallel Operation

*   **Install ElysiaJS:** Add `elysia` and relevant ElysiaJS plugins (e.g., `@elysiajs/swagger` for documentation) as dependencies to `apps/api/package.json`.
*   **New Entry Point:** Create a separate entry point for the ElysiaJS server (e.g., `apps/api/src/elysia-app.js` or `apps/api/src/elysia.js`). Initially, this will run alongside the existing Express app, allowing for gradual migration and testing.

### 2. Incremental Route and Business Logic Migration

*   **Start Small:** Begin by migrating a single, simple, and isolated API route (e.g., a basic health check endpoint or the root `/` route). This helps to establish the basic pattern for ElysiaJS route definition.
*   **Resource-by-Resource Approach:** Proceed with migrating routes one resource at a time (e.g., all `/auth` routes, then all `/albums` routes, followed by `/images`, `/faces`, etc.).
*   **Handler Adaptation:** The core business logic residing within the existing service files (e.g., `login.service.js`, `fetchAlbums.service.js`) should be largely reusable. The primary changes will involve adapting the route handler files to ElysiaJS's request/response context and syntax.

### 3. Validation System Migration

*   **Replace Joi with TypeBox:** The current `joi`-based validation will be replaced with ElysiaJS's built-in validation capabilities, which leverage `TypeBox` (or `Zod`). This change will provide:
    *   End-to-end type safety across the API.
    *   Automatic generation of OpenAPI (Swagger) schema, enhancing API documentation.

### 4. Middleware and Utility Replacement

*   **Authentication Middleware:** Re-implement the logic from `apps/api/src/routes/middleware/authentication.middleware.js` as an ElysiaJS lifecycle hook (e.g., `onBeforeHandle` or a custom Elysia plugin/decorator).
*   **File Uploads:** Replace the `multer.middleware.js` implementation with ElysiaJS's native file upload handling, which is typically more integrated and efficient.
*   **CORS and Body Parsing:** ElysiaJS provides built-in support for CORS and JSON/URL-encoded body parsing. The `cors` and `body-parser` packages from Express will be removed, simplifying the dependency tree.
*   **Rate Limiting:** The existing `express-rate-limit` middleware will need to be replaced with an ElysiaJS-compatible rate limiting plugin or a custom implementation tailored for Elysia's lifecycle.

### 5. Database Integration (Prisma)

*   **Minimal Impact:** The integration with Prisma Client is expected to remain largely unchanged. Prisma interacts directly with the database, and its usage within the service layer should be framework-agnostic.
*   **Connection Management:** Ensure the Prisma Client instance is properly initialized and accessible within the ElysiaJS context.

### 6. Testing Strategy

*   **New Endpoint Tests:** For each migrated ElysiaJS endpoint, write new unit and integration tests using Elysia's dedicated testing utilities.
*   **Incremental Update of Existing Tests:** As sections of the API are migrated, gradually update the existing `supertest`-based integration tests to target the new ElysiaJS endpoints. This ensures continuous test coverage throughout the migration process.

### 7. Final Cutover and Cleanup

*   **Main Entry Point Switch:** Once all functionalities have been successfully migrated to ElysiaJS and thoroughly tested, the main entry point of the `apps/api` application will be switched to the ElysiaJS server.
*   **Dependency Removal:** Remove all remaining Express.js-related packages (e.g., `express`, `joi`, `multer`, `body-parser`, `cors`, `express-rate-limit`, `nodemon` if Elysia's hot-reloading is sufficient) and other now-obsolete dependencies from `apps/api/package.json`.

This phased approach will ensure a smooth transition with minimal downtime and allow for continuous validation of functionality.

## Revised Strategy: Bun and TypeScript for API Migration

Given the persistent challenges encountered with running ElysiaJS in the Node.js CommonJS environment, a revised strategy is proposed to leverage ElysiaJS's native strengths. This involves transitioning the `apps/api` application to the Bun runtime and TypeScript.

### Goals of the Revised Strategy

*   **Leverage ElysiaJS's Native Environment:** Align the API with ElysiaJS's optimized runtime (Bun) and first-class TypeScript support to reduce compatibility issues and improve developer experience.
*   **Enhance Performance:** Benefit from Bun's inherent performance advantages.
*   **Simplify Development:** Streamline the migration process by working within ElysiaJS's intended ecosystem.

### Implementation Steps

#### 1. Transition `apps/api` to Bun Runtime and TypeScript

*   **Install Bun:** Ensure the Bun runtime is installed globally on the development environment.
*   **Initial TypeScript Setup:**
    *   Create a `tsconfig.json` file in `apps/api/` with appropriate configurations for a Bun/ElysiaJS project.
    *   Install TypeScript as a development dependency.
*   **Convert JavaScript to TypeScript:**
    *   Rename all `.js` files within `apps/api/src/` to `.ts` (or `.mts` for ES Modules if preferred, but `.ts` is generally sufficient for migration).
    *   Introduce basic type annotations where necessary, especially for API inputs and outputs, leveraging Elysia's type inference.
*   **Update `package.json` Scripts:**
    *   Modify `start`, `dev`, and `dev:elysia` scripts in `apps/api/package.json` to use `bun` commands (e.g., `bun run ...` or `bun --watch ...`) instead of `node`/`nodemon`.
    *   Remove `nodemon` and `tsconfig-paths` from `apps/api/package.json` as Bun handles watching and module resolution natively for TypeScript.

#### 2. Re-evaluate and Continue ElysiaJS Migration in Bun/TypeScript Environment

*   Once the `apps/api` is successfully running under Bun and TypeScript, we will re-evaluate the previous ElysiaJS migration steps. The focus will then be on:
    *   **Ensuring Elysia Server Startup:** Verify the Elysia server starts and listens correctly without the Node.js CommonJS specific issues previously encountered.
    *   **Body Parsing:** Confirm that JSON body parsing works seamlessly with Elysia's validation schemas (e.g., `t.Object`).
    *   **Route and Middleware Migration:** Continue with the incremental migration of routes and middleware, which should be more straightforward in the native Bun/TypeScript environment.

This revised approach aims to provide a more stable and efficient path to completing the ElysiaJS migration.
