# Backend Integration Guide

This app is already organized around a service layer, so backend work should slot into `src/services/*` instead of spreading API calls through UI components.

## Recommended arrangement

1. Keep UI components dumb.
   - Components in `src/components/*` should call service functions only.
   - Avoid direct `fetch` calls inside pages or components.

2. Use one shared HTTP client.
   - Put all real backend calls behind `src/services/apiClient.ts`.
   - Keep auth headers, base URL, error handling, and JSON parsing in one place.

3. Keep one feature per service file.
   - `studentsService.ts` for student CRUD and roster data.
   - `gradebookService.ts` for scores and assessments.
   - `homeworkService.ts` for assignments and submissions.
   - `messagesService.ts` for parent communication.
   - `scheduleService.ts`, `notificationsService.ts`, `profileService.ts`, `analyticsService.ts` for their matching domains.

4. Preserve the mock/real split.
   - When `NEXT_PUBLIC_API_BASE_URL` is unset, the app should continue to run from in-memory mock data.
   - When it is set, every service should call the backend through `request()`.

5. Keep the types close to the services.
   - Export domain types from the service files.
   - Re-export them from `src/services/index.ts` as the single import surface.

6. Add integration contracts before wiring UI.
   - For each service, define request/response shapes and endpoint paths first.
   - Then wire the components to the service methods.

## Folder arrangement to keep it easy

Suggested structure:

```text
src/
  services/
    apiClient.ts
    studentsService.ts
    gradebookService.ts
    homeworkService.ts
    messagesService.ts
    scheduleService.ts
    notificationsService.ts
    profileService.ts
    analyticsService.ts
    index.ts
    __tests__/
docs/
  backend-integration-guide.md
```

If the backend grows, add these only when needed:

```text
src/types/          shared DTOs if they become too large for service files
src/lib/auth/       token/session helpers
src/lib/config/     env parsing and runtime config
src/mappers/        backend-to-UI normalization
src/hooks/          shared data-loading hooks
```

## Backend integration checklist

1. Confirm the API base URL in `.env.local`.
2. Decide the auth mechanism.
3. Map each frontend service to backend endpoints.
4. Keep response payloads consistent with the current TypeScript interfaces.
5. Normalize backend fields inside the service layer, not in components.
6. Add or update tests for the service contract.
7. Run `npm run test` and `npm run lint` after wiring.

## Notes for this codebase

- `src/services/apiClient.ts` is the correct place for auth headers, retry policy, and error wrapping.
- `src/services/index.ts` is already the barrel file, so future code should import from there when possible.
- The app already has test coverage around the client layer, which is a good place to add backend-contract tests.

## Prompt for a Codex agent

Use this when handing the repo to another Codex agent:

```text
You are working in the teacher dashboard repo.

Goal:
Integrate the frontend with a backend without breaking mock mode.

Rules:
- Do not add direct fetch calls in components.
- Keep all real API access behind src/services/apiClient.ts.
- Preserve mock mode when NEXT_PUBLIC_API_BASE_URL is unset.
- Update the matching service file for each feature area.
- Keep shared types exported from the service layer and re-exported in src/services/index.ts.
- Prefer small, local edits over large refactors.
- Do not remove or rewrite unrelated mock data unless the backend contract requires it.
- Add or update tests for the service you touch.

Expected workflow:
1. Inspect the relevant service file.
2. Identify the backend endpoint contract.
3. Add or adjust request/response types.
4. Wire the service to request().
5. Keep the component layer consuming the same service API if possible.
6. Update tests and run the test suite.

Deliverable:
- Working service integration
- Clear endpoint mapping
- Tests covering the new contract
```
