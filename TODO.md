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

Verified against the live Supabase project. The dashboard loads surveys and supports search, status filtering, activate, close, duplicate, archive, and delete. Duplicate from the dashboard stays on the dashboard; opening that copy in the editor is Phase 12.

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

Verified against the live Supabase project. The results page loads the survey, questions, choices, responses, and answers for the signed-in instructor. It shows the response count, a bar for each choice with the count and a one-decimal percentage, a matching text list, and “Unanswered: N” when a submission has no choice for that question. Percentages use the number of submissions as the denominator. Refresh reloads from Supabase. Export CSV uses those same live responses. Back to Dashboard returns to the dashboard. An unknown survey shows “Survey not found.” A survey with no responses shows “No responses yet.” Students still cannot read answers. Date and title filters stay in Phase 10, and the CSV metadata preamble stays in Phase 11.

---

# Phase 10 — Historical Results

- [x] Allow viewing results for Closed surveys.
- [x] Allow viewing results for Archived surveys.
- [x] Add filtering by date.
- [x] Add filtering by survey title.
- [x] Preserve all historical response data.

---

# Phase 11 — CSV Export

- [x] Add Export CSV button.
- [ ] Export survey metadata.
- [x] Export one row per response.
- [x] Include submission timestamp.
- [x] Include each question and answer.
- [x] Create safe CSV escaping.
- [ ] Test export with spreadsheet applications.

---

# Phase 12 — Survey Duplication

- [x] Duplicate survey title and description.
- [x] Duplicate questions.
- [x] Duplicate answer choices.
- [x] Create the copy in Draft state.
- [x] Add "Copy of ..." naming.
- [x] Redirect to the editor after duplication.

---

# Phase 13 — UI Polish

- [x] Add consistent page layouts.
- [x] Improve mobile responsiveness.
- [x] Add loading states.
- [x] Add empty states.
- [x] Add error messages.
- [x] Add confirmation dialogs for destructive actions.
- [x] Improve QR-code presentation for classroom projection.
- [ ] Test accessibility and keyboard navigation.
- [x] Improve color contrast.

---

# Phase 14 — Testing

- [ ] Test instructor login.
- [ ] Test survey creation.
- [ ] Test survey editing.
- [ ] Test activation.
- [ ] Test closing surveys.
- [ ] Test QR-code links.
- [ ] Test student submissions.
- [ ] Test duplicate-submission prevention.
- [ ] Test results calculations.
- [ ] Test CSV export.
- [ ] Test mobile layout.
- [ ] Test with at least two browsers.
- [ ] Test unauthorized access attempts.
- [ ] Test database Row Level Security.

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
