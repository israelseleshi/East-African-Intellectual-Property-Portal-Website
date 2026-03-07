---
description: Standards for API interactions and frontend-backend synchronization
---

# API Integration & Frontend State

Rules for robust communication between React and Express:

- **Relative Paths**: Always use `/api/*` for requests. The base URL is handled by the `axios` instance in `client/src/lib/api.ts`.
- **Type Safety**: Import shared types from `server/src/types` directly into frontend components.
- **Loading States**: Every async action must have a corresponding loading state and error handling UI (use `sonner` for toasts).
- **Caching**: Use React Query (if available) or efficient local state management to prevent redundant API calls.
- **Response Handling**: Always check `response.data` structure based on the backend's standard JSON response format.
