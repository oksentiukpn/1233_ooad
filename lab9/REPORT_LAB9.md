# Звіт з Лабораторної роботи №9: Multicloud Architecture (AWS vs Microsoft Azure)

**Студент:** Олександр Оксентюк  
**Курс:** Object-Oriented Analysis & Design (OOAD)  
**Azure Subscription:** `Azure for Students` (`0aedee51-9c57-4e99-a486-82856d0f69ad`)  
**AWS Account ID:** `791614297907`  
**Регіон Azure:** `norwayeast` (Norway East) | **Регіон AWS:** `us-east-1`  
**Розгорнутий URL API в Azure:** [`https://spry-api.gentleplant-48a4629f.norwayeast.azurecontainerapps.io`](https://spry-api.gentleplant-48a4629f.norwayeast.azurecontainerapps.io)  
**PostgreSQL FQDN:** `spry-pg-rsbvpn.postgres.database.azure.com`

---

## Частина 1 — Вибір сервісів Azure для Spry та ADR

Повний текст Архітектурного Рішення оформлено у файлі [`docs/adr/0008-azure-architecture.md`](../docs/adr/0008-azure-architecture.md).

### Таблиця відповідності компонентів Spry

| Компонент Spry           | На AWS                       | На GCP                 | **На Microsoft Azure (наш вибір)**                         | Чому саме цей вибір                                                                                                                                          |
| ------------------------ | ---------------------------- | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend CDN**         | S3 + CloudFront / Cloudflare | Firebase Hosting       | **Cloudflare Pages** (з опцією Azure Static Web Apps)      | **Лишаємо Cloudflare Pages**: безкоштовний необмежений трафік (0 egress fees), вбудований SSL, захист від DDoS, автоматичний CI/CD через Git.                |
| **Backend API**          | Lambda + Function URL        | Cloud Run              | **Azure Container Apps (Consumption)**                     | Serverless-контейнери на KEDA + Envoy, **масштабування до 0**, вбудований HTTPS, безкоштовно 2 млн запитів та 180 000 vCPU-сек щомісяця.                     |
| **Реляційна БД**         | Aurora Serverless v2         | Cloud SQL for Postgres | **Azure Database for PostgreSQL Flexible Server (`B1ms`)** | Повна сумісність з PostgreSQL 16 та міграціями Alembic. Бурстовий недорогий тир $12–$14/міс. Можливість примусової зупинки (stop), коли не використовується. |
| **NoSQL (альтернатива)** | DynamoDB                     | Firestore              | **Azure Cosmos DB (Serverless / Free Tier)**               | Безкоштовна квота 1 000 RU/s та 25 GB назавжди. $0 в стані спокою, але потребує переписування SQL-моделей на документне сховище.                             |
| **Секрети**              | Secrets Manager              | Secret Manager         | **Azure Key Vault**                                        | Централізоване безпечне сховище паролів БД та секретів з безшовною Managed Identity інтеграцією в Container Apps.                                            |
| **Аутентифікація**       | Cognito User Pool            | Identity Platform      | **Microsoft Entra External ID** (або гібридний OIDC JWT)   | Бекенд перевіряє стандартизовані OIDC JWT-підписи, що дозволяє не мігрувати хеші паролів користувачів.                                                       |
| **AI / Agenda Parsing**  | Bedrock (Ministral/Claude)   | Vertex AI (Gemini)     | **Azure AI Foundry / Azure OpenAI**                        | Доступні моделі GPT-4o-mini або Phi-4 з низькою вартістю за токен.                                                                                           |
| **Email**                | SES / Resend                 | SendGrid / Mailgun     | **Resend / Azure Communication Services**                  | Хмаро-незалежний REST API з ключем у Key Vault.                                                                                                              |
| **Логування**            | CloudWatch Logs              | Cloud Logging          | **Azure Monitor (Log Analytics Workspace)**                | Централізований збір логів контейнерів та аналітика запитів через KQL.                                                                                       |

### Відповіді на ключові питання Part 1:

1. **База даних: 24/7 vs Зупинка на ніч vs Cosmos DB vs Міжхмарний виклик:**
   - **PostgreSQL 24/7**: Затримка мінімальна (~1–2 мс у norwayeast), вартість ~$16/міс (`B1ms` + 32GB SSD), код не змінюється взагалі.
   - **PostgreSQL із зупинкою (Stop)**: Затримка при холодному старті ~60–90 сек на підйом інстансу, вартість за compute падає до $0 (сплачується лише ~$3.68/міс за диск), код не змінюється.
   - **Cosmos DB (Free tier / Serverless)**: Затримка <5 мс, вартість **$0.00/міс**, але вимагає повної відмови від SQL, joins, foreign keys та переписування моделей даних.
   - **Міжхмарний виклик до AWS Aurora**: Затримка стрибає до 40–80 мс на кожен запит (cross-cloud мережа), з'являється плата за вихідний трафік (egress) з AWS ($0.09/GB).
2. **E-mail та ключі**: Використовується Resend (або Azure Communication Services); API-ключ генерується один раз і зберігається виключно в **Azure Key Vault** як секрет `resend-api-key`, звідки підтягується в змінні оточення Container Apps без збереження у git.
3. **Що не варто переносити з Spry одразу**:
   - **Пул користувачів Cognito**: Cognito не віддає хеші паролів з міркувань безпеки; примусова міграція змусить усіх користувачів скидати паролі.
   - **Cloudflare Pages**: Фронтенд уже надійно працює на глобальному edge без прив'язки до провайдера бекенду.

---

## Частина 2 — Інфраструктура ядра Spry в Azure (`azure/`)

У репозиторії створено окрему папку [`azure/`](file:///home/sasha/work_dir/1233_ooad/azure) з незалежним станом Terraform:

- [`azure/versions.tf`](file:///home/sasha/work_dir/1233_ooad/azure/versions.tf) — провайдер `azurerm` (~> 3.100), `random`.
- [`azure/variables.tf`](file:///home/sasha/work_dir/1233_ooad/azure/variables.tf) — конфігураційні змінні з урахуванням дозволених регіонів студентської підписки (`norwayeast`).
- [`azure/main.tf`](file:///home/sasha/work_dir/1233_ooad/azure/main.tf) — Resource Group (`spry-rg`), Log Analytics Workspace (`spry-law-rsbvpn`), Key Vault (`spry-kv-rsbvpn`) з випадковим паролем БД.
- [`azure/database.tf`](file:///home/sasha/work_dir/1233_ooad/azure/database.tf) — Azure Database for PostgreSQL Flexible Server (`Standard_B1ms`, 32 GB), база `spry`, правила фаєрволу та згенерований `database-url`.
- [`azure/container_app.tf`](file:///home/sasha/work_dir/1233_ooad/azure/container_app.tf) — Azure Container Apps Environment та додаток API з автоматичним масштабуванням до 0 (`min_replicas = 0`).
- [`azure/outputs.tf`](file:///home/sasha/work_dir/1233_ooad/azure/outputs.tf) — публічні URL та параметри підключення.

### Результати розгортання в Azure:

```text
api_url                 = "https://spry-api.gentleplant-48a4629f.norwayeast.azurecontainerapps.io"
azure_region            = "norwayeast"
database_admin_username = "spryadmin"
database_fqdn           = "spry-pg-rsbvpn.postgres.database.azure.com"
database_name           = "spry"
key_vault_name          = "spry-kv-rsbvpn"
resource_group_name     = "spry-rg"
```

### Застосування міграцій бази даних (Alembic):

Міграції успішно виконано безпосередньо проти живого інстансу PostgreSQL Flexible Server в Azure:

```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, create meetings table
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, create users table
INFO  [alembic.runtime.migration] Running upgrade 0002 -> 0003, add agenda and ai_suggestion to meetings
```

---

## Частина 3 — Порівняння вартості: AWS проти Microsoft Azure

Усі ціни наведено за офіційними калькуляторами AWS (us-east-1) та Azure (norwayeast / westeurope), з розрахунку 730 годин на місяць.

### Базове порівняння: Ядро Spry у стані спокою (1 місяць без навантаження)

| Компонент                  | AWS (Лабораторна 4, Етап 2)                         | Microsoft Azure (Ця лабораторна)                                               |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Frontend + CDN + HTTPS** | CloudFront Free Tier / Cloudflare Pages → **$0.00** | Cloudflare Pages / Static Web Apps Free → **$0.00**                            |
| **API Compute**            | AWS Lambda (idle, 0 викликів) → **$0.00**           | Azure Container Apps (scaled to 0, 0 викликів) → **$0.00**                     |
| **База даних (Compute)**   | Aurora Serverless v2 (0 ACU, paused) → **$0.00**    | Azure PostgreSQL `B1ms` ($0.017/год × 730) → **$12.41** _(або $0 при stopped)_ |
| **База даних (Storage)**   | ~1 GB Aurora storage → **$0.10**                    | 32 GB SSD storage ($0.115/GB/міс) → **$3.68**                                  |
| **Реєстр, секрети, логи**  | ECR, Secrets Manager, CloudWatch → **~$0.15**       | ACR, Key Vault (в межах безкоштовних операцій), Log Analytics → **~$0.10**     |
| **РАЗОМ (місяць простою)** | **≈ $0.25 – $0.30 / місяць**                        | **≈ $16.19 / місяць** _(або **≈ $3.78**, якщо інстанс зупинено)_               |

> **З NoSQL (Cosmos DB Free Tier замість PostgreSQL):**  
> Якщо замінити реляційну БД на Azure Cosmos DB з довічною безкоштовною квотою (1 000 RU/s + 25 GB free), то ядро Spry на Azure в стані спокою коштує **$0.00 / місяць**, аналогічно до DynamoDB на AWS.

---

### Розрахунок для 4 профілів навантаження

| Профіль навантаження                           | AWS (Aurora v2 + Lambda) | Azure (PostgreSQL B1ms + Container Apps) | Azure (Cosmos DB + Container Apps) | Яка хмара дешевша і чому?                                                                                                                                                           |
| ---------------------------------------------- | ------------------------ | ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Nobody (0 год/міс)**                      | **~$0.30**               | ~$16.19 (або $3.78 stopped)              | **$0.00**                          | **AWS дешевша на $15.89** завдяки автоматичній паузі Aurora Serverless v2.                                                                                                          |
| **2. Class Demos (10 × 2 год = 20 год)**       | **~$2.50**               | ~$16.20 (або ~$4.12 якщо зупиняти)       | **$0.00**                          | **AWS дешевша** (Aurora спить 710 годин із 730; Azure PostgreSQL працює весь місяць, якщо не зупиняти скриптом).                                                                    |
| **3. Office Hours (8 год × 22 дні = 176 год)** | **~$15.80**              | **~$16.20**                              | **$0.00**                          | **Приблизно однаково** (~$16). При активності 176 годин вартість Aurora v2 наздоганяє фіксовану вартість інстансу `B1ms`.                                                           |
| **4. Busy 24/7 (730 годин під навантаженням)** | **~$60.00 – $65.00**     | **~$16.50 – $18.00**                     | **$3.50 – $5.00**                  | **Azure значно дешевша** (у 3.5–4 рази!). На постійному навантаженні Aurora 0.5–1.0 ACU коштує ~$45–$90/міс, тоді як бурстовий інстанс Azure `B1ms` коштує лише ~$12.50 за compute. |

### Відповіді на запитання Part 3:

1. **Який рядок вирішує, яка хмара дешевша?**  
   Вирішальним рядком є **Compute бази даних (Database Compute)**.
   - При низькому / уривчастому трафіку виграє AWS, бо Aurora Serverless v2 здатна засинати до 0 ACU ($0/год).
   - При постійному цілодобовому навантаженні (24/7) виграє Azure, бо Aurora стає надмірно дорогою (~$0.06/ACU-год × 730 год ≈ $43.80 навіть для мінімальних 0.5–1 ACU), тоді як фіксований тир `B1ms` коштує лише $12.41/міс.
2. **Пастка вартості на стороні Azure/GCP (еквівалент Aurora):**  
   На AWS пастка — це будь-який фоновий процес або healthcheck, який не дає заснути Aurora v2, збільшуючи рахунок.  
   На Azure еквівалентна пастка полягає в тому, що **PostgreSQL Flexible Server НЕ засинає сам за відсутності з'єднань**. Навіть якщо на сайт ніхто не заходить цілий місяць, лічильник compute продовжує нараховувати $0.017 щогодини, якщо студент забув натиснути `Stop` або налаштувати автовимкнення.

---

## Частина 4 — Демо аналітичних та AI-сервісів Azure (Інструкція для здачі)

### 1. Azure AI Document Intelligence / Vision Studio (Аналог Document AI / Vision API)

- **Що робить:** Вилучає друкований/рукописний текст, ключові пари, таблиці та реквізити документів.
- **Як виконати демо:**
  1. Перейди до [Document Intelligence Studio](https://documentintelligence.ai.azure.com/) або [Azure Vision Studio](https://portal.vision.cognitive.azure.com/).
  2. Обери готовий інструмент **Read (OCR)** або **Invoices / Receipts**.
  3. Завантаж будь-який зразок документа (чек або рахунок-фактуру) та натисни **Run Analysis**.
  4. **Зроби скріншот №1**: екран із підсвіченими розпізнаними полями (Key-Value pairs або OCR bounding boxes).

### 2. Azure Synapse Serverless SQL (Аналог Google BigQuery)

- **Що робить:** Виконує serverless SQL-запит над відкритим датасетом без необхідності запускати та оплачувати кластер.
- **Як виконати демо:**
  1. У пошуку Azure Portal знайди **Azure Synapse Analytics** або скористайся **Azure Data Explorer / Microsoft Fabric**.
  2. У вбудованому SQL Query Editor виконай тестовий запит над відкритим відкритим сховищем таксі Нью-Йорка (NYC Taxi public parquet):

     ```sql
     SELECT
         passenger_count,
         COUNT(*) AS total_trips,
         AVG(fare_amount) AS avg_fare
     FROM OPENROWSET(
         BULK 'https://azureopendatastorage.blob.core.windows.net/nyctlc/yellow/puYear=2026/*.parquet',
         FORMAT='PARQUET'
     ) AS nyc_taxi
     GROUP BY passenger_count;
     ```
  3. **Зроби скріншот №2**: редактор запиту з таблицею результатів та кількістю оброблених байтів.

### 3. Microsoft Power BI (Аналог Looker Studio)

- **Що робить:** Інтерактивна візуалізація та дашборди на основі аналітичних даних.
- **Як виконати демо:**
  1. Відкрий [Power BI Service](https://app.powerbi.com/) (входить до студентської підписки UCU) або Power BI Desktop.
  2. Створи швидкий візуальний звіт (стовпчиковий графік розподілу поїздок або оплат).
  3. **Зроби скріншот №3**: графік/діаграма з легендою та показниками.

---

## Частина 5 — Сертифікації

Найкраще відповідають цьому модулю в екосистемі Microsoft Azure:

1. **Microsoft Certified: Azure Fundamentals (AZ-900)** — аналог Cloud Digital Leader / AWS Cloud Practitioner ($99 або безкоштовний ваучер для студентів).
2. **Microsoft Certified: Azure Administrator Associate (AZ-104)** — аналог Associate Cloud Engineer / SysOps.
3. **Microsoft Certified: Azure Solutions Architect Expert (AZ-305)** — аналог Professional Cloud Architect / AWS Solutions Architect Pro.
4. **Microsoft Certified: Azure Data Engineer Associate (DP-203)** — аналог Google Professional Data Engineer.

---

## Інструкція з Cleanup (Безпека студентського балансу)

Щоб зберегти $100 студентських кредитів після завершення перевірки викладачем:

1. **Зупинити PostgreSQL Flexible Server** (якщо потрібно зберегти дані):

   ```bash
   az postgres flexible-server stop --resource-group spry-rg --name spry-pg-rsbvpn
   ```
2. **Повне видалення всієї створеної інфраструктури** (найбезпечніший варіант):

   ```bash
   cd /home/sasha/work_dir/1233_ooad/azure
   terraform destroy -auto-approve
   ```

   Або через Azure CLI в одну команду:

   ```bash
   az group delete --name spry-rg --yes --no-wait
   ```
