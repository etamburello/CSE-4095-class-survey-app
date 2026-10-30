# Classroom Survey Web App — TODO

## Purpose

This roadmap breaks the implementation into small, testable phases ordered from foundational work to advanced features.

---

# Phase 1 — Project Setup

- [x] Create a new React + TypeScript project with Vite.
- [x] Add Tailwind CSS.
- [x] Add React Router.
- [x] Add Supabase JavaScript client.
- [x] Add Recharts.
- [x] Add QR code generation package.
- [x] Create the initial project folder structure.
- [x] Add `.env.example` with Supabase environment variable names.
- [x] Configure ESLint and formatting.
- [x] Create a basic home page.
- [x] Verify the project builds successfully.

---

# Phase 2 — Supabase Project and Database

- [ ] Create a Supabase project.
- [x] Create the `surveys` table.
- [x] Create the `questions` table.
- [x] Create the `choices` table.
- [x] Create the `responses` table.
- [x] Create the `answers` table.
- [x] Add foreign-key constraints.
- [x] Add database indexes.
- [x] Add timestamps.
- [x] Add survey-status validation.
- [x] Create Row Level Security policies.
- [ ] Verify students cannot read survey results.
- [ ] Verify anonymous students can read active surveys.
- [ ] Verify anonymous students can submit responses.
- [ ] Verify authenticated instructors have full access.

---

# Phase 3 — Instructor Authentication

- [x] Create the instructor login page.
- [x] Connect login to Supabase Auth.
- [x] Add logout.
- [x] Create an authentication context/provider.
- [x] Create a protected-route component.
- [x] Redirect unauthenticated users to login.
- [x] Show the logged-in instructor in the dashboard.

---

# Phase 4 — Instructor Dashboard

- [x] Create the dashboard layout.
- [x] Load surveys from Supabase.
- [x] Display survey title, status, and creation date.
- [x] Add status badges for Draft, Active, Closed, and Archived.
- [x] Add a New Survey button.
- [x] Add Edit action.
- [x] Add Duplicate action.
- [x] Add Delete action.
- [x] Add Archive action.
- [x] Add View Results action.
- [x] Add Activate action.
- [x] Add Close action.
- [x] Add search by survey title.
- [x] Add filtering by status.

Verified against the live Supabase project. The dashboard loads surveys and supports search, status filtering, activate, close, duplicate, archive, and delete.

---

# Phase 5 — Survey Editor

- [x] Create a survey editor page.
- [x] Add survey title field.
- [x] Add optional description field.
- [x] Add questions dynamically.
- [x] Support Multiple Choice questions.
- [x] Support True / False questions.
- [x] Add answer choices dynamically.
- [x] Reorder questions.
- [x] Reorder choices.
- [x] Delete questions.
- [x] Delete choices.
- [x] Validate required fields.
- [x] Save a survey as Draft.
- [x] Load an existing survey for editing.
- [x] Prevent editing an active survey unless it is first closed.

Verified against the live Supabase project. A survey can be created, edited, and saved as a draft, then reloaded with its questions and choices. An active survey must be closed before editing. Archived surveys cannot be edited; duplicating one opens the new draft in the editor. Activate from the editor saves the survey, marks it active, and opens the presentation page.

---

# Phase 6 — Survey Activation

- [x] Add activation logic.
- [x] Ensure at most one survey is Active.
- [x] Automatically close the previously active survey.
- [x] Generate a public survey slug or identifier.
- [x] Generate the public survey URL.
- [x] Generate a QR code from the public URL.
- [x] Create a Present Survey page.
- [x] Display survey title and QR code.
- [x] Display a readable fallback URL.
- [x] Add a Close Survey button.
- [x] Add a Download QR Code button.

Verified against the live Supabase project. Activating a survey closes the previous active survey, assigns a public link, and opens the presentation page with the title, QR code, readable URL, response count, and a downloadable QR image. Close Survey marks it closed.

---

# Phase 7 — Student Survey Page

- [x] Create the public route `/s/:surveyId`.
- [x] Load the requested active survey.
- [x] Show an error if the survey does not exist.
- [x] Show a message if the survey is closed.
- [x] Render survey title and description.
- [x] Render Multiple Choice questions.
- [x] Render True / False questions.
- [x] Validate required answers.
- [x] Add Submit button.
- [x] Store response and answers in Supabase.
- [x] Show a submission confirmation page.
- [x] Make the entire experience mobile friendly.

Verified against the live Supabase project. `/s/:slug` loads the active survey without login, requires an answer for every question, and stores the response and answers. A successful submit shows the thank-you page. A missing link shows “Survey not found.” If the survey closes after the page has loaded, submit shows that it is no longer accepting responses. A fresh visit to a closed survey also shows “Survey not found,” because students can only read the active survey.

---

# Phase 8 — Duplicate Submission Protection

- [x] Generate an anonymous browser token.
- [x] Store the token in local storage.
- [x] Save the token with each response.
- [x] Prevent the same token from submitting twice to the same survey.
- [x] Show a friendly message if a duplicate submission is attempted.
- [x] Add a database uniqueness constraint if appropriate.

Verified against the live Supabase project. Each browser keeps one anonymous token in local storage, and that token is saved with the response. Returning to the same survey shows “You have already submitted a response to this survey.” A second submit with the same token is rejected and shows that message. The same browser can still submit a different survey. The uniqueness constraint `responses_unique_student_per_survey` was already in the schema.

---

# Phase 9 — Results Dashboard

- [x] Create a results page for each survey.
- [x] Show total response count.
- [x] Aggregate answers by question.
- [x] Show counts for each choice.
- [x] Show percentages for each choice.
- [x] Add bar charts using Recharts.
- [x] Clearly label unanswered questions.
- [x] Add Refresh Results button.
- [x] Add link back to the main dashboard.

Verified against the live Supabase project. The results page loads the survey, questions, choices, responses, and answers for the signed-in instructor. It shows the response count, a bar for each choice with the count and a one-decimal percentage, a matching text list, and “Unanswered: N” when a submission has no choice for that question. Percentages use the number of submissions as the denominator. Refresh reloads from Supabase. Export CSV uses those same live responses. Back to Dashboard returns to the dashboard. An unknown survey shows “Survey not found.” A survey with no responses shows “No responses yet.” Students still cannot read answers.

---

# Phase 10 — Historical Results

- [x] Allow viewing results for Closed surveys.
- [x] Allow viewing results for Archived surveys.
- [x] Add filtering by date.
- [x] Add filtering by survey title.
- [x] Preserve all historical response data.

Verified against the live Supabase project. Closed and archived surveys open on the results page with their stored responses and a status badge. The dashboard filters surveys by title search, creation date range, and status, including Closed and Archived. The results page filters submissions by date and shows “N of M responses” while the charts use that filtered set. Closing or archiving a survey keeps its responses. Delete is still the only action that removes response data.

---

# Phase 11 — CSV Export

- [x] Add Export CSV button.
- [x] Export survey metadata.
- [x] Export one row per response.
- [x] Include submission timestamp.
- [x] Include each question and answer.
- [x] Create safe CSV escaping.
- [x] Test export with spreadsheet applications.

Verified against the live Supabase project. Export CSV downloads a UTF-8 file with a BOM for Excel. The file starts with survey metadata rows for title, description, status, created at, and exported at, then a blank line, then the response header and one row per submission with the timestamp and choice text for each question. Values that start with `=`, `+`, `-`, or `@` are prefixed so spreadsheet apps treat them as text. Quotes, commas, and newlines are escaped. The live Export CSV button produced that layout for a closed survey with two responses, and an Excel-dialect CSV parse recovered the metadata and answer cells correctly.

---

# Phase 12 — Survey Duplication

- [x] Duplicate survey title and description.
- [x] Duplicate questions.
- [x] Duplicate answer choices.
- [x] Create the copy in Draft state.
- [x] Add "Copy of ..." naming.
- [x] Redirect to the editor after duplication.

Verified against the live Supabase project. Duplicate from the dashboard creates a new draft titled “Copy of …”, copies the description, questions, and choices, leaves responses behind, and opens the editor for that draft. Duplicating an archived survey from the editor gate follows the same path.

---

# Phase 13 — UI Polish

- [x] Add consistent page layouts.
- [x] Improve mobile responsiveness.
- [x] Add loading states.
- [x] Add empty states.
- [x] Add error messages.
- [x] Add confirmation dialogs for destructive actions.
- [x] Improve QR-code presentation for classroom projection.
- [x] Test accessibility and keyboard navigation.
- [x] Improve color contrast.

Verified against the live app. Skip to content is keyboard-focusable with a visible outline. Instructor and present text links share the same focus ring as buttons. Confirm dialogs move focus to Cancel, keep Tab inside the dialog, and close on Escape. Editor reorder and remove controls expose clear accessible names. Form errors use `role="alert"`, status badges include text labels, charts keep numeric values, and student radios show a visible focus ring. A student submission completed from the public form after selecting an answer.

---

# Phase 14 — Testing

- [x] Test instructor login.
- [x] Test survey creation.
- [x] Test survey editing.
- [x] Test activation.
- [x] Test closing surveys.
- [x] Test QR-code links.
- [x] Test student submissions.
- [x] Test duplicate-submission prevention.
- [x] Test results calculations.
- [x] Test CSV export.
- [x] Test mobile layout.
- [x] Test with at least two browsers.
- [x] Test unauthorized access attempts.
- [x] Test database Row Level Security.

Verified against the live Supabase project and local app. Instructor login reaches the dashboard. Creating, editing, activating, and closing surveys works in the UI. The present page shows a QR image and a `/s/:slug` link that opens the student form. A student submission shows thank-you, and a return visit shows the already-submitted message. Results show expected counts and one-decimal percentages (for example 66.7% / 33.3% on three responses). CSV includes metadata and response rows. At 390px width the dashboard does not overflow horizontally. Chromium and WebKit both load landing and login, send unauthenticated `/dashboard` users to login, and hide closed public surveys. Anonymous clients cannot read `responses` or `answers` (42501), cannot read closed surveys, and cannot submit after close; the signed-in instructor can read responses.

---

# Phase 15 — Deployment

- [x] Push the project to GitHub.
- [x] Create the Cloudflare Pages site.
- [ ] Connect Cloudflare Pages to the GitHub repository.
- [ ] Configure production environment variables.
- [x] Deploy the application.
- [x] Configure SPA routing.
- [ ] Verify production login.
- [ ] Verify QR codes point to the production URL.
- [ ] Test student submissions in production.
- [ ] Test instructor results in production.

---

# Phase 16 — Post-MVP Enhancements

- [ ] Add live updating results with Supabase Realtime.
- [ ] Add question bank.
- [ ] Add survey import/export as JSON.
- [ ] Add Markdown import.
- [ ] Add short-answer questions.
- [ ] Add checkbox questions.
- [ ] Add rating-scale questions.
- [ ] Add numeric questions.
- [ ] Add AI-assisted question generation.
- [ ] Add LMS integration.
- [ ] Add multiple instructors.
- [ ] Add course and semester organization.
- [ ] Add analytics across multiple surveys.
