# Savvy Hunt Website --- Project Plan

**Document status:** Initial implementation plan\
**Version:** 1.0\
**Prepared:** 28 October 2026\
**Status:** Ready for review; unresolved decisions are listed at the
end.

------------------------------------------------------------------------

## 1. Project Overview

Savvy Hunt is a school event website for publishing live event
information and results for multiple competing schools. It will provide
a public-facing website for students, teachers, visitors, and
supporters, alongside a secure admin area for managing events, scores,
schedules, and photo highlights.

### Primary goals

1.  Display school-wise and category-wise scores clearly.
2.  Publish score changes in real time, without requiring visitors to
    refresh.
3.  Show upcoming and live events, completed results, and winners.
4.  Highlight the current top three schools/participants in a "Who's
    Leading?" section.
5.  Display event photos and highlights sourced from Google Drive.
6.  Allow authorized admins to create events, update scores, and manage
    the gallery.
7.  Keep the system practical to deploy on Vercel with Convex as the
    application database and real-time backend.

### Out of scope for the first version

-   Student accounts or public score submissions.
-   Automated scoring from judging devices.
-   Ticketing, payments, registrations, or attendance tracking.
-   A native mobile app.
-   AI-generated results or automatic interpretation of judge sheets.
-   A public-facing admin registration page.

These can be considered later if the event organizers need them.

------------------------------------------------------------------------

## 2. Recommended Technology Stack

  -----------------------------------------------------------------------
  Area                    Recommendation          Reason
  ----------------------- ----------------------- -----------------------
  Hosting                 Vercel                  Simple deployment,
                                                  previews, custom
                                                  domains, and frontend
                                                  hosting

  Frontend                Next.js + React +       Strong routing,
                          TypeScript              server-rendered public
                                                  pages, and maintainable
                                                  typed UI

  Styling                 Tailwind CSS            Consistent responsive
                                                  design and fast UI
                                                  implementation

  UI components           Accessible component    Consistent components
                          primitives, such as     without locking the
                          shadcn/ui where         project into a large UI
                          suitable                framework

  Database                Convex                  Managed database,
                                                  queries/mutations, and
                                                  reactive real-time
                                                  subscriptions

  Live updates            Convex reactive queries Scoreboards and event
                                                  states can update
                                                  without manual refresh

  Authentication          Convex Auth or a        Admin-only access;
                          supported               choose the final
                          authentication provider provider before
                          integrated with Convex  implementation

  Image source            Google Drive            Organizers can upload
                          integration             event photos to a
                                                  designated Drive folder

  Validation              Zod or equivalent       Validate admin input
                          schema validation       and external data

  Testing                 Vitest + React Testing  Verify scoring, access
                          Library; Playwright for control, and public
                          critical end-to-end     pages
                          flows                   

  Source control          GitHub                  Version history and
                                                  Vercel deployment
                                                  integration
  -----------------------------------------------------------------------

### Architecture principles

-   Use Convex as the source of truth for events, scores, results, and
    admin-managed metadata.
-   Use Convex subscriptions for live scoreboards and event status.
-   Treat Google Drive as the photo source, not the source of event
    scores or results.
-   Never expose Convex admin credentials, Google OAuth client secrets,
    refresh tokens, or private API credentials in browser code.
-   Use TypeScript end-to-end where practical.
-   Build mobile-first; the public scoreboard must work well on phones
    and on a large display/projector.
-   Keep scoring rules explicit and testable rather than embedding them
    in UI components.

------------------------------------------------------------------------

## 3. User Types and Permissions

### Public visitor

Can: - View the home page and current event status. - View the
school-wise scoreboard. - View category-wise results. - View the event
schedule. - View upcoming and live events. - View published results and
winners. - View the top-three leaderboard. - View published gallery
photos and highlights.

Cannot: - Edit events, scores, winners, or gallery settings. - Access
admin-only data or mutation endpoints.

### Authorized admin

Can, subject to the agreed admin policy: - Sign in to the admin
dashboard. - Create and edit events. - Set an event's schedule and
status. - Enter and correct scores. - Publish results and winners. -
Review sync status for Google Drive photos. - Hide or unpublish
inappropriate or incorrect gallery items.

The initial requirement is "authorized admins only." The initial
implementation should not offer public admin sign-up. Admin accounts
should be provisioned through a controlled process.

### Recommended future role separation

Not required for the first version, but the data model should not
prevent adding roles later: - **Super admin:** manages admin access and
event configuration. - **Event manager:** manages events and
schedules. - **Score manager:** enters and corrects scores. - **Gallery
manager:** reviews and publishes photos.

For the first version, a single `admin` role is sufficient unless the
organizers request otherwise.

------------------------------------------------------------------------

## 4. Public Website Information Architecture

### 4.1 Home page

Purpose: provide a quick overview of Savvy Hunt and direct visitors to
the most useful information.

Recommended sections: 1. **Header:** Savvy Hunt branding and navigation.
2. **Event status:** upcoming, live, or completed status based on
configured event dates and admin-controlled status. 3. **Who's
Leading?:** current top three schools based on the approved overall
scoring rule. 4. **Live updates:** a compact list of recently updated
categories or events. 5. **Event schedule preview:** upcoming and live
events first. 6. **Latest snapshots:** recently published event photos
and highlights. 7. **Footer:** event identity, organizer/school
information, and contact details if supplied.

Do not invent school names, event names, sponsors, dates, or contact
details. Use configured data or clearly marked placeholders during
development.

### 4.2 Scoreboard

Provide two distinct views with a clear switcher or tabs.

#### A. School-wise results

Display one row per school, with: - Rank - School name - Total points -
Optional breakdown by category, if organizers want it - Last updated
indicator where useful

Requirements: - Sort by total points, descending. - Show ties
consistently using the agreed ranking rule. - Update automatically when
scores change. - Include a visible "Last updated" time or live
connection status. - Handle empty results and loading/error states.

#### B. Category-wise results

Visitors should be able to choose a category and see the relevant
results.

Display: - Category name - Event(s) included in that category - School
or participant, depending on how that event is scored - Points - Rank,
where applicable - Result status: pending, provisional, or final, if
this distinction is approved

Requirements: - Filter by category. - Avoid combining unlike scoring
units (for example, participant points and school points) without an
explicit aggregation rule. - Show a clear message if a category has no
published results. - Support a category with multiple events if the
competition format requires it.

### 4.3 Real-time category updates

-   Subscribe to relevant Convex queries for the selected category.
-   When an authorized admin saves a score, public clients should
    receive the change without a page reload.
-   Show a subtle "Live" indicator while the subscription is healthy.
-   Handle disconnected clients gracefully and reconnect when possible.
-   Avoid claiming that results are final unless an admin has explicitly
    finalized them.
-   Record score changes in an audit history.

### 4.4 Event schedule

Organize events into these sections or filters:

-   **Upcoming:** scheduled events that have not started.
-   **Live:** events currently in progress.
-   **Results & Winners:** completed events with published results.

Each event card/detail should support: - Event name - Category - Date -
Start/end time, if known - Venue/location, if supplied - Status - Short
description, if supplied - Result/winner summary after publication

The event status should be controlled by a combination of admin actions
and schedule metadata. Do not rely exclusively on the browser's current
time to infer the official status, since organizers may need to pause,
delay, or manually change an event.

### 4.5 "Who's Leading?" --- Top 3

-   Show the top three schools based on overall total points.
-   Include school name, rank, and total points.
-   Update automatically as scores change.
-   If there are fewer than three schools with scores, show the
    available entries rather than fabricated ones.
-   Define and document tie handling.
-   Do not show participant-level rankings in this section unless the
    organizers specifically request that behavior.

### 4.6 Snapshot / Gallery

-   Display approved event photos and highlights from the designated
    Google Drive folder.
-   Organize photos by event/category or date if the available metadata
    supports it.
-   Show thumbnails, captions where available, and an optional event
    label.
-   Use responsive image sizes and lazy loading.
-   Provide an empty state when no photos are available.
-   Do not expose private Drive folder contents or any file that is not
    approved for public display.
-   Include a way to hide/unpublish a photo without needing to delete
    the original Drive file.

------------------------------------------------------------------------

## 5. Admin Dashboard

Protect every admin route and every admin mutation. Hiding an admin link
in the UI is not sufficient access control.

### 5.1 Admin sign-in

-   Provide a dedicated admin sign-in page.
-   Do not allow public registration.
-   Validate the user's identity and admin authorization on the
    server/backend.
-   Use secure session handling through the selected auth solution.
-   Add rate limiting or equivalent protections where supported.
-   Provide a sign-out action.
-   Do not put secrets in client-side environment variables.
-   Return a safe unauthorized response for non-admin requests.

### 5.2 Dashboard overview

Recommended widgets: - Number of upcoming events - Number of live
events - Number of events awaiting result publication - Latest score
changes - Google Drive sync status and last successful sync - Quick
links to create an event, update scores, and review gallery items

### 5.3 Live events and event management

Admins should be able to: - Create an event. - Edit event details. -
Assign a category. - Set date, time, venue, and description when
applicable. - Set status: upcoming, live, paused/postponed if needed,
completed. - Publish or unpublish event information. - Mark an event's
results as provisional or final if those states are approved. - View
related scores and result publication status.

Validation: - Require an event name and category. - Validate date/time
fields. - Prevent accidental duplicate submissions. - Warn before
changing the status of an event that already has published results. -
Keep a record of important edits.

### 5.4 Scoreboard administration

Admins should be able to: - Select an event/category. - Select the
relevant school or participant. - Enter a point value. - Save and see
validation feedback. - Correct a previously entered score with a reason,
if required. - Review the resulting school totals and category
standings. - Finalize or publish results, if the event workflow uses
publication states.

Important scoring rules: - Scores must be stored as structured records,
not only as a manually edited total. - The system should calculate
derived totals from score records to reduce inconsistency. - If the
organizers need direct total overrides, those should be a separate,
explicit feature with an audit trail. - Validate allowed score ranges
and decimal/whole-number rules once agreed. - Ensure simultaneous admin
edits do not silently overwrite one another. - Record who made each
change and when. - A correction should update the live public scoreboard
immediately after the mutation succeeds.

### 5.5 Gallery administration

The initial gallery workflow should be: 1. An organizer uploads photos
to a designated Google Drive folder. 2. The integration discovers
eligible image files. 3. The website imports file metadata and a safe
display reference. 4. New items appear in an admin review queue if
moderation is enabled. 5. An authorized admin publishes, hides, or
labels each item. 6. Published items appear in the public gallery.

If organizers want every new image to appear automatically, that can be
configured---but it increases the risk of publishing accidental,
duplicate, private, or inappropriate files. The default recommendation
is to sync automatically but require approval before public display.

------------------------------------------------------------------------

## 6. Google Drive Gallery Integration

### 6.1 Recommended approach

Use a dedicated Google Drive folder for Savvy Hunt gallery images. The
website should only read from this folder, with access configured
deliberately.

There are two main implementation approaches:

**Option A --- Scheduled synchronization (recommended starting
point)** - A protected backend job checks the designated folder on a
schedule. - It discovers new, updated, or deleted/trashed files. - It
stores relevant metadata in Convex. - The public website reads the
approved gallery list from Convex. - This is easier to operate than a
full Drive push-notification integration.

**Option B --- Google Drive push notifications** - Google Drive sends
change notifications to a configured webhook. - The backend processes
notifications and fetches updated file metadata. - Notifications need
channel lifecycle management and periodic reconciliation. - This may be
worthwhile if near-instant gallery updates are essential.

Convex real-time subscriptions can update the website as soon as the
backend writes the new gallery metadata. However, this does not make
Google Drive itself a real-time database. The delay between uploading a
photo and detecting it depends on the Drive synchronization method.

### 6.2 Security and image delivery

-   Use a dedicated Drive folder and least-privilege access.
-   Keep OAuth secrets and refresh tokens in server-side secret storage.
-   Never place a private Drive access token in frontend code.
-   Do not assume that a private Drive file URL can be rendered by every
    public visitor.
-   Decide whether images will be publicly accessible through a
    controlled Drive sharing configuration or copied to a public
    image-serving platform/object storage.
-   Prefer stable image delivery and thumbnails; avoid relying on
    temporary or authenticated download URLs.
-   If using Drive API, check the file MIME type and only accept
    supported image formats.
-   Consider file size limits and image dimension limits.
-   Avoid exposing unrelated Drive files or folder structure.
-   Document what happens when an image is removed, trashed, or loses
    permission.
-   Consider consent and safeguarding before publishing photos of
    students, especially minors.

### 6.3 Sync metadata

Store only the information the app needs, for example: - Google Drive
file ID - File name - MIME type - Modified time from Drive - Drive
folder/source identifier - Public display reference or delivery URL, if
safe and stable - Caption/alt text - Associated event/category, if
assigned - Publication status - Last sync time - Sync error state, if
any

Do not treat a file name as a unique ID; use the Drive file ID.

### 6.4 Sync behavior and failure handling

-   Synchronization must be idempotent: processing the same Drive file
    twice must not create duplicate gallery entries.
-   Use Drive file IDs to upsert metadata.
-   Record sync errors without exposing secret details to public users.
-   Retry transient failures with sensible limits.
-   Provide an admin-visible last-sync time and error status.
-   Periodically reconcile the folder so missed notifications or
    temporary failures do not permanently hide changes.
-   Do not automatically publish files outside the configured folder.
-   If a synced file disappears or becomes inaccessible, mark it
    unavailable and apply the agreed public-gallery policy.

### 6.5 Vercel and scheduled jobs

Vercel can host the Next.js site and scheduled functions, subject to the
current plan's execution limits and cron availability. Before choosing a
schedule, verify the deployment plan's cron frequency, runtime limits,
and environment-variable support. Keep the sync process short and
resumable; use pagination for large folders.

Do not assume that a long-running background worker can remain active
indefinitely in a Vercel function.

------------------------------------------------------------------------

## 7. Data Model Proposal for Convex

This is a starting schema, not a final schema. It should be adjusted
once the organizers confirm whether each event awards points to schools,
individuals, or both.

### `admins` / authorization data

-   Auth provider user ID
-   Role (initially `admin`)
-   Active/disabled status
-   Created/updated timestamps

Use the selected authentication provider's supported identity model;
avoid maintaining duplicate passwords in the app database.

### `schools`

-   `name`
-   `slug` or stable identifier
-   Optional logo reference
-   Active status
-   Created/updated timestamps

### `categories`

-   `name`
-   `slug` or stable identifier
-   Optional description
-   Display order
-   Active status

### `events`

-   `name`
-   Category ID
-   Optional description
-   Optional venue
-   Start and end timestamps
-   Status
-   Publication state
-   Optional result-finalized timestamp
-   Created by / updated by
-   Created/updated timestamps

### `participants` (only if needed)

-   Display name or approved participant label
-   School ID
-   Optional category/team association
-   Active status

Avoid collecting student personal details unless the competition
requires them.

### `scores`

-   Event ID
-   School ID and/or participant ID, according to the approved scoring
    model
-   Points
-   Optional note/reason
-   Status (for example, provisional/final if needed)
-   Created by / updated by
-   Created/updated timestamps

Validation should ensure that a score refers to a valid event and a
valid school/participant target. Define whether an event may have one
score record per school or multiple score components.

### `scoreAuditLog`

-   Score ID or related entity ID
-   Action (created/updated/deleted/finalized)
-   Previous value and new value where appropriate
-   Reason for correction, if required
-   Admin identity
-   Timestamp

Treat audit records as append-only from normal admin UI flows.

### `galleryItems`

-   Drive file ID
-   File name and MIME type
-   Safe image delivery reference
-   Caption/alt text
-   Associated event/category IDs, if any
-   Publication status
-   Drive modified timestamp
-   Last synced timestamp
-   Admin reviewer/publisher and timestamps, if moderation is enabled

### `settings`

-   Event display settings
-   Scoring/ranking configuration
-   Designated Drive folder ID
-   Gallery publication policy
-   Other non-secret application settings

Do not store OAuth client secrets or refresh tokens in ordinary
public-readable application settings.

### Optional `syncRuns`

-   Start/end time
-   Outcome
-   Number of files checked/imported/updated
-   Error summary safe for admins
-   Cursor/checkpoint where necessary

------------------------------------------------------------------------

## 8. Scoring and Leaderboard Rules

The requirement says admins manually enter points for each
school/participant. The application should preserve that flexibility
while avoiding inconsistent totals.

### Proposed calculation

-   Each score belongs to a specific event and scoring target.
-   School totals are derived by summing eligible score records for that
    school, according to the approved inclusion rules.
-   Category totals are derived only from events belonging to that
    category.
-   The top-three list is calculated from the overall school totals.
-   The category leaderboard is calculated from the score records
    relevant to that category.
-   Draft/unpublished scores should not appear publicly unless the
    organizers choose to show provisional results.

### Decisions required before implementation

1.  Are points entered for each school, each participant, or either
    depending on the event?
2.  If points are entered for participants, do those points contribute
    to their school's overall total?
3.  Does every event count toward the overall school total?
4.  Are there bonus points, penalties, or dropped/voided scores?
5.  How are ties ranked: shared rank, tie-breaker, or a manual decision?
6.  Can published/final scores be edited? If yes, should a reason be
    mandatory?
7.  Do public pages show provisional results, final results, or both?

**Recommended default:** show published scores only; calculate school
totals from event-level score records; keep a full audit trail for
corrections; use shared ranks for equal totals until the organizers
define a tie-break rule.

------------------------------------------------------------------------

## 9. Suggested Routes

### Public routes

-   `/` --- home and overview
-   `/scoreboard` --- school-wise leaderboard
-   `/scoreboard/categories` --- category-wise results
-   `/scoreboard/categories/[categorySlug]` --- results for a specific
    category
-   `/schedule` --- upcoming, live, completed events
-   `/events/[eventId]` --- event detail and published result
-   `/gallery` --- snapshots and highlights

### Admin routes

-   `/admin/login` --- sign-in
-   `/admin` --- dashboard
-   `/admin/events` --- list and manage events
-   `/admin/events/new` --- create event
-   `/admin/events/[eventId]` --- edit event and status
-   `/admin/scores` --- enter and correct scores
-   `/admin/results` --- review/finalize/publish results
-   `/admin/gallery` --- review and manage gallery
-   `/admin/settings` --- restricted configuration, including Drive
    integration status

Route names may change during implementation, but public and admin areas
should remain clearly separated.

------------------------------------------------------------------------

## 10. Backend Functions and API/Mutation Responsibilities

With Convex, use queries for reads, mutations for validated data
changes, and actions for external services such as Google Drive API
calls.

### Public queries

-   List published schools.
-   Get school totals and ranks.
-   List categories.
-   Get published category results.
-   List upcoming/live/completed published events.
-   Get an event's published details and results.
-   Get the current top three schools.
-   List published gallery items.
-   Get public event-status summaries.

### Admin mutations

-   Create/update/archive an event.
-   Change event status.
-   Create/update a score.
-   Publish or finalize a result.
-   Publish/hide a gallery item.
-   Update permitted application settings.

Every admin mutation must independently verify the authenticated user's
authorization and validate input. UI-only permission checks are
insufficient.

### External integration actions

-   Synchronize Drive folder contents.
-   Fetch file metadata.
-   Reconcile missing or changed files.
-   Report sync status to authorized admins.

Actions that call Google APIs should be server-side only. Avoid making
an external network request on every public page render if the same data
can be served from Convex.

------------------------------------------------------------------------

## 11. Real-Time Update Flow

1.  An admin signs in and opens the score management page.
2.  The admin selects an event and scoring target.
3.  The admin submits a score.
4.  The backend validates identity, permissions, target IDs, allowed
    point values, and event state.
5.  The mutation writes the score and its audit entry.
6.  Convex reactive queries update subscribed clients.
7.  Public school totals, category results, and the top-three section
    recalculate and render the latest eligible data.
8.  The UI displays success or an actionable error.

### Reliability requirements

-   Do not show an optimistic "saved" state before the backend confirms
    success.
-   Prevent duplicate submissions where possible.
-   Handle network disconnects and reconnects.
-   Show clear errors if a score cannot be saved.
-   Use server-side timestamps for audit records.
-   Make score corrections traceable.
-   Test simultaneous admin edits and stale form submissions.

------------------------------------------------------------------------

## 12. Security, Privacy, and Data Integrity

Minimum requirements: - Admin-only authentication and server-side
authorization. - No public admin sign-up. - Validate every mutation. -
Restrict public queries to published/approved data. - Keep secrets
server-side. - Avoid logging credentials, tokens, or private student
data. - Use secure deployment environment variables. - Limit the Google
Drive integration to the designated folder and necessary permissions. -
Add audit records for score changes and result publication. - Add safe
error handling that does not expose secrets. - Use dependency updates
and basic security checks in CI. - Back up/export critical data
according to the event organizer's needs. - Define a policy for photos
of students, especially minors, including permission/consent and removal
requests.

### Data retention

Agree on how long event results, audit logs, and gallery metadata should
remain available. Public historical results can be useful, but do not
retain unnecessary personal data.

------------------------------------------------------------------------

## 13. UI and Accessibility Requirements

-   Responsive layouts for mobile, desktop, and projector-sized screens.
-   Strong visual distinction between upcoming, live, and completed
    states.
-   Clear rank, school name, points, and category labels.
-   Do not rely on color alone to convey event status.
-   Accessible contrast and keyboard navigation.
-   Meaningful alt text for gallery images.
-   Loading, empty, offline, and error states for every data-driven
    view.
-   Avoid excessive animation during live score changes.
-   Use stable row ordering to reduce visual jumps.
-   Provide a high-contrast scoreboard mode if the site will be
    displayed on a large screen.
-   Use the official school/event logo and color palette only when
    supplied.

------------------------------------------------------------------------

## 14. Testing Plan

### Unit tests

-   Score validation and allowed point ranges.
-   School total calculations.
-   Category result calculations.
-   Ranking and tie handling.
-   Publication rules.
-   Event status transitions.
-   Drive file filtering and duplicate detection.

### Integration tests

-   Admin authorization on every mutation.
-   Score save creates an audit entry.
-   Updating a score changes derived totals correctly.
-   Unpublished scores do not leak to public queries.
-   Drive sync upserts the same file rather than creating duplicates.
-   Gallery moderation controls public visibility.
-   Deleted or inaccessible Drive files follow the agreed policy.

### End-to-end tests

1.  Public visitor opens the scoreboard.
2.  Admin signs in successfully.
3.  Unauthorized user is denied admin access.
4.  Admin creates an event and assigns a category.
5.  Admin enters a score.
6.  Scoreboard and top-three list update without refreshing.
7.  Category result displays the expected score.
8.  Admin publishes results and the public event page shows them.
9.  A Drive image is synced and appears after the required
    approval/publishing step.
10. Admin hides a gallery item and it disappears from the public
    gallery.

### Manual acceptance checks

-   Test on a phone and desktop.
-   Test with no scores, tied schools, fewer than three schools, and
    many events.
-   Test loss and recovery of internet connection.
-   Verify that unpublished results and private Drive content are not
    publicly accessible.
-   Verify that a score correction is reflected everywhere it should be.

------------------------------------------------------------------------

## 15. Deployment and Operations

### Environments

-   **Development:** local development with a separate Convex
    development deployment and test Drive folder.
-   **Preview/staging:** Vercel preview deployment connected to
    non-production data.
-   **Production:** Vercel production deployment connected to the
    production Convex deployment and the approved Drive folder.

Do not use production scores or a production gallery folder for routine
testing.

### Environment configuration

Exact variables depend on the selected auth provider and Google Drive
integration. Use server-only environment variables for: - Convex
deployment configuration. - Authentication provider secrets, if
required. - Google OAuth credentials and refresh token, if using
OAuth. - Designated Google Drive folder ID. - Integration/sync
configuration.

Public variables should contain only values intentionally safe to expose
to visitors.

### Release checklist

-   Confirm production domain and HTTPS.
-   Confirm admin account provisioning.
-   Confirm public routes work without login.
-   Confirm admin routes and mutations reject unauthorized users.
-   Confirm real-time score updates in two separate browser sessions.
-   Confirm Drive folder permissions and gallery publication rules.
-   Confirm sync failure visibility and recovery.
-   Confirm backup/export expectations.
-   Confirm mobile and projector layouts.
-   Confirm event data and schedule have been entered and reviewed.

### Monitoring

-   Watch Vercel function errors and deployment logs.
-   Monitor Convex function failures and usage.
-   Display last successful Drive sync to admins.
-   Record sync failures and allow safe retries.
-   Review auth failures and unexpected admin mutations.
-   Do not log secrets or sensitive personal data.

------------------------------------------------------------------------

## 16. Implementation Phases

### Phase 1 --- Confirm rules and project setup

-   Resolve the decisions in Section 18.
-   Create the Next.js + TypeScript project.
-   Configure Tailwind and reusable UI primitives.
-   Create Convex development and production deployments.
-   Configure GitHub and Vercel environments.
-   Establish linting, formatting, and test conventions.

**Exit criteria:** app deploys to a preview environment; Convex
connectivity works; no production secrets are exposed.

### Phase 2 --- Data model and admin access

-   Implement schools, categories, events, score records, and audit
    history.
-   Implement secure admin authentication and authorization.
-   Create initial admin dashboard and school/category setup flow.
-   Add validation and basic audit behavior.

**Exit criteria:** only authorized admins can create or change protected
records.

### Phase 3 --- Event management and scoring

-   Implement event creation and editing.
-   Implement schedule/status controls.
-   Implement score entry and correction.
-   Implement derived school totals and category results.
-   Implement result publication and tie handling.

**Exit criteria:** test data produces correct, reproducible rankings and
score corrections are traceable.

### Phase 4 --- Public pages and real-time scoreboards

-   Build home page.
-   Build school-wise scoreboard.
-   Build category-wise scoreboard.
-   Build event schedule and event detail pages.
-   Build "Who's Leading?" top-three section.
-   Connect public views to Convex reactive queries.

**Exit criteria:** an admin score update appears on connected public
clients without manual refresh.

### Phase 5 --- Google Drive gallery

-   Create and configure the dedicated Drive folder.
-   Implement server-side Drive authentication.
-   Implement scheduled sync and reconciliation.
-   Store gallery metadata in Convex.
-   Implement moderation/publication controls.
-   Build responsive gallery and snapshot sections.

**Exit criteria:** an uploaded image is discovered, safely represented,
approved if required, and displayed publicly without exposing private
Drive credentials or unrelated files.

### Phase 6 --- Quality assurance and launch

-   Complete unit, integration, and critical end-to-end tests.
-   Test authorization, data integrity, and tie cases.
-   Test mobile and projector layouts.
-   Confirm photo consent and publishing process.
-   Seed real schools, categories, events, and schedule.
-   Complete production deployment and admin handover.

**Exit criteria:** organizer acceptance checklist passes and a
documented process exists for updating scores, managing events, and
handling gallery sync issues.

------------------------------------------------------------------------

## 17. Acceptance Criteria

The first version is ready when:

-   [ ] Public visitors can view school-wise results.
-   [ ] Public visitors can select a category and view its results.
-   [ ] Score changes propagate without manual page refresh.
-   [ ] The schedule separates upcoming, live, and
    completed/result-published events.
-   [ ] Published event pages show results and winners.
-   [ ] "Who's Leading?" displays up to three eligible schools with
    correct totals.
-   [ ] Authorized admins can create and update events.
-   [ ] Authorized admins can enter and correct scores.
-   [ ] Score changes are auditable.
-   [ ] Public visitors cannot access admin functions or unpublished
    data.
-   [ ] Gallery items can be synced from the designated Google Drive
    folder.
-   [ ] Only approved/published images are shown publicly, unless
    automatic publishing is explicitly chosen.
-   [ ] A failed Drive sync is visible to admins and can be retried.
-   [ ] Layout works on mobile, desktop, and a large display.
-   [ ] Production deployment, admin access, and photo-publication
    process are documented.

------------------------------------------------------------------------

## 18. Assumptions and Unresolved Decisions

The plan uses these assumptions until the organizers confirm otherwise.

### Confirmed from the project brief

-   Savvy Hunt is a school event.
-   Multiple schools compete across categories and events.
-   Admins manually enter points.
-   Public users need school-wise and category-wise results.
-   The site needs live event updates and a top-three "Who's Leading?"
    section.
-   The snapshot feature is for photos and highlights.
-   Only authorized admins can access the admin panel.
-   Vercel is the intended hosting platform.
-   Convex is the intended database/realtime backend.
-   Google Drive should be the source from which uploaded gallery images
    reach the website.

### Recommended assumptions for version 1

-   The site is public to view, while administration is login-protected.
-   A single admin role is sufficient initially.
-   Score totals are derived from event-level score records.
-   Convex reactive queries deliver live score updates.
-   Google Drive synchronization is server-side and starts with
    scheduled polling/reconciliation.
-   New photos are synced automatically but require admin approval
    before publication.
-   Public pages show published results only.
-   Scores and gallery publication changes are auditable.
-   No participant accounts are needed unless later confirmed.

### Decisions that must be resolved

1.  **Scoring target:** Are points entered for schools, individual
    participants, or both?
2.  **School totals:** If participants earn points, should those points
    contribute to their school's overall total?
3.  **Point rules:** Can scores be decimal values? Are negative points,
    penalties, or bonus points allowed?
4.  **Ranking ties:** Should tied schools share a rank, or should a
    tie-breaker be applied?
5.  **Result publication:** Should admins publish scores immediately, or
    can scores remain drafts/provisional?
6.  **Admin accounts:** Who creates the first admin account, and should
    additional admins be managed inside the dashboard?
7.  **Google Drive access:** Will the school use a dedicated Google
    Workspace account/folder, or an ordinary Google account?
8.  **Gallery publishing:** Should every new Drive image appear
    immediately, or should an admin approve each image first?
9.  **Image delivery:** Can images be publicly viewable, or must the
    original Drive files remain private? If private, an appropriate
    image-serving strategy is needed.
10. **Gallery freshness:** Is a delay of a few minutes acceptable after
    a Drive upload, or must gallery updates be near-instant?
11. **Event structure:** Can a category contain multiple events, and can
    one event award points to multiple schools?
12. **Schedule details:** Are event dates, start/end times, venues, and
    event descriptions available?
13. **Historical data:** Should old events and results remain available
    after Savvy Hunt ends?
14. **Visual identity:** Is there an existing logo, school color
    palette, or design reference to follow?
15. **Expected scale:** Approximately how many schools, categories,
    events, admins, and simultaneous public viewers are expected?

------------------------------------------------------------------------

## 19. Recommended Next Step

Before implementation, confirm the scoring target and aggregation rules,
tie handling, result publication behavior, and Google Drive
privacy/publishing policy. These decisions affect the data model and
should not be guessed.

Once those decisions are confirmed, this plan can be converted into a
task-by-task implementation checklist with schema definitions, Convex
functions, page components, and test cases.
