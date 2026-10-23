# Project Memory and Guidelines

## Repository Scope & Isolation
- Scope: current repository only
- External file access: prohibited (no searching or reading outside repository root)
- Storage location: strictly inside repository; no project files in `$HOME` or external directories

## Memory Maintenance
- File location: `AGENTS.md` in repository root
- Standing instructions: append to this file
- Change detection: prompt user for confirmation before updating memory when policy or workflow changes occur

## Communication Standards
- Style: terse, short unambiguous phrases
- Structure: bullet points and tables
- Syntax: avoid conversational filler and full sentences
- Multiple choice presentation format:
  | Option | Pros | Cons | Decision | Rationale |
  | :--- | :--- | :--- | :--- | :--- |
  | Candidate A | ... | ... | Recommended | Basis for selection |
  | Candidate B | ... | ... | Rejected | Basis for rejection |

## Decision-Making Rules
- Assumptions: forbidden
- Ambiguity / branching paths: ask user before execution
- Proposals: present options using standard recommendation format above

## Documentation & Comments
- Content allowed: current state, current configuration, active policies, active workflows
- Content disallowed: historical notes, past changes, future plans, speculative items

## Code Standards
- Functions: small, single-purpose, descriptive names
- Architecture: small files, modular components
- In-code comments: terse, short phrases, current-state only

## Version Control
- Commit messages: must include summary of user prompts included in the commit

## Standing Instructions & Active Architecture
- Toolchain cache: strictly maintained at `~/.cache/bycme-repo/` (overridable via `BYCME_CACHE_DIR`)
- CLI Driver: `btool` (Python 3, standard library only)
- Directory Isolation:
  - `typespec/`: REST API contracts (`main.tsp`)
  - `generated/`: Machine-generated artifacts (strictly automated, no manual edits)
    - `generated/schema/`: Generated OpenAPI specifications (`openapi.json`)
    - `generated/shared/`: Generated TypeScript client and models (`index.ts`)
  - `sqlsource/`: SQL migrations (`sqlsource/migrations/*.sql`)
  - `backend/`: Cloudflare Worker API connected to D1
  - `frontend/`: React SPA built with Vite
- Database Migrations: Cloudflare D1 native migrations applied via `wrangler d1 migrations apply`
- Staging Workflow: `./btool staging` executes preflight check, codegen, build, migration, and publish
- CI Verification: `./btool verify` asserts generated files match TypeSpec contract and detects drift
- Design Documentation: `DESIGN.md` in repository root must be continuously updated with features/subfeatures, database schema (tables/fields with feature version), and REST API endpoints (with feature version)
- Authentication Standard: All API endpoints require Bearer token authorization except `/api/health` and `/api/auth/login`
- Feature Scope Standard: Every feature must be an end-to-end slice encompassing schema migration, seed data, backend update, REST API contract, and frontend UI
