# Spry Infrastructure Summary

## 1. Integrations List

| External system | Use |
|---|---|
| **Cloudflare** | Manages DNS and TLS. Serves the static web app. Protects the API with WAF and rate limits. Does not cache private API data. |
| **Google Workspace** | Signs users in with OIDC and OAuth 2.0. Helps identify the user's company domain. |
| **Google Calendar API** | Sends calendar-change webhooks. Lets Spry read event changes and write focus blocks or agendas. |
| **Resend** | Sends weekly digests and agenda reminders. Reports delivery and bounce events. |
| **GitHub Actions** | Runs tests, builds the API image and Lambda packages, and deploys them to AWS. |

## 2. Components List

All AWS components run in `eu-central-1` (Frankfurt). Customer data stays in the EU.

| Component | Responsibility | Technology | Requirements served |
|---|---|---|---|
| **Web application** | Shows insights, focus slots, agenda status, teams, members, and settings. | Next.js, React, TypeScript, Cloudflare Pages | **FR-9–FR-19**, **NFR-3** |
| **Edge boundary** | Manages DNS and TLS. Applies WAF and rate limits. Sends API and webhook traffic to Frankfurt. | Cloudflare DNS, Pages, WAF, reverse proxy | **NFR-3**, **NFR-5**, **NFR-6** |
| **Core API** | Handles login, organisations, roles, settings, focus-block requests, agendas, CSV exports, and webhooks. | Go or TypeScript/Fastify on AWS App Runner | **FR-1–FR-5**, **FR-14**, **FR-15**, **FR-19**, **FR-23**, **NFR-3**, **NFR-5** |
| **Calendar sync queue** | Stores calendar sync jobs until they are processed. Sends failed jobs to a DLQ. | Amazon SQS Standard and DLQ | **FR-6**, **FR-16**, **NFR-4**, **NFR-5** |
| **Calendar sync worker** | Loads changed events with `syncToken`. Removes data that Spry does not need. Saves event metadata. | AWS Lambda | **FR-5–FR-8**, **FR-16**, **NFR-4**, **NFR-7** |
| **Metrics queue** | Stores insight recalculation jobs. Separates calendar sync from analytics. | Amazon SQS Standard and DLQ | **FR-9–FR-12**, **NFR-4**, **NFR-5**, **NFR-10** |
| **Analytics worker** | Calculates meeting time, meeting count, focus time, and week-over-week changes. | AWS Lambda | **FR-9–FR-14**, **NFR-1**, **NFR-2**, **NFR-4** |
| **Email queue** | Stores digest and reminder jobs. Retries temporary Resend failures. | Amazon SQS Standard and DLQ | **FR-21**, **FR-22**, **NFR-5** |
| **Notification worker** | Builds email data and calls Resend. | AWS Lambda | **FR-21**, **FR-22** |
| **Deletion worker** | Deletes member or organisation data within 30 days. | AWS Lambda | **FR-24**, **NFR-7** |
| **Scheduler** | Renews Google watch channels. Starts weekly digests and deletion jobs. Spreads jobs over time. | Amazon EventBridge Scheduler | **FR-6**, **FR-21**, **FR-24**, **NFR-4** |
| **Database proxy** | Pools database connections from App Runner and Lambda. | Amazon RDS Proxy | **NFR-2**, **NFR-3**, **NFR-5** |
| **Primary database** | Stores organisations, users, roles, audit logs, encrypted tokens, event metadata, and insight summaries. Uses RLS for tenant isolation. | Amazon RDS for PostgreSQL 16, Multi-AZ | **FR-2–FR-4**, **FR-9–FR-12**, **FR-24**, **FR-25**, **NFR-5–NFR-7** |
| **Key and secret storage** | Encrypts OAuth tokens. Stores database and Resend credentials. | AWS KMS and AWS Secrets Manager | **NFR-6**, **NFR-7** |
| **Monitoring** | Stores logs and metrics. Traces sync jobs. Alerts on old queue messages and stale insights. | Amazon CloudWatch and AWS X-Ray | **NFR-4**, **NFR-9** |
| **Container registry** | Stores signed API images for deployment and rollback. | Amazon ECR | **NFR-11** |

## 3. Interaction Description

### Main Protocols and Directions

| From | To | Protocol | Data or action |
|---|---|---|---|
| Browser | Cloudflare Pages | HTTPS | Loads static HTML, JavaScript, and CSS. |
| Browser | Cloudflare | HTTPS REST | Sends private API requests. Responses use `Cache-Control: private, no-store`. |
| Cloudflare | App Runner API | HTTPS | Forwards API calls and Google webhooks to Frankfurt. |
| Browser | Google Workspace | OIDC / OAuth 2.0 | Signs the user in and asks for calendar access. |
| Google Workspace | Core API | HTTPS callback | Returns the login result and OAuth grant. |
| Google Calendar | Core API | HTTPS webhook | Reports that a calendar changed. It does not send the event body. |
| Core API | SQS | AWS HTTPS API | Adds calendar sync, metrics, or email jobs. |
| SQS | Lambda | AWS event source | Sends message batches to workers. Delivery is at least once. |
| Calendar worker | Google Calendar | HTTPS REST with OAuth 2.0 | Reads changes with `syncToken`. Writes focus blocks and agendas. |
| API and workers | RDS Proxy | PostgreSQL over TLS | Read and write tenant data. |
| RDS Proxy | PostgreSQL | PostgreSQL over TLS | Reuses database connections. |
| Notification worker | Resend | HTTPS REST | Sends email. |
| Services | CloudWatch and X-Ray | AWS APIs / OpenTelemetry | Sends logs, metrics, and traces. |

### End-to-End Scenario: Member Moves a Meeting

1. A member moves a meeting in Google Calendar.
2. Google sends a webhook to `api.spry.team`.
3. Cloudflare checks the request and forwards it to App Runner in Frankfurt. It does not cache the request.
4. The Core API validates the Google channel token.
5. The API adds a job to the calendar sync SQS queue and returns `200 OK`.
6. SQS starts the Calendar Sync Lambda.
7. The worker loads the encrypted OAuth token through KMS.
8. The worker calls Google Calendar with the saved `syncToken`.
9. The worker removes descriptions, notes, attachments, and external attendee emails.
10. The worker writes the changed times and the new `syncToken` to PostgreSQL through RDS Proxy.
11. The worker adds a recalculation job to the metrics SQS queue.
12. SQS starts the Analytics Lambda.
13. The worker recalculates meeting time, meeting count, focus time, and weekly changes.
14. The worker updates the insight summary in PostgreSQL.
15. The member opens the Home page.
16. The API reads the ready summary row and returns it to the browser.

Target result: the new insight is ready within **5 minutes p95** (**NFR-4**). SQS keeps the job if Google, Lambda, or PostgreSQL is slow. CloudWatch alerts if freshness is over **15 minutes** (**NFR-9**).

## 4. Estimated Price per Month

### Year 1

Planning estimate for **50,000 active members**:

| Service group | Average | Maximum |
|---|---:|---:|
| Cloudflare DNS, Pages, and WAF | $175 | $300 |
| App Runner and Lambda | $200 | $300 |
| RDS PostgreSQL Multi-AZ and RDS Proxy | $350 | $450 |
| SQS, EventBridge, KMS, Secrets Manager, CloudWatch, and X-Ray | $100 | $150 |
| Resend | $250 | $350 |
| **Total per month** | **$1,075** | **$1,550** |
| **Price per active member** | **$0.0215** | **$0.0310** |

The NFR-8 year-1 limit is **$7,500/month**, or **$0.15 per active member**. Both estimates are below the limit.

### Year 3

Planning estimate for **500,000 active members**, about **4 million calendar changes/day**, and a **5× Monday peak**:

| Service group | Average | Planning maximum |
|---|---:|---:|
| Cloudflare DNS, Pages, and WAF | $350 | $700 |
| App Runner and Lambda | $1,200 | $2,500 |
| Larger RDS PostgreSQL Multi-AZ, RDS Proxy, storage, and read replicas | $1,800 | $3,500 |
| SQS, EventBridge, KMS, Secrets Manager, CloudWatch, and X-Ray | $700 | $1,500 |
| Resend | $2,500 | $4,000 |
| **Total per month** | **$6,550** | **$12,200** |
| **Price per active member** | **$0.0131** | **$0.0244** |

The year-3 estimate assumes that all 500,000 members are active. The planning maximum is not a hard billing limit. Actual cost can be higher if email volume, log retention, database storage, or traffic is higher than assumed. Current vendor prices must be checked before launch.
