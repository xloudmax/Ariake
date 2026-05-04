# C404-blog / Playground Project Context

## Project Overview
This is a full-stack blogging and playground platform consisting of a React frontend and a Go backend. It allows users to write and manage blog posts using Markdown, with support for image uploads, commenting, and version history.

- **Frontend:** React 19 (Vite), Tailwind CSS 4, Ant Design 5, Apollo Client (GraphQL).
- **Backend:** Go 1.24, Gin Web Framework, Gorm (SQLite/PostgreSQL), gqlgen (GraphQL).
- **Database:** SQLite (development), PostgreSQL (production).

## Architecture & Structure

### Frontend (`/src`)
- **Entry:** `src/main.tsx`
- **Routing:** React Router (`react-router-dom`)
- **State/Data:** Apollo Client (`@apollo/client`) for GraphQL interactions.
- **Styling:** Tailwind CSS + Ant Design.
- **Components:** `src/components` (ArticleCard, MarkdownEditor, etc.)
- **Pages:** `src/pages`

### Backend (`/backend`)
- **Entry:** `backend/main.go`
- **API:** GraphQL (`backend/graph`) + REST (`backend/controllers`)
- **Database:** Gorm ORM models in `backend/models` (or implicitly in logic).
- **Auth:** JWT-based authentication (`backend/middleware`).
- **Config:** `backend/go.mod` defines dependencies.

## Key Development Commands

### Frontend
Run these commands from the root directory:

- **Install Dependencies:** `pnpm install`
- **Start Dev Server:** `pnpm dev` (Runs on http://localhost:5173)
- **Build for Production:** `pnpm build`
- **Run Tests:** `pnpm test` (Vitest)
- **Generate GraphQL Types:** `pnpm codegen` (Run this after changing backend GraphQL schema)

### Backend
Run these commands from the `backend/` directory:

- **Start Server:** `go run main.go` (Runs on http://localhost:11451)
- **Run Tests:** `go test ./...`

## Development Conventions

- **API Style:** The project primarily uses GraphQL for data fetching and mutation. Ensure `schema.graphql` is updated when modifying the data model, then run `pnpm codegen` in the frontend and `go generate` (or `gqlgen`) in the backend.
- **Markdown:** Content is stored and rendered as Markdown. The frontend uses `react-markdown` with plugins for GFM, highlighting, and math.
- **Styling:** Use Tailwind CSS for layout and custom styling. Use Ant Design for complex interactive components (Modals, Forms, etc.).
- **Code Style:** Follow standard Go conventions (`gofmt`) and React hooks rules. ESLint and Prettier (implied) are used for frontend.
