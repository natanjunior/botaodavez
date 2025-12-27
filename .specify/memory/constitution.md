<!--
SYNC IMPACT REPORT
==================
Version Change: Initial → 1.0.0
Modified Principles: N/A (initial creation)

Added Sections:
  - Core Principles:
    - I. Clean Code Architecture
    - II. Frontend-Backend Separation
    - III. Simplicity First
  - Code Quality (manual review process, no automated testing)
  - Development Workflow (feature development process, branching, commits)
  - Governance (amendment process, compliance review, versioning)

Templates Updated:
  ✅ .specify/templates/plan-template.md
     - Added Constitution Check section with gates for all three principles
     - Added Quality & Review checklist aligned with constitution
     - Removed automated testing infrastructure requirements

  ✅ .specify/templates/spec-template.md
     - Updated "User Scenarios & Testing" → "User Scenarios & Verification"
     - Changed "INDEPENDENTLY TESTABLE" → "INDEPENDENTLY VERIFIABLE"
     - Replaced "Independent Test" → "Manual Verification" throughout
     - Emphasized manual verification over automated testing

  ✅ .specify/templates/tasks-template.md
     - Updated quality assurance statement (manual review vs automated testing)
     - Removed all test-related task sections and examples
     - Changed "Independent Test" → "Manual Verification" for all user stories
     - Updated task dependencies to remove test-first workflow
     - Updated parallel execution examples to remove test tasks
     - Updated implementation strategy to emphasize manual verification
     - Added constitution compliance note to general notes section

  ✅ .specify/templates/checklist-template.md - Reviewed, no changes needed (generic template)
  ✅ .specify/templates/agent-file-template.md - Reviewed, no changes needed (generic template)

Command Files Reviewed:
  ✅ .claude/commands/speckit.specify.md - Aligns with constitution
  ✅ .claude/commands/speckit.plan.md - Aligns with constitution
  ✅ .claude/commands/speckit.tasks.md - Aligns with constitution
  ✅ All other command files - No constitution-specific references requiring updates

Follow-up TODOs: None

Rationale for Version 1.0.0:
  - Initial constitution creation for "Botão da Vez" project
  - Establishes foundational principles for clean, simple web application architecture
  - No automated testing requirements per user preference
  - Focus on maintainability and code quality through manual review
  - Emphasizes frontend-backend separation for web application structure
  - Prioritizes simplicity and YAGNI principles to avoid premature complexity
-->

# Botão da Vez Constitution

## Core Principles

### I. Clean Code Architecture

All code MUST follow clean code principles:

- Functions and methods serve a single, well-defined purpose
- Variable and function names clearly express intent
- Code is self-documenting; comments explain "why", not "what"
- Duplication is actively eliminated through proper abstractions
- Dependencies point inward: business logic never depends on UI or infrastructure details

**Rationale**: Clean code reduces maintenance burden, makes onboarding faster, and prevents technical debt accumulation. Self-documenting code reduces the need for extensive comments and documentation.

### II. Frontend-Backend Separation

The application MUST maintain clear boundaries between frontend and backend:

- Frontend code lives in dedicated frontend directories/projects
- Backend code lives in dedicated backend directories/projects
- Communication occurs exclusively through well-defined API contracts
- Frontend never directly accesses backend data stores or business logic
- Backend remains agnostic to frontend implementation details

**Rationale**: Clear separation enables independent development, testing, and deployment of frontend and backend. It allows technology choices to evolve independently and supports future scaling needs.

### III. Simplicity First

Simplicity is prioritized over premature optimization or abstraction:

- Start with the simplest solution that solves the actual problem
- Add complexity only when clearly justified by real requirements
- Avoid speculative features or "future-proofing" without concrete needs
- Reject patterns, frameworks, or dependencies that don't deliver clear value
- YAGNI (You Aren't Gonna Need It) principle strictly observed

**Rationale**: Simple solutions are easier to understand, modify, and debug. Premature complexity wastes time and makes future changes harder. Real requirements often differ from predicted ones.

## Code Quality

**Manual Review Required**: All code changes MUST undergo manual code review before merging.

**Review Criteria**:
- Alignment with Clean Code Architecture principles
- Proper frontend-backend separation
- Simplicity of solution (no unnecessary complexity)
- Clear naming and structure
- Business logic clarity

**No Automated Testing**: Automated testing is NOT required for this project. Quality is ensured through:
- Careful manual review
- Clear, readable code
- Proper separation of concerns
- Incremental changes with focused scope

## Development Workflow

**Feature Development Process**:
1. Specification: Define what users need and why (use `/speckit.specify`)
2. Planning: Design technical approach and structure (use `/speckit.plan`)
3. Task Breakdown: Create actionable implementation tasks (use `/speckit.tasks`)
4. Implementation: Execute tasks with manual verification at each step
5. Review: Manual code review ensuring constitutional compliance
6. Merge: Integrate changes after review approval

**Branching Strategy**:
- Feature branches: `[number]-[short-name]` (e.g., `1-user-auth`)
- All features start from main branch
- No direct commits to main
- Merge only after review approval

**Commit Standards**:
- Clear, descriptive commit messages
- Focused commits (single logical change per commit)
- Reference feature number in commits when applicable

## Governance

**Constitutional Authority**: This constitution supersedes all other development practices and guidelines.

**Amendment Process**:
1. Proposed changes MUST be documented with clear rationale
2. Impact on existing code and templates MUST be assessed
3. Version number MUST be incremented per semantic versioning:
   - MAJOR: Backward-incompatible principle changes or removals
   - MINOR: New principle additions or material expansions
   - PATCH: Clarifications, wording improvements, non-semantic changes
4. All dependent templates and documentation MUST be updated to reflect changes
5. Migration plan MUST be provided for changes affecting existing code

**Compliance Review**:
- All pull requests MUST verify constitutional compliance
- Code reviews MUST explicitly check adherence to Core Principles
- Any deviation from principles MUST be explicitly justified and documented
- Complexity beyond simple solutions MUST demonstrate clear necessity

**Version History**: This constitution uses semantic versioning (MAJOR.MINOR.PATCH) to track governance evolution.

**Runtime Guidance**: For runtime development guidance specific to active technologies, refer to the agent-specific context file generated by `/speckit.plan` (e.g., `.specify/memory/claude-context.md`).

**Version**: 1.0.0 | **Ratified**: 2025-12-26 | **Last Amended**: 2025-12-26
