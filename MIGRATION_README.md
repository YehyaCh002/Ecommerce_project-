# خطوات تنفيذ Migration من UUID إلى Auto-Increment
# Steps to Execute UUID to Auto-Increment Migration

## 📋 الملخص | Summary

تم إنشاء migration كاملة تحول جميع IDs من UUID إلى أرقام تسلسلية (auto-increment) مع الحفاظ على البيانات.

A complete migration has been created to convert all IDs from UUID to auto-increment integers while preserving data.

---

## 🚀 التنفيذ السريع | Quick Start

### 1. عمل Backup (مهم جداً!) | Make Backup (Very Important!)

```bash
# Backup قاعدة البيانات
docker exec ecommerce_db pg_dump -U postgres ecommerce > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. تشغيل Migration | Run Migration

```bash
# شغل الـ migration
npm run migration:run
```

### 3. التحقق من النجاح | Verify Success

```bash
# شغل سكريبت التحقق
npm run migration:verify
```

---

## 📚 الأوامر المتاحة | Available Commands

```bash
# عرض Migrations المتاحة
npm run migration:show

# تشغيل Migrations
npm run migration:run

# إنشاء migration جديدة
npm run migration:generate src/migrations/MigrationName

# التراجع عن آخر migration (لا يعمل مع هذه Migration!)
npm run migration:revert

# التحقق من البيانات بعد Migration
npm run migration:verify

# إعادة بناء قاعدة البيانات من الصفر (يحذف كل البيانات!)
npm run db:rebuild
```

---

## 📁 الملفات المهمة | Important Files

```
src/
├── migrations/
│   └── 1711234567890-ConvertUuidToAutoIncrement.ts  ← الـ migration
├── scripts/
│   ├── rebuild-database.ts     ← إعادة بناء كاملة (يحذف البيانات)
│   └── verify-migration.ts     ← التحقق من نجاح Migration
└── entities/                   ← تم تحديثها إلى INT IDs

MIGRATION_GUIDE.md              ← دليل شامل بالعربية والإنجليزية
```

---

## ⚙️ كيف تعمل Migration؟ | How Does Migration Work?

### المراحل | Phases:

1. **Mapping Tables** - إنشاء جداول تحفظ العلاقة UUID → INT
2. **Populate Mappings** - ملء جداول الـ mapping
3. **Create New Tables** - إنشاء جداول جديدة بـ INT IDs
4. **Copy Data** - نسخ البيانات مع تحويل IDs
5. **Update Sequences** - تحديث الـ sequences
6. **Rename Tables** - إعادة تسمية الجداول
7. **Cleanup** - حذف جداول الـ mapping

### الترتيب | Order:

الـ migration تراعي Foreign Keys وتنفذ العمليات بالترتيب الصحيح:

```
Category → User → Customer → DeliveryPlatform
    ↓
Product → ProductVariant
    ↓
Cart → CartItem
    ↓
Order → OrderItem → OrderHistory
```

---

## ✅ ما يجب التحقق منه | What to Check

بعد تشغيل `npm run migration:verify`:

- ✅ جميع الجداول موجودة
- ✅ IDs من نوع INTEGER
- ✅ عدد السجلات صحيح
- ✅ Foreign Keys سليمة (لا توجد orphan records)
- ✅ Sequences محدثة
- ✅ Indexes موجودة

---

## 🔄 إذا حدث خطأ | If Something Goes Wrong

### استرجاع من Backup | Restore from Backup

```bash
# 1. أوقف السيرفر
npm run docker:down

# 2. أعد تشغيل قاعدة البيانات
docker-compose up -d db

# 3. استرجع من Backup
docker exec -i ecommerce_db psql -U postgres ecommerce < backup_YYYYMMDD_HHMMSS.sql

# 4. أرجع entity files للـ UUID (إذا لزم الأمر)
# غيّر id: number إلى id: string
# غيّر @PrimaryGeneratedColumn() إلى @PrimaryGeneratedColumn('uuid')
```

---

## 📊 الفوائد المتوقعة | Expected Benefits

### الأداء | Performance:
- ⚡ استعلامات أسرع بـ **2-3x**
- 💾 حجم قاعدة البيانات أصغر بـ **30-40%**
- 🚀 Indexes أسرع وأصغر

### سهولة الاستخدام | Usability:
- 👁️ IDs قابلة للقراءة (123 بدلاً من a7f3b2e4-...)
- 📈 Chronological ordering مجاني
- 🐛 Debugging أسهل

---

## ⚠️ تحذيرات مهمة | Important Warnings

1. **لا يمكن التراجع تلقائياً** - يجب استخدام Backup
2. **تأكد من عمل Backup قبل التشغيل**
3. **اختبر على بيئة تطوير أولاً**
4. **قد تستغرق وقتاً إذا كان هناك بيانات كثيرة**

---

## 🧪 الاختبار | Testing

```bash
# 1. شغل السيرفر
npm run dev

# 2. اختبر API
curl http://localhost:3000/api/products
curl http://localhost:3000/api/orders

# 3. تحقق من الـ responses
# يجب أن ترى IDs أرقام صحيحة وليست UUIDs
```

---

## 📞 الدعم | Support

راجع الملف `MIGRATION_GUIDE.md` للتفاصيل الكاملة.

إذا واجهت مشاكل:
1. راجع الـ console logs
2. استخدم `npm run migration:verify`
3. تحقق من PostgreSQL logs
4. استخدم Backup للاسترجاع

---

**تاريخ الإنشاء:** 2026-03-23
**الحالة:** ✅ جاهزة للاستخدام

**الخطوة التالية:** اعمل backup وشغل `npm run migration:run`
