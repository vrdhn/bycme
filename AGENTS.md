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
