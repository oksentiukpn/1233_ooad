# Lab 1 — Case: Spry, Meeting Analytics for Teams

**Course:** Object-Oriented Analysis and Design (Architecture & Design track), UCU FAS, Fall 2026
**Module 1:** Software Development 3.0. Why design starts with architecture, not with code
**Format:** teams of 2–3 · deliverable uploaded to Moodle before the next lab · 10-minute presentation and review in class
**Weight:** 10 points (see rubric at the end)

---

## 1. The situation

You are a small engineering team. A founder comes to you with a product brief for **Spry** — a web application that helps teams understand and improve how they spend time in meetings. A working product already exists on the market, but the founder does not want a reverse-engineering exercise. You are asked to **design the system from the brief below** as if no code existed yet.

The founder does not care which language you like. They care about:

- shipping a usable product to the first 20 customer organisations within ~4 months,
- not rebuilding everything when the product reaches 1 000 organisations,
- not getting sued over calendar data.

Your job in this lab is **not to write code**. It is to produce the architecture that a team — or a fleet of coding agents — could implement without asking "but how should this fit together?".

---

## 2. What Spry does (product brief)

Spry connects to a team's calendars and turns them into insights and actions.

**Personas**

| Persona | Who | What they want |
|---|---|---|
| Member | Any employee who connects their calendar | See where their week goes; protect time for deep work |
| Team lead | Manages 5–15 people | See the team's meeting load and trends; spot overloaded people |
| Org admin | Ops / HR / founder | Onboard the organisation, manage members and teams, control data and billing |

**Main screens (as seen in the current product)**

- **Home / Insights this week** — per member: time on meetings, meetings count, deep-work time, each with a week-over-week change.
- **Deep work time management** — Spry finds the nearest free slots (e.g. "3 time slots, 15 h available this week") and, on request, reserves them as blocks in the member's Google Calendar.
- **Agenda readiness** — a list of upcoming meetings with a badge like "81% of upcoming meetings without an agenda" and an *Add agenda* action per meeting.
- **Organization** — teams, members, roles, invitations.
- **Member** — an individual's profile and analytics.
- **Settings** — calendar connection, notification preferences, working hours, data controls.

---

## 3. Functional requirements (FR)

### 3.1 Identity and organisation

- **FR-1** A user can sign up and sign in with their Google Workspace account (OAuth 2.0 / OIDC). Email + password is a stretch goal, not required for v1.
- **FR-2** The first user from a company domain creates an **organisation**; later users from the same verified domain can join it or be invited.
- **FR-3** An org admin can create teams, add/remove members, assign roles (member, team lead, org admin) and deactivate accounts.
- **FR-4** Every piece of data belongs to exactly one organisation; users never see data from another organisation (multi-tenancy).

### 3.2 Calendar integration

- **FR-5** A member can connect their Google Calendar and grant read access to events plus write access for creating deep-work blocks. The connection can be revoked at any time from Settings.
- **FR-6** Spry keeps a member's calendar events up to date with a lag of **at most 5 minutes** (push notifications / webhooks preferred; polling acceptable as a fallback).
- **FR-7** Spry classifies each event: *meeting* (≥ 2 attendees, accepted or tentative), *focus block* (created by Spry or matching a user rule), *other* (all-day events, holidays, declined, personal). Rules are configurable per organisation.
- **FR-8** Working hours and time zone are configurable per member; all analytics respect them.

### 3.3 Insights

- **FR-9** For each member and each ISO week, Spry computes: total time on meetings, number of meetings, deep-work time (contiguous free time ≥ 60 min inside working hours), and the change vs. the previous week.
- **FR-10** A team lead sees the same metrics aggregated for their team, plus a per-member breakdown and a list of members over a configurable threshold (e.g. > 20 h of meetings/week).
- **FR-11** An org admin sees organisation-wide metrics and trends over the last 12 weeks.
- **FR-12** Insights must be available for the **current week in near real time** (recomputed within 5 minutes of a calendar change) and for past weeks as history.
- **FR-13** *(Stretch)* Meeting cost: if an org admin uploads hourly rates per role, Spry shows an estimated cost per meeting and per week. Rates are visible only to org admins.

### 3.4 Deep-work management

- **FR-14** Spry proposes free slots for deep work in the current and next week, using working hours, existing events and a minimum block length (default 2 h).
- **FR-15** With one click ("Reserve in Google Calendar"), Spry creates the blocks in the member's calendar, marked as busy, with a recognisable title and a Spry identifier so they can be found and removed later.
- **FR-16** If the member deletes or moves such a block in Google Calendar, Spry reflects that within the same 5-minute lag.

### 3.5 Agenda readiness

- **FR-17** For every upcoming meeting organised by a member, Spry determines whether it has an agenda (non-empty description, an attached doc, or an agenda added in Spry).
- **FR-18** The Home screen shows the share of upcoming meetings without an agenda for the next 7 days and the list of such meetings.
- **FR-19** A member can add an agenda in Spry; Spry writes it into the event description in Google Calendar so that all attendees see it.
- **FR-20** *(Stretch)* Spry drafts an agenda with an LLM from the meeting title, attendees and previous meetings of the same series; the user edits and confirms before anything is written to the calendar.

### 3.6 Notifications

- **FR-21** Optional weekly email digest per member (Monday morning, member's time zone) with the previous week's insights.
- **FR-22** Optional reminder 24 h before a meeting the member organises if it still has no agenda.

### 3.7 Administration and data

- **FR-23** An org admin can export the organisation's analytics as CSV.
- **FR-24** A member can delete their account; an org admin can delete the organisation. All related calendar data must be purged within 30 days.
- **FR-25** Every admin action (role change, deletion, export) is recorded in an audit log visible to org admins.

---

## 4. Non-functional requirements (NFR)

Numbers are deliberate. If you disagree with a number, say so in your assumptions — but replace it with another number, not with an adjective.

| ID | Attribute | Requirement |
|---|---|---|
| NFR-1 | Scale, year 1 | 1 000 organisations, 50 000 members, avg 8 events/member/day → ~400 000 event changes/day; peak ×5 on Monday mornings |
| NFR-2 | Scale, year 3 | 10 000 organisations, 500 000 members. The v1 architecture must reach this with **scaling, not rewriting** |
| NFR-3 | Latency | Home screen (insights + slots + agenda list) fully rendered in **< 2 s p95**; API calls < 300 ms p95 |
| NFR-4 | Freshness | Calendar change → updated insight in **≤ 5 min p95** |
| NFR-5 | Availability | 99.9 % monthly for the web app and API. Calendar sync may degrade (queue up) but must never lose changes |
| NFR-6 | Security | OAuth tokens encrypted at rest; least-privilege access to calendar scopes; per-tenant data isolation enforced in code and verified by tests; secrets never in source |
| NFR-7 | Privacy & compliance | GDPR: EU customers' data stored and processed in the EU; data export and deletion (FR-23, FR-24); event *titles and descriptions* are personal data — decide what you store and for how long |
| NFR-8 | Cost | Infrastructure ≤ **$0.15 per active member per month** at year-1 scale, excluding LLM usage |
| NFR-9 | Observability | Every calendar sync and every insight recomputation is traceable per organisation; alert if freshness (NFR-4) is breached for > 15 min |
| NFR-10 | Maintainability | A new insight (e.g. "meetings outside working hours") should be addable by one engineer in one week without touching the calendar sync |
| NFR-11 | Deployability | Any change can be deployed to production in < 30 min with automated tests; rollback in < 5 min |
| NFR-12 | Team | Team of 4 engineers for v1 (you decide the split); no dedicated ops person |

---

## 5. Constraints and context

- **Google first.** Only Google Calendar in v1. Microsoft 365 must be possible later without redesigning the core (think about where the "Google-ness" lives).
- **Web app only.** Desktop browser first; responsive layout is nice to have; no native mobile app; no browser extension.
- **Managed services are welcome.** The founder would rather pay for Cognito/Firebase Auth, a managed database or a queue than for an engineer to run one. You may use AWS or GCP (pick one and justify).
- **LLM usage is optional** (FR-20). If you include it, treat it as an external dependency: what happens when it is slow, wrong or unavailable?
- **Budget for v1:** 4 engineers × 4 months. Anything that does not fit must be explicitly moved to "later".
- **Legal:** Google's API policies require a privacy policy, limited scopes and a security assessment above a certain user count. You do not need to solve this, but your architecture must not make it impossible (e.g. storing full event bodies forever).

## 6. Explicitly out of scope for v1

- Billing and subscriptions
- Slack / Teams bots
- Video-call transcription or meeting notes
- Cross-organisation benchmarks ("companies like yours spend…")
- Mobile apps and the browser extension

---

## 7. What you must deliver

One PDF (max 8 pages) or a Markdown document with diagrams, containing:

1. **Assumptions** — everything the brief does not say and you decided (e.g. how you define "deep-work time", which cloud, whether event titles are stored).
2. **Context diagram** (C4 level 1) — personas, Spry as one box, external systems (Google Calendar, identity provider, email provider, LLM provider if used).
3. **Component / container diagram** (C4 level 2) — the deployable units: web client, API, calendar sync, analytics computation, scheduler/notifications, data stores, queues. For each: responsibility, technology, how it scales.
4. **Technology choices with justification** — architecture style, language(s), database(s), cloud provider and 3–5 managed services. Every choice must reference at least one FR/NFR by ID ("PostgreSQL with row-level security, because NFR-6 and NFR-7"), and name the alternative you rejected and why.

Diagrams: PlantUML, draw.io, Mermaid, Excalidraw — anything readable. Hand-drawn and photographed is acceptable if legible.

---

## 8. Grading rubric (10 points)

| Points | Criterion | What "full points" looks like |
|---|---|---|
| 3 | **Requirements understood** | All FR groups are covered by some component; every NFR is either met by the design or consciously relaxed in the assumptions with a number |
| 4 | **Architecture fits the NFRs** | Style, boundaries and data flow follow from the numbers: freshness, scale, tenancy, cost. A calendar change can be traced to the Home screen |
| 3 | **Choices are justified** | Each technology choice cites FR/NFR IDs; alternatives are named and rejected for a reason, not a preference |

Bonus (+1, counted toward the lab total): a one-page "prompt pack" — the instructions you would give a coding agent to implement one component, including its contract, constraints and the tests that define "done".

**AI tools** (Claude, ChatGPT, Copilot, agents) are allowed and encouraged for this lab. You present and defend every decision yourself; "the model suggested it" is not a justification.

---

*Screenshots of Spry are used for educational purposes only. The requirements above are the course's interpretation of the product and are not a specification from the Spry team.*
