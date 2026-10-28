# Savvy Hunt — Product Requirements Document (PRD)

**File:** `prd.md`  
**Version:** 1.0  
**Status:** Draft for stakeholder review  
**Last updated:** 28 October 2026  
**Related documents:** `plan.md`, `architectur.md`, `appflow.md`, `techspc.md`, `database.md`, `realtime-data-flow.md`

---

## 1. Product Summary

Savvy Hunt is a public-facing school competition website for displaying event information and live results across multiple competing schools, categories, and events. It includes a secure admin dashboard where authorized staff can create and manage events, enter and correct scores, publish results, and manage event photos sourced from Google Drive.

The defining product experience is a trustworthy live scoreboard: when an authorized admin saves a score, connected visitors should see the affected school totals, category results, and top-three leaderboard update without manually refreshing the page.

### Product proposition

**One trusted place to follow Savvy Hunt before, during, and after the event.** Visitors can check what is happening, see who is leading, follow category results, and browse approved event photos. Organizers can manage event information and results without editing code.

## 2. Product Goals

### Primary goals

1. Make school-wise and category-wise results easy to find and understand.
2. Provide live score updates without manual page refreshes.
3. Give visitors a clear schedule of upcoming, live, and completed events.
4. Show the current top three schools based on the approved overall scoring rules.
5. Publish event photos and highlights from a designated Google Drive folder.
6. Allow authorized admins to create events, enter/correct scores, publish results, and moderate gallery items.
7. Protect the integrity of results with validation, permissions, and an audit trail.
8. Deliver a responsive experience on phones, desktops, and large display screens.

### Success outcomes

- Visitors can find the current standings and event status with minimal navigation.
- A committed score change becomes visible to connected viewers promptly, without reloading the page.
- Admins can manage events and scores without developer involvement.
- Unpublished scores and unapproved photos are not exposed on public pages.
- Organizers can identify and recover from failed Google Drive synchronization.

## 3. Non-Goals for the MVP

Unless approved as a later phase, the first release will not include:

- Student or visitor accounts.
- Public score submissions or voting.
- Event registration, tickets, attendance, or payments.
- Automated judging or score import from external judging systems.
- Native iOS/Android apps.
- Chat, comments, reactions, or social feeds.
- Automated facial recognition or AI-based photo identification.
- Multiple complex admin roles; the MVP can start with one authorized `admin` role.
- A general-purpose content management system beyond event information and gallery metadata.

## 4. Target Users and Needs

### 4.1 Public visitor

May be a student, teacher, parent, guest, or supporter.

Needs:
- View the latest school standings.
- Select a category and inspect its results.
- See which events are upcoming or live.
- Find completed results and winners when published.
- Quickly see the top three schools.
- Browse approved snapshots/highlights on mobile or desktop.

Success for this user means the information is current, legible, and does not require an account or a manual page refresh.

### 4.2 Authorized event admin

A staff member or organizer who is explicitly permitted to manage Savvy Hunt data.

Needs:
- Sign in securely.
- Create and edit events and their schedule/status.
- Enter points against the correct event and school/participant target.
- Correct mistakes with an audit trail.
- Review and publish results.
- See whether Google Drive photo synchronization is healthy.
- Review, label, publish, hide, or remove gallery items.

Success means the admin can perform these tasks with clear validation and confirmation, without accidentally exposing draft data or losing a score correction.

### 4.3 Organizer / product owner

Responsible for the accuracy and public presentation of the program.

Needs:
- Configure schools, categories, and event details.
- Understand the scoring and tie policy.
- Control when results become public.
- Ensure published photos follow the school’s consent and safeguarding process.
- Retain historical event information according to policy.

## 5. Product Principles

1. **Accuracy before animation:** scores and rankings must be correct; visual effects are secondary.
2. **One source of truth:** event-level score records are authoritative; totals are derived by consistent backend rules.
3. **Public by design, admin by permission:** published event information is public, while management operations and draft data are protected.
4. **Real-time but honest:** show confirmed backend results and handle disconnects; never claim an unsaved score is authoritative.
5. **Review before publication:** new Drive photos are synced automatically but require admin approval by default.
6. **Mobile-first:** essential results should work on smaller screens and large shared displays.
7. **Traceability:** score corrections and other sensitive changes should be auditable.
8. **Minimal personal data:** avoid participant details unless the contest format requires them.

## 6. MVP Scope and Priorities

Priority labels:
- **P0 — Must have:** required for a viable event-day launch.
- **P1 — Should have:** important, but can follow after the core workflow is reliable.
- **P2 — Could have:** enhancement for a later release.

| Feature | Priority | MVP requirement |
|---|---|---|
| Public home page | P0 | Show event overview, top three, schedule preview, and latest published snapshots |
| School-wise scoreboard | P0 | Show school totals and ranks using approved scoring rules |
| Category-wise results | P0 | Select a category and view published standings |
| Reactive live updates | P0 | Update connected result views after a committed score change without page refresh |
| Event schedule | P0 | Separate upcoming, live, and completed/result-published events |
| Event details and winners | P0 | Display published event information and results; do not invent missing results |
| Top-three leaderboard | P0 | Show up to three schools based on overall eligible totals |
| Admin authentication/authorization | P0 | Only explicitly authorized admins can access protected data and mutations |
| Event management | P0 | Create/edit events, categories, schedule details, and operational state |
| Score management | P0 | Enter and correct scores with validation and an audit trail |
| Result publication | P0 | Ensure only eligible published results are shown publicly |
| Google Drive gallery sync | P0 | Discover image files in the configured folder and import their metadata/content safely |
| Gallery review and publication | P0 | Approve, hide, caption, and associate images before public display |
| Sync status and retry | P0 | Admin can view last sync status and retry a failed sync safely |
| Audit history | P0 | Capture who changed a score and when, with previous/new values as appropriate |
| Additional admin roles | P2 | Add super-admin, event manager, score manager, or gallery manager if needed |
| Drive push notifications | P2 | Consider if scheduled sync delay is not acceptable |
| Advanced analytics/export reports | P2 | Add if organizers request formal reports |
| High-contrast/projector mode | P1 | Improve readability for large screens, if not covered by the base design |

## 7. Functional Requirements

### 7.1 Public home page

- **FR-HOME-01 (P0):** The home page shall display Savvy Hunt branding and main navigation.
- **FR-HOME-02 (P0):** It shall show an overview of current event activity based on published event data.
- **FR-HOME-03 (P0):** It shall show up to three leading schools based on the approved ranking rules.
- **FR-HOME-04 (P0):** It shall preview upcoming/live events and recently published snapshots where available.
- **FR-HOME-05 (P0):** It shall provide deliberate loading, empty, and error states rather than fabricated data.

### 7.2 School-wise scoreboard

- **FR-SCH-01 (P0):** Visitors shall be able to open the overall school scoreboard without signing in.
- **FR-SCH-02 (P0):** Each row shall include rank, school name, and eligible total points.
- **FR-SCH-03 (P0):** The scoreboard shall use a single, centrally defined backend calculation and tie policy.
- **FR-SCH-04 (P0):** When an eligible score is committed, connected scoreboard clients shall update without manual refresh.
- **FR-SCH-05 (P0):** The page shall handle no-score states and fewer-than-three-school states.
- **FR-SCH-06 (P1):** If approved, the scoreboard may provide an event/category breakdown of each school’s total.

### 7.3 Category-wise results

- **FR-CAT-01 (P0):** Visitors shall be able to see available published categories.
- **FR-CAT-02 (P0):** Visitors shall be able to select a category and see its eligible event results.
- **FR-CAT-03 (P0):** Category results shall update reactively when relevant published score data changes.
- **FR-CAT-04 (P0):** The UI shall distinguish missing/unpublished results from a genuine zero score.
- **FR-CAT-05 (P0):** School-level and participant-level scoring units shall not be combined without a defined aggregation rule.

### 7.4 “Who's Leading?” top three

- **FR-TOP-01 (P0):** The home page shall show up to three schools based on overall eligible totals.
- **FR-TOP-02 (P0):** The top-three list shall update when its underlying published score data changes.
- **FR-TOP-03 (P0):** If fewer than three schools qualify, the UI shall show only available entries.
- **FR-TOP-04 (P0):** Tie behavior shall match the approved ranking rule.

### 7.5 Event schedule and event details

- **FR-EVT-01 (P0):** Visitors shall be able to filter or navigate between upcoming, live, and completed/results views.
- **FR-EVT-02 (P0):** Event cards shall show available approved fields such as name, category, schedule, venue, and status.
- **FR-EVT-03 (P0):** Event detail pages shall display published results and winners when available.
- **FR-EVT-04 (P0):** Event status and result publication state shall be separate concepts.
- **FR-EVT-05 (P0):** A completed event shall not automatically be treated as having final/published results.
- **FR-EVT-06 (P0):** Admins shall be able to change operational status through validated backend operations.
- **FR-EVT-07 (P1):** The site may retain historical events/results after the program, subject to retention decisions.

### 7.6 Admin access

- **FR-AUTH-01 (P0):** Admin functionality shall require authentication through a supported identity provider.
- **FR-AUTH-02 (P0):** A signed-in identity shall only be considered an admin if the backend confirms active admin authorization.
- **FR-AUTH-03 (P0):** There shall be no public admin self-registration in the MVP.
- **FR-AUTH-04 (P0):** Every admin query and mutation shall independently enforce authorization.
- **FR-AUTH-05 (P0):** Disabled or removed admins shall lose access to protected operations.
- **FR-AUTH-06 (P0):** Admin sign-out and expired-session handling shall be supported.

### 7.7 Event management

- **FR-ADM-EVT-01 (P0):** Admins shall be able to create an event with a required name and category.
- **FR-ADM-EVT-02 (P0):** Admins shall be able to edit event metadata, schedule, venue, and description where applicable.
- **FR-ADM-EVT-03 (P0):** Admins shall be able to manage event operational status using allowed transitions.
- **FR-ADM-EVT-04 (P0):** The backend shall reject invalid category references and invalid time ranges.
- **FR-ADM-EVT-05 (P0):** High-impact changes to completed/published events shall require explicit confirmation and create an audit record.
- **FR-ADM-EVT-06 (P1):** Events with historical scores should be archived rather than hard-deleted.

### 7.8 Score entry and correction

- **FR-SCORE-01 (P0):** Admins shall be able to select an event and a valid scoring target.
- **FR-SCORE-02 (P0):** Admins shall be able to enter a score and submit it to the backend.
- **FR-SCORE-03 (P0):** The backend shall validate the admin, event, target, score range, and event/result state.
- **FR-SCORE-04 (P0):** Score records shall store event-level values, not only a manually edited overall total.
- **FR-SCORE-05 (P0):** A successful score change and its audit entry shall be written consistently, preferably in one mutation.
- **FR-SCORE-06 (P0):** The UI shall not show a score as saved until the backend confirms success.
- **FR-SCORE-07 (P0):** Admins shall be able to correct a previously entered score according to the approved correction policy.
- **FR-SCORE-08 (P0):** Corrections shall capture actor and timestamp and retain before/after values where appropriate.
- **FR-SCORE-09 (P0):** Concurrent/stale edits shall not silently overwrite newer values; apply a revision check or defined conflict policy if necessary.
- **FR-SCORE-10 (P0):** Totals, category rankings, and the top-three leaderboard shall use the same central scoring rules.

### 7.9 Result publication

- **FR-PUB-01 (P0):** Draft/unpublished scores shall not be included in public queries by default.
- **FR-PUB-02 (P0):** Authorized admins shall be able to publish results if a separate publication workflow is enabled.
- **FR-PUB-03 (P0):** Public pages shall distinguish unpublished results from published results.
- **FR-PUB-04 (P0):** Finalization/reopening of results shall follow an explicit, audited policy.
- **FR-PUB-05 (P0):** A score correction shall update all affected subscribed public views after successful commit.

### 7.10 Gallery and Google Drive

- **FR-GAL-01 (P0):** The integration shall read only from a designated Savvy Hunt Drive folder.
- **FR-GAL-02 (P0):** The backend shall sync eligible image metadata and content using server-side credentials.
- **FR-GAL-03 (P0):** Drive file ID shall be used as the source identifier to prevent duplicates.
- **FR-GAL-04 (P0):** The sync process shall validate source folder, MIME type, file size, and import state.
- **FR-GAL-05 (P0):** New items shall be marked pending review by default.
- **FR-GAL-06 (P0):** Only approved/published, available gallery items shall appear in public gallery queries.
- **FR-GAL-07 (P0):** Admins shall be able to approve, hide, caption, and associate gallery items with events/categories as needed.
- **FR-GAL-08 (P0):** The admin dashboard shall show the last successful sync and safe error status.
- **FR-GAL-09 (P0):** Sync retries shall be idempotent and shall not create duplicate items.
- **FR-GAL-10 (P0):** When a source file becomes unavailable, the application shall apply the configured hide/unavailable policy.
- **FR-GAL-11 (P0):** Google OAuth secrets and refresh tokens shall never be exposed to the browser.
- **FR-GAL-12 (P1):** A protected “Sync now” control may be provided to authorized admins.
- **FR-GAL-13 (P2):** Drive push notifications may be added if scheduled sync latency is insufficient.

## 8. Key User Stories

### Public visitor stories

- As a visitor, I want to see overall school standings so I can understand which school is leading.
- As a visitor, I want to choose a category so I can follow results relevant to that competition.
- As a visitor, I want scores to update without refreshing so I can follow the event live.
- As a visitor, I want to see upcoming and live events so I know what is happening now and next.
- As a visitor, I want to see winners once results are published so that I can trust the information.
- As a visitor, I want to browse approved event photos so I can see highlights from Savvy Hunt.

### Admin stories

- As an admin, I want secure sign-in so only authorized organizers can change official information.
- As an admin, I want to create and edit events so the public schedule stays accurate.
- As an admin, I want to enter and correct scores so results reflect the official score sheet.
- As an admin, I want a clear save confirmation and validation messages so I know whether a score was committed.
- As an admin, I want score changes to be recorded so mistakes can be traced and corrected.
- As an admin, I want uploaded Drive images to appear in a review queue so I can publish appropriate photos.
- As an admin, I want sync status and retry options so I can respond to Drive integration failures.

## 9. Critical End-to-End Workflows

### Workflow A — Live score update

1. Admin signs in.
2. Backend confirms the user is an active authorized admin.
3. Admin selects event and school/participant target.
4. Admin enters the score and submits.
5. Convex validates the request and commits the score plus audit record.
6. Admin receives success confirmation.
7. Reactive queries recompute/update the affected category results, school totals, and top-three list.
8. Connected public clients render the new data without reload.

**Acceptance criteria:** No public score changes before successful commit; affected live views update without a manual refresh; unauthorized requests are rejected; changes are auditable.

### Workflow B — Publish event results

1. Admin reviews the event’s saved scores.
2. The backend calculates standings using the defined rules.
3. Admin publishes/finalizes results if required by the configured workflow.
4. Public queries begin returning eligible results.
5. Event details, category results, schedule, and overall scoreboard update as appropriate.

**Acceptance criteria:** Draft data remains private; no result is labeled final without an authorized finalization; tie behavior is consistent.

### Workflow C — Publish a Drive image

1. Organizer uploads an image to the designated Drive folder.
2. Scheduled sync discovers the file and validates it.
3. The backend downloads/copies the image into controlled storage and upserts metadata by Drive file ID.
4. The new item is placed in the pending-review queue.
5. Admin checks the image, caption, and event association, then publishes it.
6. Public gallery query returns the item; connected gallery views update reactively.

**Acceptance criteria:** Private Drive credentials are never exposed; repeated sync does not duplicate the item; unapproved photos remain unavailable through public queries.

## 10. Non-Functional Requirements

### 10.1 Performance

- **NFR-PERF-01:** Public pages should be responsive under the expected school-event traffic; actual targets must be validated against expected viewers and service limits.
- **NFR-PERF-02:** A committed score change should normally appear to connected clients within a few seconds on a healthy network. This is a target, not a hard real-time guarantee.
- **NFR-PERF-03:** Public leaderboard queries should use suitable indexes and avoid one database query per displayed row.
- **NFR-PERF-04:** Gallery pages should paginate or progressively load images and use appropriate image sizes.

### 10.2 Reliability

- **NFR-REL-01:** Failed mutations must not be presented as successful.
- **NFR-REL-02:** The UI shall handle loading, empty, error, offline/reconnecting, and permission-denied states.
- **NFR-REL-03:** Drive sync shall be idempotent and recoverable after transient failures.
- **NFR-REL-04:** A failed Drive run shall preserve the last known safe gallery state, subject to the removal policy.
- **NFR-REL-05:** The event team shall test realistic concurrent viewers before event day.

### 10.3 Security

- **NFR-SEC-01:** Every protected backend query/mutation shall enforce authorization.
- **NFR-SEC-02:** Public queries shall exclude draft scores, internal audit records, sync diagnostics, and secret fields.
- **NFR-SEC-03:** Secrets shall be stored in server-side environment/secret storage and never in browser-exposed variables.
- **NFR-SEC-04:** Sensitive changes shall be auditable.
- **NFR-SEC-05:** Gallery media shall not be publicly served until intentionally published.
- **NFR-SEC-06:** Admin account removal/disablement shall revoke access to protected operations.

### 10.4 Usability and accessibility

- **NFR-UX-01:** The website shall support mobile, desktop, and large-screen display layouts.
- **NFR-UX-02:** Score, rank, school name, category, and event status shall be easy to scan.
- **NFR-UX-03:** Status shall not be conveyed by color alone.
- **NFR-UX-04:** Interactive controls shall be keyboard accessible and use clear labels.
- **NFR-UX-05:** Live updates shall avoid excessive animation or disruptive row movement.
- **NFR-UX-06:** Images shall have meaningful alt text where available.

### 10.5 Privacy and content governance

- **NFR-PRIV-01:** Collect only personal data required for the event.
- **NFR-PRIV-02:** The school shall confirm permission/consent requirements before publishing student photos.
- **NFR-PRIV-03:** Admins shall have a way to hide/remove a photo promptly.
- **NFR-PRIV-04:** Retention for historical results, audits, and photos shall be agreed with the organizers.

## 11. Product Analytics and Success Metrics

No third-party analytics platform is required for MVP. The team should nevertheless review these outcomes during testing and after the event:

| Metric | Desired outcome | How to assess |
|---|---|---|
| Score update correctness | Every accepted score produces the correct affected totals and ranks | Automated tests and event-day spot checks |
| Live update delay | Usually a few seconds or less on healthy connections | Timestamp/controlled multi-browser rehearsal |
| Unauthorized write attempts | Zero successful protected writes by non-admins | Security tests and safe backend logs |
| Duplicate scores or gallery records | No unintended duplicates | Integration tests and reconciliation review |
| Result publication accuracy | Public results match organizer-approved results | Pre-launch score-sheet verification |
| Gallery publication compliance | Only approved images appear publicly | Admin review and public-query tests |
| Admin task completion | Admin can create event, enter/correct score, publish result, and publish/hide image without developer help | Rehearsal with actual admins |
| Mobile readability | Core pages usable on target phones | Manual responsive testing |

Quantitative traffic, latency, and uptime targets should be finalized after expected concurrency and service plans are known.

## 12. MVP Definition of Done

The MVP is ready for event use when all of the following are true:

- [ ] Public visitor can open the home page without signing in.
- [ ] School-wise scoreboard shows correct totals and ranks.
- [ ] Visitor can select a category and view its published results.
- [ ] Committed score changes update connected public views without manual refresh.
- [ ] “Who's Leading?” reflects the same overall scoring rules as the main scoreboard.
- [ ] Upcoming, live, and completed events are represented correctly.
- [ ] Published event details show results/winners only when available.
- [ ] Admin authentication and backend authorization are tested.
- [ ] Unauthorized users cannot create events, change scores, publish results, or manage gallery items.
- [ ] Admin can create/edit events and enter/correct scores.
- [ ] Score audit history identifies actor/time and records changes as required.
- [ ] Draft/unpublished scores do not appear in public queries.
- [ ] Google Drive sync discovers eligible files from the designated folder.
- [ ] Gallery metadata upsert is idempotent and does not create duplicates.
- [ ] New photos remain pending review by default.
- [ ] Only approved gallery items appear publicly.
- [ ] Sync failure is visible to admins and can be retried.
- [ ] Public pages work on mobile, desktop, and large screens.
- [ ] Photo consent/removal process is agreed.
- [ ] Production configuration and rollback procedures are documented.

## 13. Dependencies

- Vercel project and production domain.
- Convex development and production deployments.
- A selected authentication provider and the corresponding Convex integration.
- A designated Google Drive folder and working server-side access credentials.
- Confirmed event list, school list, categories, schedule, and official scoring rules.
- Approved event branding, logos, and visual assets if supplied.
- School policy for photo publication, especially images of students/minors.
- Expected concurrent audience and service-plan review.

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scoring rules remain unclear | Incorrect totals or leaderboard | Confirm target type, aggregation, score range, and tie policy before final schema/query implementation |
| Admin enters wrong score | Incorrect public results | Validation, review, correction workflow, and audit history |
| Concurrent admins overwrite values | Lost update | Revision checks or explicit conflict handling; test simultaneous edits |
| Draft data leaks publicly | Loss of trust | Separate public queries and backend authorization tests |
| Drive sync is delayed or fails | Gallery is stale | Show sync health, retries, scheduled reconciliation, and idempotent upserts |
| Private image URL is exposed | Privacy risk | Copy images into controlled storage only after validation and publish approval |
| Student photo published without permission | Safeguarding/privacy risk | Default moderation, clear responsibility for consent, and rapid removal process |
| Free-tier or plan limits are exceeded | Degraded service during event | Estimate peak traffic, verify current plan limits, rehearse, and define upgrade/contingency plan |
| Schedule/status is inaccurate | Visitors are misinformed | Admin-managed operational status and event rehearsal |

## 15. Open Product Decisions

These decisions must be confirmed before implementation is treated as final:

1. **Scoring target:** Are points entered for schools, individual participants, or both depending on the event?
2. **Aggregation:** If individual participants earn points, do those points count toward their school total?
3. **Score format:** Whole numbers only, or decimals? Are negative points, penalties, or bonuses allowed?
4. **Score composition:** Is one score allowed per school per event, or can an event have multiple score components?
5. **Tie policy:** Shared rank, tie-breaker, or organizer-decided outcome?
6. **Publication:** Are saved scores public immediately, or do admins explicitly publish them? Are provisional results needed?
7. **Corrections:** Can final results be edited, and should a reason be mandatory?
8. **Zero-score schools:** Should schools with no eligible score appear on the overall leaderboard?
9. **Admin accounts:** Is a single admin role sufficient? Who provisions the first admin?
10. **Google Drive:** Personal Google account or school-managed Google Workspace? Is a few-minute sync delay acceptable?
11. **Photo moderation:** Must each image be approved, or may a particular folder publish automatically?
12. **Image delivery:** Is Convex file storage adequate for expected image volume and public delivery needs?
13. **Retention:** Should previous events, results, audit history, and photos remain available after the event?
14. **Scale:** Approximate number of schools, categories, events, gallery photos, admins, and peak simultaneous viewers?
15. **Time zone:** Confirm the event schedule timezone. `Asia/Kolkata` is a reasonable default if the event is in India.
16. **Branding:** Are there official colors, logos, font preferences, or design references?

## 16. Recommended Delivery Phases

### Phase 1 — Confirm product rules
- Resolve score target, aggregation, tie behavior, publication, and gallery policy.
- Confirm schools, categories, events, schedule, audience scale, and branding.

### Phase 2 — Secure foundation
- Set up Next.js, TypeScript, Vercel, Convex, and the selected auth provider.
- Implement schema, admin allow-list, authorization, and audit primitives.

### Phase 3 — Event and score operations
- Implement event creation/editing and status transitions.
- Implement score entry, corrections, validation, and publication.
- Test aggregation and tie rules.

### Phase 4 — Public experience and reactive updates
- Implement home, overall scoreboard, category results, schedule, event detail, and top three.
- Connect Convex reactive queries and test with multiple simultaneous browsers.

### Phase 5 — Drive gallery
- Implement secure Drive sync, image validation, controlled storage, moderation, and removal behavior.
- Test idempotency and failed-sync recovery.

### Phase 6 — Acceptance and launch
- Run unit, integration, authorization, and end-to-end tests.
- Rehearse the whole event workflow with actual admins.
- Verify photo policy, production configuration, service limits, and rollback steps.

## 17. Related Documentation

- `plan.md` — product scope and implementation roadmap.
- `architectur.md` — system architecture and service boundaries.
- `appflow.md` — visitor/admin workflows and state transitions.
- `techspc.md` — technical requirements, function contracts, validation, and security.
- `database.md` — Convex schema and data-access design.
- `realtime-data-flow.md` — live scoreboard data flow and reactive update mechanism.

---

**Product owner sign-off:** ____________________  
**Date:** ____________________  
**Scoring rules confirmed by:** ____________________  
**Photo publication policy confirmed by:** ____________________
