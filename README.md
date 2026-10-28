# Spry — Єдина інформаційна система реєстрації засідань та нарад

Офіційний веб-портал та хмарний монорепозиторій інформаційної системи обліку засідань Верховної Ради України / бізнес-організацій **Spry**.

- **Продакшн веб-сайт**: [https://1233.pp.ua](https://1233.pp.ua)
- **Повна оновлена архітектура системи**: дивіться [ARCHITECTURE.md](ARCHITECTURE.md)
- **Історія архітектурної міграції (Labs 1–6)**: [architecture-migration.md](architecture-migration.md)
- **Архітектурне рішення щодо ШІ (ADR 0006)**: [docs/adr/0006-llm-agenda-parsing.md](docs/adr/0006-llm-agenda-parsing.md)
- **Архітектурне рішення щодо міграції на Terraform (ADR 0007)**: [docs/adr/0007-terraform.md](docs/adr/0007-terraform.md)

---

## Швидкий старт (Локальна розробка)

```bash
# Клонування репозиторію
git clone git@github.com:oksentiukpn/1233_ooad.git
cd 1233_ooad

# Запуск повного локального стеку через Podman / Docker Compose
make dev

# Запуск тестів та перевірок якості коду
make test
make lint
make format-check
```

---

## Інфраструктура як код (Infrastructure as Code)

Вся інфраструктура Spry централізовано описана за допомогою **Terraform** у каталозі `infra/` та керується через **HCP Terraform**:

- `infra/versions.tf` — налаштування провайдерів та бекенду HCP Terraform.
- `infra/auth.tf` — автентифікація Amazon Cognito, Google IdP, OAuth клієнти.
- `infra/reports.tf` — щотижневі звіти (EventBridge Scheduler, SQS, S3, Lambdas).
- `infra/ai.tf` — ШІ-парсер порядку денного на базі Amazon Bedrock.
- `infra/outputs.tf` — параметри інфраструктури для фронтенду та автоматизації.

### Робота з інфраструктурою:

```bash
# Ініціалізація Terraform
make infra-init

# Перегляд запланованих змін (speculative plan)
make infra-plan
```

> **Примітка:** Застосування змін (`terraform apply`) заборонено виконувати з локальних комп'ютерів розробників. Усі зміни проходять перевірку через pull request та автоматично застосовуються у HCP Terraform після злиття (merge) у гілку `main`. Детальніше див. [ADR 0007](docs/adr/0007-terraform.md).

---

## Ключові особливості

1. **AI-Assisted Agenda Parsing (Amazon Bedrock)**:
   - Розпізнавання неструктурованих чернеток порядку денного через сучасну модель `mistral.ministral-3-14b-instruct`.
   - Принцип «Model suggests, human decides, core API writes» — ШІ пропонує структуровані поля форми, користувач перевіряє та зберігає.
2. **Zero Idle Cost ($0 при простої)**:
   - Всі обчислення базуються на AWS Lambda (FastAPI бекенд та ШІ-парсер).
   - База даних Aurora Serverless v2 автоматично призупиняється при неактивності (0.0 ACU).
   - ШІ-парсер винесено за межі VPC, що виключає плату за дорогі NAT Gateway чи VPC Endpoints.
3. **Безпека та автентифікація**:
   - Інтеграція з Amazon Cognito (OIDC PKCE + Google Federated Login).
   - Захист від Denial of Wallet (AWS Budgets $5.00/міс).
   - Динамічні тимчасові OIDC-credentials для CI/CD та HCP Terraform без статичних IAM ключів.
