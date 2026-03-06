# TODO

## Inbox
- [ ] Extend centralized policy layer coverage to remaining route groups beyond clubs/streams.
- [ ] Define API versioning and compatibility policy (all API currently under `/api`, no versioning).
- [ ] Introduce observability baseline (structured logs, metrics, traces, health depth).
- [ ] Add reverse proxy/TLS edge config for production ingress (no nginx/traefik/caddy config found).

## In Progress
- [ ] Project audit baseline documentation in `reports/*` is generated and should be kept up to date with code changes.
- [ ] After Wave 3 delivery, keep support-contract docs/tests synchronized with future route/schema changes.

## Blocked
- [x] Historical blocker resolved in Wave 2: pytest and frontend quality scripts are now configured.

## Done
- [x] Monorepo structure inventory completed: `backend`, `frontend`, `infra`, `docker-compose.yml`.
- [x] Entry points identified: `backend/app/main.py`, `frontend/src/main.tsx`, route definitions in `frontend/src/App.tsx`.
- [x] Streaming stack located and reviewed: `docker-compose.yml`, `infra/mediamtx/mediamtx.yml`, player + chat paths.
- [x] Backend API routes inventoried from `backend/app/routes/*.py`.
- [x] Frontend route map and pages inventory completed from `frontend/src/App.tsx` and `frontend/src/pages/*`.
- [x] Domain models and schemas inventoried from `backend/app/models.py` and `backend/app/schemas.py`.
- [x] TODO/FIXME/HACK/XXX scan over project source completed (none found in `backend/app`, `frontend/src`, `infra`).
- [x] Frontend install/build checks completed (`npm install`, `npm run build`).
- [x] Backend requirements install check completed (`pip install -r backend/requirements.txt` in `.venv`).
- [x] Backend syntax validation completed (no syntax errors in `backend/app/**/*.py`).
- [x] Wave 1 route consolidation implemented in frontend router (`/discover` -> `/`, `/dashboard-legacy` -> `/dashboard`).
- [x] Wave 1 explicit not-found handling implemented (`/404` + wildcard redirect to `/404`).
- [x] Wave 1 invite recipient flow implemented (`/invites/:token` with accept/decline actions).
- [x] Wave 1 canonical link cleanup completed for primary navigation and stream cards/pages.
- [x] Wave 2 config/env baseline implemented (`backend/app/settings.py`, env-driven backend config).
- [x] Wave 2 security baseline implemented (removed hardcoded `SECRET_KEY`, env-driven CORS allowlist, wildcard+credentials removed).
- [x] Wave 2 migration baseline implemented (Alembic added with initial migration and bootstrap path for legacy local DB).
- [x] Wave 2 frontend quality gates implemented (`lint`, `typecheck`, `test` scripts + eslint/vitest baseline).
- [x] Wave 2 backend test baseline implemented (`pytest`, `backend/tests/*` smoke tests).
- [x] Wave 2 minimal CI workflow implemented (`.github/workflows/ci.yml`).
- [x] Wave 3 backend support endpoint implemented: deterministic username -> active stream lookup (`GET /api/streams/by-username/{username}/active`).
- [x] Wave 3 backend support endpoint implemented: invite token metadata/preflight (`GET /api/invites/{token}`).
- [x] Wave 3 backend support endpoint implemented: club permission introspection (`GET /api/clubs/{club_id}/permissions/me`).
- [x] Wave 3 frontend integration completed for `/live/:username` alias using deterministic backend lookup + standardized unavailable state.
- [x] Wave 3 frontend integration completed for invite preflight metadata in `InviteDecisionPage` while preserving accept/decline actions.
- [x] Wave 3 Club Studio access UX upgraded with permissions introspection and explicit forbidden-state messaging.
- [x] Wave 3 backend tests added for new endpoints (`backend/tests/test_wave3_endpoints.py`).
- [x] Wave 3 frontend smoke test added for live alias behavior (`frontend/src/pages/LiveAliasPage.test.tsx`).
- [x] Wave 4 permission inventory created (`reports/permission_inventory.json`).
- [x] Wave 4 centralized authorization policy layer added (`backend/app/permissions/base.py`, `club_policy.py`, `stream_policy.py`, `rbac_matrix.py`, `errors.py`).
- [x] Wave 4 inline role checks replaced in `backend/app/routes/clubs.py` and `backend/app/routes/streams.py` with centralized policy helpers.
- [x] Wave 4 permission-focused backend tests added (`backend/tests/test_permissions.py`).
- [x] Wave 5 stream session lifecycle entity added (`StreamSession`) with Alembic migration (`20260307_0002_add_stream_sessions_table.py`).
- [x] Wave 5 session lifecycle service helpers added (`backend/app/services/stream_sessions.py`).
- [x] Wave 5 stream route live-state sync moved to session-based logic (removed request-path HLS probing dependency).
- [x] Wave 5 stream sessions history endpoint added (`GET /api/streams/{stream_id}/sessions`).
- [x] Wave 5 backend tests added for stream session service and endpoint coverage (`backend/tests/test_stream_sessions.py`).

## Tech Debt
- [ ] `frontend/src/pages/DashboardPage.tsx` (`/dashboard-legacy`) duplicates dashboard concerns already covered by modern `/dashboard/*` pages.
- [ ] Mock/enrichment logic in `frontend/src/api.ts` (`browseApi`) mixes transport and presentation data shaping.
- [ ] Policy layer now exists, but route-level policy adoption is still partial outside club/stream handlers.
- [ ] WebSocket chat has no auth/identity binding beyond client-provided `user` field.
- [ ] SQLite file DB (`backend/streams.db`) + create-on-start approach is fragile for multi-instance production.
- [ ] Placeholder feature modules exist but are empty (`frontend/src/features/clubInvites/index.ts`, `frontend/src/features/editClubProfile/index.ts`, `frontend/src/features/editDJProfile/index.ts`).
- [ ] Accidental environment drift risk: both `backend/venv` and root `.venv` directories exist in workspace.
- [ ] Temporary migration bridge exists for legacy local DBs (`backend/scripts/bootstrap_db.py` stamp path); remove after all environments are fully Alembic-managed.

## Questions / Unknowns
- [ ] Is `frontend/src/pages/DiscoverPage.tsx` still canonical or temporary (overlaps with richer `BrowsePage` flow)?
- [ ] Should `/dashboard-legacy` remain supported or be removed after migration to `/dashboard/*`?
- [ ] Is stream key rotation planned (UI button exists but disabled in `DashboardStreamPage`)?
- [x] Invite accept/decline UX is now exposed and backed by metadata preflight in `/invites/:token`.
- [ ] What production DB target is planned (currently hardcoded SQLite)?
- [ ] What is the intended deployment topology for MediaMTX + backend + frontend (compose is dev-centric localhost setup)?

## Product Architecture Backlog (Priority-tagged)
- [x] [P0] Consolidate discovery ownership to `/` and deprecate `/discover` route usage.
- [x] [P0] Decommission `/dashboard-legacy` and redirect to `/dashboard`.
- [x] [P0] Add invite recipient flow route `/invites/:token` using existing backend accept/decline endpoints.
- [x] [P0] Introduce explicit Not Found behavior (`/404`) instead of wildcard redirect-to-home.
- [x] [P0] Canonicalize watch route to `/watch/:streamId`; keep `/live/:username` as transitional alias redirect.
- [ ] [P0] Define official product role model from existing code roles (`guest`, `viewer`, `dj`, `club_*`).
- [x] [P1] Introduce centralized permission policy module and RBAC matrix for club/stream actions.
- [x] [P1] Merge or repurpose `/channel/:username` to avoid overlap with `/dj/:username` + watch page (removed as primary destination).
- [ ] [P1] Add explicit unauthorized workspace state (403-style UX) for club studio access failures.
- [x] [P1] Standardize unavailable stream UX state and recovery CTAs on live alias entry.
- [ ] [P1] Align navigation labels and route semantics with canonical IA from `reports/site_map_target.md`.
- [ ] [P2] Define and phase in admin zone route tree (`/admin/*`) after backend support appears.

## Remove/Merge Candidates
- [x] Remove/redirect `/discover` -> `/` due duplicate discovery role.
- [x] Remove/redirect `/dashboard-legacy` -> `/dashboard` due duplicate dashboard responsibilities.
- [x] Merge `/channel/:username` role into `/dj/:username` (profile) and `/watch/:streamId` (live playback) as primary navigation path.
- [x] Merge dual watch entry semantics by promoting `/watch/:streamId` as canonical and downgrading `/live/:username` to alias.

## Missing Pages
- [x] [P0] `InviteDecisionPage` at `/invites/:token` (accept/decline invite flow).
- [x] [P1] `NotFoundPage` at `/404` with explicit recovery actions.
- [ ] [P1] `ForbiddenPage` (`/403`) or equivalent explicit unauthorized state.
- [x] [P1] Equivalent explicit unauthorized state implemented via reusable `ForbiddenState` on Club Studio access flow.
- [x] [P1] Standardized `StreamUnavailable` state implemented via reusable `StreamUnavailableState` in live alias flow.

## Missing Backend Support
- [x] [P1] Add username-to-active-stream lookup endpoint to support deterministic `/live/:username` -> `/watch/:streamId` redirect.
- [x] [P1] Add invite token preflight read endpoint (`GET /api/invites/{token}`) for richer invite decision UX.
- [x] [P1] Add club permission introspection endpoint for cleaner access messaging (`GET /api/clubs/{club_id}/permissions/me`).
- [ ] [P2] Add admin/moderation endpoints before introducing `/admin/*` routes.
- [ ] [P1] Optional: add explicit invite token metadata endpoint for richer initial `/invites/:token` context card.

## Security/Quality Prerequisites
- [x] [P0] Move `SECRET_KEY` out of source and into environment config.
- [x] [P0] Replace permissive CORS defaults with environment-scoped origin allowlist.
- [x] [P0] Add frontend scripts: `lint`, `typecheck`, `test`.
- [x] [P0] Add backend pytest dependency and baseline tests for auth/stream/club/invite flows.
- [x] [P0] Add migration framework and baseline migration set.
- [x] [P1] Add CI pipeline gates for build + tests + lint/typecheck.
- [x] [P1] Permission UX follow-up: page-level explicit forbidden fallback rolled out in Club Studio (dedicated `/403` route remains optional future enhancement).
