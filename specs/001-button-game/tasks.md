# Tasks: Botão da Vez

**Input**: Design documents from `/specs/001-button-game/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, contracts/websocket-events.md

**Quality Assurance**: Per project constitution, quality is ensured through manual review and verification, not automated testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and manual verification of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router structure (unified frontend + backend):
- Frontend: `src/app/(admin)/`, `src/app/(participant)/`, `src/components/`
- Backend: `src/app/api/`, `src/lib/services/`, `src/lib/socket/`
- Types: `src/types/`
- Database: `supabase/migrations/`
- Styles: `src/styles/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETED

**Purpose**: Project initialization and basic structure

**Status**: Setup completed via quickstart-v2.md execution:
- ✅ Dependencies installed (Next.js 16, React 19, Tailwind 4, Socket.io, Supabase, PWA)
- ✅ Configuration files (next.config.js, tsconfig.json, tailwind.config.ts)
- ✅ Directory structure created
- ✅ Basic Supabase client implemented (src/lib/db/supabase.ts)
- ✅ Basic Socket.io server implemented (src/app/api/socket/route.ts)
- ✅ Database migration created (supabase/migrations/001_initial_schema.sql)
- ✅ PWA manifest configured (public/manifest.json)

**Remaining Setup Tasks**:

- [ ] T001 Apply database migration to Supabase (run: supabase db push)
- [ ] T002 Generate PWA icons (192x192 and 512x512) and place in public/icons/
- [ ] T003 [P] Create skeuomorphic CSS styles in src/styles/skeuomorphic.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Types

- [ ] T004 Generate TypeScript types from Supabase schema in src/lib/db/schema.ts
- [ ] T005 [P] Verify all entity types match database schema in src/types/game.ts

### Authentication & Authorization

- [ ] T006 Implement Supabase Auth middleware in src/middleware/auth.ts for admin routes
- [ ] T007 [P] Create auth helper functions in src/lib/utils/auth.ts (session validation, token verification)

### Core Utilities

- [ ] T008 [P] Implement token generator utility in src/lib/utils/tokenGenerator.ts (6-8 char alphanumeric)
- [ ] T009 [P] Implement timing utilities in src/lib/utils/timing.ts (countdown, reaction time measurement)
- [ ] T010 [P] Implement validation utilities in src/lib/utils/validation.ts (input sanitization, XSS prevention)

### Socket.io Infrastructure

- [ ] T011 Complete Socket.io server setup in src/app/api/socket/route.ts with room management
- [ ] T012 [P] Define WebSocket event types in src/lib/socket/types.ts (ServerToClientEvents, ClientToServerEvents)
- [ ] T013 [P] Implement presence handler in src/lib/socket/handlers/presenceHandlers.ts (online/offline, heartbeat)

### Base UI Components

- [ ] T014 [P] Create base Button component in src/components/ui/Button.tsx with skeuomorphic styling
- [ ] T015 [P] Create base Card component in src/components/ui/Card.tsx with skeuomorphic styling
- [ ] T016 [P] Create Avatar component in src/components/shared/Avatar.tsx (DiceBear integration)
- [ ] T017 [P] Create base Input component in src/components/ui/Input.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Criar e Configurar Game (Priority: P1) 🎯 MVP

**Goal**: Admin creates game, generates token, participants join, configure teams

**Manual Verification**:
1. Admin logs in and creates new game → receives unique token
2. Participant enters token → joins game successfully
3. Admin sees participant in list with online status
4. Admin creates teams and assigns participants → participants grouped by team

### Admin Authentication (US1)

- [ ] T018 [P] [US1] Create admin login page in src/app/(admin)/login/page.tsx
- [ ] T019 [US1] Implement POST /api/auth/login endpoint in src/app/api/auth/login/route.ts
- [ ] T020 [US1] Implement POST /api/auth/logout endpoint in src/app/api/auth/logout/route.ts
- [ ] T021 [US1] Implement GET /api/auth/me endpoint in src/app/api/auth/me/route.ts

### Game Management (US1)

- [ ] T022 [P] [US1] Implement gameService in src/lib/services/gameService.ts (create, list, get, delete)
- [ ] T023 [US1] Implement POST /api/games endpoint in src/app/api/games/route.ts (create game with token)
- [ ] T024 [US1] Implement GET /api/games endpoint in src/app/api/games/route.ts (list admin's games)
- [ ] T025 [US1] Implement GET /api/games/[token]/route.ts endpoint (get game by token)
- [ ] T026 [US1] Implement DELETE /api/games/[token]/route.ts endpoint (delete game)

### Admin Dashboard (US1)

- [ ] T027 [P] [US1] Create admin dashboard page in src/app/(admin)/dashboard/page.tsx
- [ ] T028 [US1] Create GameDashboard component in src/components/admin/GameDashboard.tsx
- [ ] T029 [US1] Create game management page in src/app/(admin)/game/[token]/page.tsx

### Participant Join Flow (US1)

- [ ] T030 [P] [US1] Implement participantService in src/lib/services/participantService.ts (create, update, delete, get)
- [ ] T031 [US1] Implement POST /api/participants endpoint in src/app/api/participants/route.ts (join game)
- [ ] T032 [US1] Implement DELETE /api/participants/[id]/route.ts endpoint (remove participant)
- [ ] T033 [US1] Create participant join page in src/app/(participant)/join/page.tsx (token entry form)
- [ ] T034 [US1] Create participant game view page in src/app/(participant)/play/[token]/page.tsx

### Participant List & Presence (US1)

- [ ] T035 [P] [US1] Create ParticipantList component in src/components/admin/ParticipantList.tsx
- [ ] T036 [US1] Implement WebSocket participant:joined event handler in src/lib/socket/handlers/gameHandlers.ts
- [ ] T037 [US1] Implement WebSocket participant:left event handler in src/lib/socket/handlers/gameHandlers.ts
- [ ] T038 [US1] Implement WebSocket participant:online/offline event handlers in presenceHandlers.ts
- [ ] T039 [US1] Add real-time participant list updates via Socket.io in ParticipantList component

### Team Management (US1)

- [ ] T040 [P] [US1] Implement teamService in src/lib/services/teamService.ts (create, update, delete, assign participants)
- [ ] T041 [US1] Implement POST /api/teams endpoint in src/app/api/teams/route.ts (create team)
- [ ] T042 [US1] Implement PATCH /api/teams/[id]/route.ts endpoint (update team)
- [ ] T043 [US1] Implement DELETE /api/teams/[id]/route.ts endpoint (delete team)
- [ ] T044 [US1] Create TeamManager component in src/components/admin/TeamManager.tsx
- [ ] T045 [US1] Implement WebSocket team:created/updated/deleted event handlers in gameHandlers.ts
- [ ] T046 [US1] Add real-time team updates via Socket.io in TeamManager component

**Checkpoint**: At this point, User Story 1 should be fully functional:
- Admin can create game and get token
- Participants can join via token
- Admin sees participant list with online/offline status in real-time
- Admin can create teams and assign participants

---

## Phase 4: User Story 2 - Executar Rodada Individual (Priority: P1) 🎯 MVP

**Goal**: Admin selects participants, starts round, button mechanics work, system determines winner

**Manual Verification**:
1. Admin selects 2+ online participants for round
2. Admin clicks "Jogar" → participants see countdown with yellow button
3. Participant clicks yellow before time → eliminated (red button)
4. Countdown reaches zero → button turns green
5. Participants click green → system shows winner (lowest reaction time)

### Round Management Service (US2)

- [ ] T047 [P] [US2] Implement roundService in src/lib/services/roundService.ts (create, update, start, stop, result)
- [ ] T048 [US2] Implement POST /api/rounds endpoint in src/app/api/rounds/route.ts (create round)
- [ ] T049 [US2] Implement PATCH /api/rounds/[id]/route.ts endpoint (update participants)
- [ ] T050 [US2] Implement POST /api/rounds/[id]/start/route.ts endpoint (start round with countdown)
- [ ] T051 [US2] Implement POST /api/rounds/[id]/stop/route.ts endpoint (cancel round)
- [ ] T052 [US2] Implement GET /api/rounds/[id]/result/route.ts endpoint (get round result)

### Round Controls (Admin Side - US2)

- [ ] T053 [P] [US2] Create RoundControls component in src/components/admin/RoundControls.tsx
- [ ] T054 [US2] Add round creation UI (select participants, create round button)
- [ ] T055 [US2] Add "Jogar" button with validation (all selected participants online)
- [ ] T056 [US2] Add "Parar Rodada" button for manual cancellation
- [ ] T057 [US2] Add round result display in RoundControls component

### Reaction Button (Participant Side - US2)

- [ ] T058 [P] [US2] Create ReactionButton component in src/components/participant/ReactionButton.tsx
- [ ] T059 [US2] Implement button states: disabled → yellow (countdown) → green (active) → red (eliminated)
- [ ] T060 [US2] Implement local countdown timer with millisecond precision
- [ ] T061 [US2] Implement reaction time measurement from green → click
- [ ] T062 [US2] Add visual feedback for button state transitions with skeuomorphic styling

### Round WebSocket Flow (US2)

- [ ] T063 [P] [US2] Implement round:created event handler in src/lib/socket/handlers/roundHandlers.ts
- [ ] T064 [US2] Implement round:started event handler (receive countdown_duration, start local timer)
- [ ] T065 [US2] Implement round:button-click client→server event (send reaction time)
- [ ] T066 [US2] Implement round:eliminate client→server event (clicked yellow button)
- [ ] T067 [US2] Implement round:result server→client event handler (display winner)
- [ ] T068 [US2] Implement round:cancelled event handler (admin stopped round)

### Round Result Logic (US2)

- [ ] T069 [US2] Implement winner determination logic in roundService (lowest reaction time, handle ties)
- [ ] T070 [US2] Store round results in round_results table (reaction times, eliminations, winner)
- [ ] T071 [US2] Broadcast round:result event to all participants and admin
- [ ] T072 [P] [US2] Create RoundStatus component in src/components/participant/RoundStatus.tsx (show result)

**Checkpoint**: At this point, User Story 2 should be fully functional:
- Admin can select participants and start round
- Participants see countdown with yellow button (eliminated if clicked early)
- Button turns green at correct time
- System measures reaction times and determines winner
- Result shown to admin and all participants

---

## Phase 5: User Story 3 - Gerenciar Múltiplas Rodadas (Priority: P2)

**Goal**: Admin can replay same round with different participants, only last result kept

**Manual Verification**:
1. Complete a round with result shown
2. Admin clicks "Jogar Outra Vez"
3. Admin changes participant selection
4. Round executes again
5. Only latest result is displayed (previous result replaced)

### Replay Round Logic (US3)

- [ ] T073 [US3] Add "Jogar Outra Vez" button to RoundControls component
- [ ] T074 [US3] Implement round replay logic in roundService (reset status, clear old results)
- [ ] T075 [US3] Update PATCH /api/rounds/[id]/route.ts to allow changing participants for replay
- [ ] T076 [US3] Implement result deletion logic in roundService (delete previous results before new play)
- [ ] T077 [US3] Update round:started event to handle replay scenario
- [ ] T078 [US3] Add UI indication in admin dashboard for rounds that have been played multiple times

**Checkpoint**: At this point, User Story 3 should be fully functional:
- Admin can replay rounds with different participants
- Only latest result is stored and displayed
- Multiple replays work correctly

---

## Phase 6: User Story 4 - Visualização para Espectadores (Priority: P3)

**Goal**: Non-playing participants can see who's playing and the result

**Manual Verification**:
1. As participant NOT in current round, view app
2. See list of participants playing
3. When round completes, see result displayed

### Spectator View (US4)

- [ ] T079 [P] [US4] Create SpectatorView component in src/components/participant/SpectatorView.tsx
- [ ] T080 [US4] Show list of participants in current round
- [ ] T081 [US4] Update participant game view page to show SpectatorView when not in round
- [ ] T082 [US4] Subscribe to round:result event for spectators (display winner)
- [ ] T083 [US4] Add real-time updates for round status (waiting, in progress, completed)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

### Error Handling & Edge Cases

- [ ] T084 [P] Add participant disconnect handling during round (auto-eliminate)
- [ ] T085 [P] Add validation for minimum participants (2) before allowing round start
- [ ] T086 [P] Add tie handling UI (show all winners)
- [ ] T087 [P] Add offline participant indicator when admin tries to start round with offline participant

### Performance & Optimization

- [ ] T088 [P] Optimize Socket.io event payloads (minimize data sent)
- [ ] T089 [P] Add loading states to all async operations
- [ ] T090 [P] Add error boundaries to React components

### UI/UX Polish

- [ ] T091 [P] Add responsive design for mobile devices (test on smartphone)
- [ ] T092 [P] Add touch-friendly button sizes (min 44x44px)
- [ ] T093 [P] Add animations for button state transitions
- [ ] T094 [P] Add sound effects for button clicks (optional)
- [ ] T095 [P] Add haptic feedback for mobile devices (optional)

### Security Hardening

- [ ] T096 [P] Implement rate limiting for API endpoints
- [ ] T097 [P] Sanitize all user inputs (participant names, team names)
- [ ] T098 [P] Validate all WebSocket events (prevent invalid data)
- [ ] T099 [P] Add CSRF protection for admin routes

### Documentation & Validation

- [ ] T100 Update CLAUDE.md with latest project context
- [ ] T101 Manual verification of all user stories per quickstart-v2.md checklist
- [ ] T102 Test PWA installation on mobile device
- [ ] T103 Test with 10+ participants to verify performance
- [ ] T104 Manual security review (check for XSS, injection vulnerabilities)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: ✅ COMPLETED via quickstart-v2.md
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 completion (needs participant list, game structure)
- **User Story 3 (P2)**: Depends on User Story 2 completion (extends round replay functionality)
- **User Story 4 (P3)**: Can start after User Story 2 (parallel to US3) - Independent spectator view

### Within Each User Story

- Models/services before API endpoints
- API endpoints before UI components
- Core implementation before WebSocket integration
- Manual verification before considering story complete

### Parallel Opportunities

- **Phase 2 Foundational**: T004-T017 can mostly run in parallel (marked with [P])
- **User Story 1**: T018-T021 (auth), T022-T026 (game API), T030-T034 (participant API), T040-T043 (team API) can run in parallel
- **User Story 2**: T047-T052 (round API), T053-T057 (admin UI), T058-T062 (participant UI), T063-T068 (WebSocket) can be developed in parallel by different team members
- **Phase 7 Polish**: Most tasks (T084-T099) can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase, launch all API implementations in parallel:
T022: "Implement gameService in src/lib/services/gameService.ts"
T030: "Implement participantService in src/lib/services/participantService.ts"
T040: "Implement teamService in src/lib/services/teamService.ts"

# Then launch API routes in parallel:
T023-T026: Game endpoints
T031-T032: Participant endpoints
T041-T043: Team endpoints

# Then launch UI components in parallel:
T027-T029: Admin dashboard
T033-T034: Participant join flow
T044: TeamManager component
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
2. Complete Phase 3: User Story 1 (game creation, participant join, teams)
3. **STOP and VALIDATE**: Manually verify User Story 1 independently
4. Complete Phase 4: User Story 2 (round execution, button mechanics, winner determination)
5. **STOP and VALIDATE**: Manually verify User Stories 1 + 2 together
6. Deploy/demo MVP

### Incremental Delivery

1. Complete Setup (✅) + Foundational → Foundation ready
2. Add User Story 1 → Manually verify independently → Deploy/Demo (Participants can join!)
3. Add User Story 2 → Manually verify independently → Deploy/Demo (MVP - Full game playable!)
4. Add User Story 3 → Manually verify independently → Deploy/Demo (Replay functionality)
5. Add User Story 4 → Manually verify independently → Deploy/Demo (Spectator mode)
6. Polish → Final validation → Production release

### Parallel Team Strategy

With multiple developers after Foundational phase:
- **Developer A**: User Story 1 (T018-T046)
- **Developer B**: User Story 2 (T047-T072)
- **Developer C**: Foundational tasks + User Story 3/4

Stories integrate independently through well-defined APIs and WebSocket contracts.

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and verifiable through manual testing per spec.md
- Commit after each task or logical group
- Stop at any checkpoint to manually verify story independently
- **No automated tests** per constitution - use manual verification from spec.md
- Follow constitution: clean code, frontend-backend separation (logical via Next.js structure), simplicity first
- Database migration (T001) must be applied before any database operations
- PWA icons (T002) needed for installable app experience
- WebSocket handlers critical for real-time synchronization (US1, US2)
- Button timing precision (<50ms) critical for fair gameplay (US2)

---

## Total Task Count: 104 tasks

- Phase 1 (Setup): 3 tasks (✅ infrastructure complete)
- Phase 2 (Foundational): 14 tasks
- Phase 3 (US1): 29 tasks
- Phase 4 (US2): 26 tasks
- Phase 5 (US3): 6 tasks
- Phase 6 (US4): 5 tasks
- Phase 7 (Polish): 21 tasks

**Suggested MVP Scope**: Phases 1-4 (User Stories 1 + 2) = 72 tasks for fully playable game
