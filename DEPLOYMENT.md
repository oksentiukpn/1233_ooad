# 🚀 Spry Deployment Guide: Варіант 2 (AWS App Runner + RDS PostgreSQL)

Цей документ описує архітектуру розгортання та точні інструкції запуску системи **Spry** за **Варіантом 2** згідно з [arhitecture.md](file:///home/sasha/work_dir/1233_ooad/arhitecture.md).

---

## 1. Економічна модель та бюджет

| Сервіс | Роль | Ціна / день | Ціна / місяць | Примітка щодо економії |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** (S3 + CloudFront) | Роздача SPA (React Vite) | **$0.00** | $0.00 | Free Tier: 1 TB CloudFront вихідного трафіку, 10 млн HTTP/HTTPS запитів |
| **Backend** (AWS App Runner) | FastAPI Core API | **~$0.34** | ~$10.00 | Сплачується лише зарезервована пам'ять ($0.007/GB-год для 0.5 GB). **Немає ALB ($18/міс) та NAT Gateway ($32/міс)** |
| **Database** (RDS PostgreSQL 16) | Основна реляційна БД | **~$0.38** | ~$11.50 | `db.t4g.micro`, 20 GB gp3 storage. В межах перших 12 міс. AWS Free Tier — **$0.00** |
| **Amazon ECR** | Реєстр Docker-образів | **$0.00** | $0.00 | 500 MB Free Tier, налаштовано auto-cleanup (зберігаються лише останні 3 образи) |
| **РАЗОМ** | | **~$0.72 / день** | **~$21.50 / міс** | **Ваших $43 Free Tier вистачить на ~60 днів роботи!** |

---

## 2. Структура інфраструктури (IaC у `infra/`)

- [infra/versions.tf](file:///home/sasha/work_dir/1233_ooad/infra/versions.tf): Провайдер `aws ~> 5.50` та закріплення регіону `eu-central-1` (Frankfurt, GDPR compliance).
- [infra/variables.tf](file:///home/sasha/work_dir/1233_ooad/infra/variables.tf): Параметри бази даних, портів та прапорців увімкнення.
- [infra/main.tf](file:///home/sasha/work_dir/1233_ooad/infra/main.tf):
  1. `aws_ecr_repository` з лімітом збереження 3 образів.
  2. `aws_db_instance` (PostgreSQL 16.9, `db.t4g.micro`, 20GB gp3, `publicly_accessible = true`).
  3. `aws_iam_role` для App Runner з політикою `AWSAppRunnerServicePolicyForECRAccess`.
  4. `aws_apprunner_service` з автодеплоєм на новий push в ECR.
  5. `aws_s3_bucket` + `aws_cloudfront_distribution` (PriceClass_100, SPA rewrite 403/404 -> 200).
- [infra/outputs.tf](file:///home/sasha/work_dir/1233_ooad/infra/outputs.tf): Вихідні URL, адреси БД та ECR.
- [scripts/deploy_aws.sh](file:///home/sasha/work_dir/1233_ooad/scripts/deploy_aws.sh): Автоматизований пайплайн повного деплою в один крок.

---

## 3. Як запустити розгортання в AWS (Коли будете готові)

### Варіант А. В один клік через скрипт (Turn-Key)

У кореневій директорії проєкту запустіть:
```bash
make deploy-aws
```
або напряму:
```bash
./scripts/deploy_aws.sh
```

**Що виконає цей скрипт автоматично:**
1. Створить ECR, RDS Postgres, S3 та CloudFront в `eu-central-1`.
2. Збере бекенд Docker-образ `spry-backend:latest` і завантажить в ECR.
3. Виконає міграції бази даних Alembic (`alembic upgrade head`) напряму на RDS.
4. Підніме сервіс AWS App Runner з підключенням до RDS та портом 8000.
5. Збере фронтенд з URL бекенду та завантажить в S3/CloudFront.
6. Виведе готові публічні посилання!

---

### Варіант Б. Покроковий ручний запуск

1. **Ініціалізація та попередній перегляд плану:**
   ```bash
   make infra-init
   make infra-plan
   ```

2. **Створення базової інфраструктури (ECR, RDS, S3, CloudFront):**
   ```bash
   make infra-apply-base
   ```

3. **Збірка та завантаження образу бекенду в ECR:**
   ```bash
   make build-backend
   make deploy-backend
   ```

4. **Застосування міграцій до RDS:**
   ```bash
   make db-migrate
   ```

5. **Підняття сервісу AWS App Runner:**
   ```bash
   make infra-apply-apprunner
   ```

6. **Деплой фронтенду:**
   ```bash
   make deploy-frontend
   ```

---

## 4. Як повністю зупинити інфраструктуру та видалити ресурси (0 витрат)

Коли тестування або лабораторна завершена, щоб не витрачати кошти з балансу:

```bash
make infra-destroy
```

Ця команда видалить усі створені ресурси в AWS (RDS інстанс, App Runner, S3 бакет, ECR репозиторій та CloudFront), зупинивши будь-яку тарифікацію.
