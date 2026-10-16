# ADR 0006: AI-Assisted Agenda Parsing via Amazon Bedrock (Outside VPC)

- **Status**: Accepted
- **Date**: 2026-10-16
- **Authors**: Spry Architecture Team

## 1. Context and Problem Statement
Meeting agendas in real teams rarely originate from structured forms; they arrive as unstructured emails, Slack/Teams chats, or raw bulleted notes in multiple languages (Ukrainian, English). Users need a fast way to paste raw agenda text and have the system parse it into structured fields: meeting title, start time, duration, agenda items with owners/durations, and action items with assignees and due dates.

Key constraints:
1. **Zero Idle Cost ($0/month)**: The architecture must avoid standing monthly fees when idle (NFR-8).
2. **VPC Isolation**: The main FastAPI backend and Aurora PostgreSQL cluster reside inside a private VPC with no NAT Gateway ($32+/mo) to prevent idle costs.
3. **Data Integrity & Security**: Untrusted text from the outside must never trigger autonomous database mutations, and prompt injections must not tamper with internal system state. Every LLM call costs tokens, requiring authentication.

## 2. Decision
1. **Serverless AI Parsing Lambda outside VPC**:
   - We provision a dedicated Lambda function (`spry-agenda-parser`) with a direct HTTPS Function URL with CORS.
   - It runs **outside the VPC**, allowing direct, high-speed public access to Amazon Bedrock endpoints over AWS backbone without requiring expensive NAT Gateways ($32/mo) or VPC Interface Endpoints ($7.30/mo).
   - Idle cost remains strictly **$0.00**.

2. **Foundation Model Selection**:
   - We deploy **`mistral.ministral-3-14b-instruct`** (with seamless configuration support for `qwen.qwen3-32b-v1:0` and `deepseek.v3.2`) via the Bedrock Converse API with native tool calling (`record_agenda`).
   - Cost: **$0.10 / 1M input tokens**, **$0.30 / 1M output tokens**. A typical agenda parse costs ~**$0.00013** (< 0.02 cents).
   - Demonstrates near-perfect Ukrainian & English comprehension, strict date resolution from the user's local timezone, and adherence to strict zero-hallucination rules.

3. **Decoupled Architecture: Model Suggests, Human Decides, Core API Writes**:
   - The AI parser strictly returns ephemeral JSON (`ParsedAgenda`) to the client browser.
   - The frontend pre-fills the agenda form and displays **`AI Suggested`** badges until the user reviews or edits the values.
   - Persistence happens **only** through the trusted, authenticated `POST /api/meetings/{id}/agenda` endpoint inside the VPC. The LLM never has database credentials.
   - The API stores the original suggestion in a PostgreSQL `ai_suggestion` JSONB column alongside final user values to track correction metrics.

4. **Security & Financial Guardrails**:
   - The Function URL validates the user's Cognito JWT before invoking Bedrock (returns HTTP 401 on unauthorized access).
   - Rejects text payloads over 10,000 characters with HTTP 413.
   - Configured an AWS Budgets Alarm at **$5.00/month** with real-time email alerts.

## 3. Alternatives Considered
1. **Calling Bedrock directly from the main API inside VPC**:
   - *Rejected*: Requires provisioning AWS PrivateLink VPC Interface Endpoints for Bedrock (`com.amazonaws.us-east-1.bedrock-runtime`). Cost is ~$7.30/month per AZ ($14.60 - $21.90/mo), violating the $0 idle cost requirement.
2. **Calling Anthropic / OpenAI API directly over the internet from VPC**:
   - *Rejected*: Requires an AWS NAT Gateway ($32.40/month + traffic egress) or public IP routing for VPC Lambdas.
3. **Regex / Rule-based Parser**:
   - *Rejected*: Brittle, incapable of understanding Ukrainian natural language morphology, relative dates ("next Tuesday after lunch"), or unstructured informal chat messages.

## 4. Consequences
- **Positive**:
  - Zero idle cost ($0.00).
  - Sub-2-second parsing latency with accurate multilingual extraction.
  - Resilience: If Amazon Bedrock or the parser experiences an outage or throttling (429), users can type the agenda manually without any disruption to the core meeting scheduling system.
  - Continuous feedback loop: Comparing `ai_suggestion` against final saved `agenda` produces quality signals without requiring separate survey modals.
- **Negative / Risks**:
  - Relative dates depend on client-provided timezone and reference date.
  - Cold starts on image-based Lambda (~1.5s on first invocation).
