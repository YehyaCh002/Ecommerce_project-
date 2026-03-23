# تشغيل Migration على Windows

## 📋 الخطوات السريعة

### 1. Backup قاعدة البيانات

```powershell
# في PowerShell أو CMD
pg_dump -U postgres -h localhost -d ecommerce > backup_before_migration.sql
```

إذا `pg_dump` غير موجود، استخدم هذا:

```powershell
# ابحث عن Docker container
docker ps

# اعمل backup عبر Docker
docker exec -i <CONTAINER_ID> pg_dump -U postgres ecommerce > backup_before_migration.sql

# مثال:
# docker exec -i postgres_container pg_dump -U postgres ecommerce > backup_before_migration.sql
```

### 2. فحص قاعدة البيانات (اختياري)

```bash
npm run db:inspect
```

هذا يعرض لك بنية الجداول الحالية.

### 3. تشغيل Migration

```bash
npm run migration:run
```

### 4. التحقق من النجاح

```bash
npm run migration:verify
```

### 5. اختبار التطبيق

```bash
npm run dev
```

---

## ⚠️ إذا حدث خطأ

### الاسترجاع من Backup

```powershell
# أوقف التطبيق
npm run docker:down

# أعد تشغيل قاعدة البيانات
docker-compose up -d db

# استرجع من الـ backup
psql -U postgres -h localhost -d ecommerce < backup_before_migration.sql

# أو عبر Docker:
docker exec -i <CONTAINER_ID> psql -U postgres ecommerce < backup_before_migration.sql
```

---

## 🔍 فحص النتائج

بعد Migration يجب أن ترى:

- ✅ IDs من نوع `INTEGER` وليس `UUID`
- ✅ IDs تسلسلية (1, 2, 3, ...)
- ✅ جميع البيانات موجودة
- ✅ Foreign Keys تعمل

---

## 📞 Docker Container Name

لمعرفة اسم الـ container:

```powershell
docker ps
```

ابحث عن container اسمه شبيه بـ:
- `ecommerce_db`
- `ecommerce_project_db_1`
- `postgres`

---

## ✅ الخلاصة

```bash
# 1. Backup
docker exec -i <CONTAINER> pg_dump -U postgres ecommerce > backup.sql

# 2. Run Migration
npm run migration:run

# 3. Verify
npm run migration:verify

# 4. Test
npm run dev
```

**ملاحظة**: الـ Migration الجديدة مصلحة وتستخدم أسماء الأعمدة الفعلية من قاعدة البيانات!
