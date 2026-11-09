# Spry — Єдина інформаційна система реєстрації засідань та нарад

Офіційний веб-портал та хмарний монорепозиторій інформаційної системи обліку засідань Верховної Ради України / бізнес-організацій **Spry**.

- **Продакшн веб-сайт**: [https://1233.pp.ua](https://1233.pp.ua)
- **Повна оновлена архітектура системи**: дивіться [ARCHITECTURE.md](ARCHITECTURE.md)
- **Історія архітектурної міграції (Labs 1–6)**: [architecture-migration.md](architecture-migration.md)
- **Архітектурне рішення щодо ШІ (ADR 0006)**: [docs/adr/0006-llm-agenda-parsing.md](docs/adr/0006-llm-agenda-parsing.md)
- **Архітектурне рішення щодо міграції на Terraform (ADR 0007)**: [docs/adr/0007-terraform.md](docs/adr/0007-terraform.md)
- **Архітектурне рішення щодо мультіхмарності на Azure (ADR 0008)**: [docs/adr/0008-azure-architecture.md](docs/adr/0008-azure-architecture.md)

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

### 1. Первинна хмара: AWS (`infra/`)

Вся продакшн-інфраструктура Spry на AWS описана в каталозі `infra/` та керується через **HCP Terraform**:

- `infra/versions.tf` — налаштування AWS-провайдера та бекенду HCP Terraform.
- `infra/auth.tf` — автентифікація Amazon Cognito, Google IdP, OAuth клієнти.
- `infra/reports.tf` — щотижневі звіти (EventBridge Scheduler, SQS, S3, Lambdas).
- `infra/ai.tf` — ШІ-парсер порядку денного на базі Amazon Bedrock.
- `infra/outputs.tf` — параметри інфраструктури для фронтенду та автоматизації.

### 2. Мультихмарне розгортання: Microsoft Azure (`azure/`)

Ядро Spry (API, база даних, секрети) адаптоване для розгортання в **Microsoft Azure**:

- `azure/versions.tf` — конфігурація провайдера `azurerm` (~> 3.100).
- `azure/main.tf` — Resource Group (`spry-rg`), Log Analytics Workspace, Key Vault з автогенерацією пароля.
- `azure/database.tf` — Azure Database for PostgreSQL Flexible Server (`Standard_B1ms`, 32GB).
- `azure/container_app.tf` — Azure Container Apps Environment та додаток API з автоматичним масштабуванням до 0.
- `azure/outputs.tf` — публічні адреси API та параметри підключення.

```bash
# Перехід до каталогу Azure інфраструктури
cd azure

# Ініціалізація та валідація
terraform init
terraform validate

# Перегляд плану розгортання в Azure
terraform plan

# Розгортання (потрібна активна сесія az login)
terraform apply

# Зупинка інстансу БД для збереження студентських кредитів
az postgres flexible-server stop --resource-group spry-rg --name <pg-name>

# Повне очищення ресурсів
terraform destroy
```

---

## Ключові особливості

1. **AI-Assisted Agenda Parsing (Amazon Bedrock)**:
   - Розпізнавання неструктурованих чернеток порядку денного через сучасну модель `mistral.ministral-3-14b-instruct`.
   - Принцип «Model suggests, human decides, core API writes» — ШІ пропонує структуровані поля форми, користувач перевіряє та зберігає.
2. **Zero Idle Cost ($0 при простої)**:
   - Всі обчислення базуються на serverless-архітектурі (AWS Lambda / Azure Container Apps із масштабуванням до 0).
   - База даних Aurora Serverless v2 автоматично призупиняється при неактивності (0.0 ACU).
   - Фронтенд обслуговується на Cloudflare Pages без витрат на вихідний трафік (egress).
3. **Безпека та автентифікація**:
   - Інтеграція з Amazon Cognito (OIDC PKCE + Google Federated Login).
   - Захист від Denial of Wallet (AWS Budgets $5.00/міс).
   - Секрети зберігаються в AWS Secrets Manager та Azure Key Vault.
   - Динамічні тимчасові OIDC-credentials для CI/CD без статичних IAM ключів.
