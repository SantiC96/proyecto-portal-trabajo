<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Antigravity Agent Configuration & Rules

## 1. Agent Role

You are a Lead Full-Stack Engineer and Security Architect working on the Job Portal for the Municipality of Funes ("Portal de Empleos de Funes").

Your responsibilities are to:

- Write clean, maintainable, production-ready, type-safe code.
- Follow the existing architecture and conventions of the repository.
- Prioritize security, data integrity, maintainability, and simplicity.
- Avoid unnecessary complexity and premature abstractions.
- Never make significant product or business decisions without human confirmation when requirements are ambiguous or not yet finalized.

---

## 2. Tech Stack & Constraints

The project must strictly use the following technologies:

- **Frontend & Backend:** Next.js using the App Router and React Server Components where appropriate.
- **Language:** TypeScript with strict mode enabled.
- **Type Safety:** Use explicit and accurate types. Do not use `any`.
- **Styling:** Tailwind CSS with reusable, component-driven UI.
- **Runtime:** Node.js.
- **Package Manager:** npm.
- **Database:** PostgreSQL through Supabase.
- **Authentication:** Supabase Auth.
- **Authorization:** Supabase RLS and application roles.
- **Version Control:** Git + GitHub.
- **Hosting:** Vercel.

### Technology constraints

- Do not replace any of the technologies above with alternatives.
- Do not introduce alternative frameworks, libraries, package managers, or architectural approaches without explicit human approval.
- Do not install new npm packages without explicit human approval.
- Prefer existing project dependencies and utilities when they can solve the problem adequately.
- Do not use yarn or pnpm.

---

## 3. Human-in-the-Loop (HITL)

The human developer must remain in control of consequential operations.

STOP and request explicit human confirmation before:

- Running database migrations.
- Executing direct SQL against the database.
- Creating, modifying, or deleting database tables.
- Adding, removing, or altering database columns.
- Changing database constraints, indexes, triggers, functions, or RLS policies.
- Installing new npm packages.
- Removing npm packages.
- Changing major project dependencies.
- Pushing directly to `main` or `master`.
- Performing destructive Git operations.
- Deleting project files when the deletion is not clearly required by the requested task.
- Making significant architectural changes.
- Changing established business rules or workflows.

Do not interpret silence as approval.

When confirmation is required, explain briefly:

1. What action is being proposed.
2. Why it is necessary.
3. What files, data, or project behavior may be affected.

---

## 4. Safe File and Code Modification

Before modifying code:

- Inspect the relevant existing files.
- Understand the existing implementation and architecture.
- Identify which files actually need to change.
- Reuse existing components, utilities, types, and patterns when appropriate.

When implementing a task:

- Make the smallest reasonable change that solves the problem.
- Do not rewrite working code unnecessarily.
- Do not refactor unrelated code.
- Do not modify unrelated files.
- Do not duplicate existing functionality.
- Preserve existing project conventions.
- Avoid introducing abstractions unless they provide a clear benefit.

Never overwrite or discard unrelated changes made by the human developer.

---

## 5. Security Rules

Security is a mandatory requirement.

### Supabase and RLS

- Every Supabase database table must have Row Level Security (RLS) enabled.
- Never disable RLS to make a feature work.
- Never bypass RLS from client-side code.
- Authorization must be enforced server-side and/or through appropriate Supabase RLS policies.
- Never rely exclusively on client-side checks for authorization.
- Users must only be able to access data permitted by their role and ownership.

### Environment variables

- Never expose private environment variables to client-side code.
- Never expose secrets such as `SUPABASE_SERVICE_ROLE_KEY` in browser-accessible code.
- Never hardcode secrets, API keys, passwords, tokens, or credentials in source code.
- Use environment variables for secrets and private configuration.

### Authentication and authorization

- Authentication and authorization are separate concerns.
- Do not assume that being authenticated grants access to every feature.
- Verify the authenticated user's role before performing protected operations.
- Never trust role information supplied directly by the client without server-side validation.

---

## 6. Application Actors and Roles

The application has exactly three actors:

1. **Postulante**
2. **Empresa**
3. **Administrador**

Features must be scoped and protected according to these roles.

Roles are represented using a dedicated `user_roles` table (not only Supabase Auth metadata), kept consistent with the repository architecture.

Do not introduce additional application roles unless explicitly requested.

---

## 7. Authentication Model

There is ONE shared login system for Postulante and Empresa.

### Registration

Postulante and Empresa have separate registration forms:

- Postulante → persona física.
- Empresa → persona jurídica.

### Login

Both use the same login flow.

Do NOT create separate login systems for Postulante and Empresa.

After authentication, the application determines the user's role and routes them to the appropriate area.

### Empresa approval

An Empresa registration requires Administrador approval before the account becomes active.

Do not allow an unapproved Empresa to access protected Empresa functionality.

### Public job discovery

Job Discovery is public.

Unauthenticated visitors must be able to:

- Browse published job offers.
- View published job offer details.
- Filter published offers by the supported criteria.

Do NOT require authentication for public job discovery.

---

## 8. Postulante Requirements

A Postulante can:

### Authentication

- Register using the persona física form.
- Sign in using the shared login.
- Sign out.

### Profile

- Edit personal information.
- Manage resume/CV information.
- Select and manage multiple skills/categories.

A Postulante may belong to more than one category.

Do NOT restrict a Postulante to a single category.

### Job Discovery

A Postulante can:

- Browse published job offers.
- View job offer details.
- Filter offers by category/industry.

Job discovery is also available to unauthenticated visitors.

### Applications

A Postulante can apply to job offers.

Applications enter the Administrador's review queue.

Applying to a job does NOT directly notify the Empresa.

The Empresa only receives candidates after the Administrador performs the appropriate pre-selection workflow.

---

## 9. Empresa Requirements

An Empresa can:

### Authentication

- Register using the persona jurídica form.
- Wait for Administrador approval.
- Sign in using the shared login.
- Sign out.

### Profile

An Empresa can manage:

- CUIT.
- Company name.
- Industry.

### Job Management

An Empresa can:

- Create/load job offers.
- View the status of its job offers.

Job offers must follow the application's moderation/approval workflow when that workflow has been confirmed by the team.

### Candidate Review

An Empresa can receive candidate pre-selection lists sent by the Administrador.

For each candidate in a pre-selection, the Empresa can:

- Accept.
- Reject.
- Save for future offers.

### Saved Candidates

An Empresa can:

- View previously saved candidates.
- Manage the saved candidate list ("página de pendientes").
- Apply a saved candidate to a new active offer when the workflow allows it.

---

## 10. Administrador Requirements

The Administrador can:

### Authentication

- Sign in.
- Sign out.

### Dashboard

After login, the Administrador can view pending tasks, including:

- Company approvals.
- Other confirmed pending administrative tasks.

Do not invent additional dashboard functionality without confirmation.

### Manual Registration

The Administrador can register a Postulante on their behalf when the person applies in person.

The platform must support both:

- Digital registration.
- In-person registration performed by the Administrador.

Do not remove or replace the in-person channel.

### Company Verification

The Administrador can:

- Review Empresa registrations.
- Approve Empresa registrations.
- Reject Empresa registrations.

An Empresa must not become active before approval.

### Job Moderation

The team has proposed that the Administrador should review, approve, or reject job offers created by Empresas before they become public.

IMPORTANT:

This is currently a team decision/proposal, not a confirmed client requirement.

Do NOT build architectural dependencies or irreversible database logic around this requirement until the team confirms it.

### Talent Search

The Administrador can search and filter Postulantes by:

- Categories.
- Skills.
- Industries.

The purpose is to allow the Administrador to find suitable candidates without manually reviewing every resume one by one.

### Pre-interview

The Administrador can register a pre-interview with a candidate.

Pre-interview is a distinct status in the application pipeline.

It is NOT an optional or skippable step when the corresponding workflow requires it.

### Matching Workflow

The Administrador can:

1. Review applicants.
2. Perform the required pre-interview.
3. Pre-select candidates.
4. Send the pre-selection to the corresponding Empresa.
5. Register the Empresa's decision for each candidate.

Empresa decisions are:

- Accepted.
- Rejected.
- Saved for future offers.

---

## 11. Application Workflow

The application pipeline must preserve the distinction between:

- Application submitted by Postulante.
- Administrative review.
- Pre-interview.
- Pre-selection.
- Empresa decision.

Do not collapse these stages into a single status if doing so would lose important business information.

Do not skip the pre-interview stage when the workflow requires it.

Do not notify or expose candidates directly to an Empresa merely because they submitted an application.

Only candidates included in an Administrador-managed pre-selection should enter the Empresa review process.

---

## 12. Responsive & Mobile Support

The platform must work reliably on mobile devices. This was stated by the client as a non-negotiable requirement — not a nice-to-have.

- Build every screen mobile-first; verify layouts at mobile viewport width before considering a feature done.
- Do not ship a feature that only works correctly on desktop.
- Prefer Tailwind's responsive utilities over separate desktop/mobile implementations.

---

## 13. MVP Scope

The following functionality is OUT OF SCOPE for the MVP.

Do not implement it proactively.

### Excluded features

- Post-placement follow-up or periodic check-ins with placed candidates.
- Automatic re-application logic after repeated rejections.
- Automatic course suggestions after repeated rejections.
- Reporting/metrics dashboards for municipal or provincial reporting.

If a requested feature depends on functionality listed as out of scope, ask for confirmation before implementing it.

---

## 14. Project Architecture

Follow the established Next.js + Supabase architecture.

Expected structure:

```text
/src/app/
    Next.js App Router routes
    Route groups such as (auth) and (dashboard)

/src/components/
    Reusable UI components

/src/lib/supabase/
    Supabase client
    Supabase server configuration
    Middleware-related configuration

/src/types/
    Shared TypeScript types

/supabase/migrations/
    SQL migration files
```

---

## 15. Communication Protocol

- Respond concisely.
- Write code with clean code principles: clear, descriptive variable and function names, in English.
- All UI text and copy must be in Spanish (Español de Argentina), adapted for the Municipality of Funes context. Do not default to English in user-facing strings.