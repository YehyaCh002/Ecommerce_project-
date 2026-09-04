# دليل اختبار الضغط وحركة المرور / Load Testing Guide

> **English below / الترجمة الإنجليزية بالأسفل**

---

## Part 1 — فهم الأساسيات / Understanding the Basics

### 🟢 English

**What is load testing?**
Load testing is like a "stress rehearsal" for your website. Instead of 1 person visiting your
site at a time, we simulate **hundreds of users clicking at the same time** to see:

- How fast your server responds (**latency** — the time to get an answer)
- How many requests it can handle per second (**req/s / throughput**)
- When it starts to **fail or slow down** (the "breaking point")

**What tool did we use?**
We used **autocannon** — a free, lightweight tool made specifically for Node.js servers. It
fires a flood of HTTP requests at your API and measures the results.

**Key terms you'll see in the output:**

| Term | Meaning (English) | Meaning (Arabic) |
|------|-------------------|------------------|
| `connections` | Number of simulated users hitting at once | عدد المستخدمين المتزامنين |
| `duration` | How long the test runs (seconds) | مدة الاختبار بالثواني |
| `req/s` | Requests the server processed per second | عدد الطلبات في الثانية |
| `latency` (avg) | Average response time (ms) | متوسط زمن الاستجابة |
| `p99 latency` | 99% of requests are faster than this (ms) | 99% من الطلبات أسرع من هذه القيمة |
| `throughput` | Amount of data transferred per second | حجم البيانات المنقولة في الثانية |
| `errors` | Failed requests | الطلبات الفاشلة |
| `timeouts` | Requests that waited too long and gave up | الطلبات التي توقفت بسبب الانتظار |

---

## Part 2 — لماذا اختبرنا حسب النقاط / Why we tested these endpoints

### 🟢 English

We tested **4 types of endpoints** to learn different things:

1. **GET / and /auth/status** — these do NOT touch the database → tests the **pure speed** of
   the server (the ceiling of what it can do). Result: ~6,000–8,000 req/s.
2. **GET /health** — makes a tiny database check → tests DB connection speed. Very fast (~5,000 req/s).
3. **GET /products and /categories** — run **real, heavy database queries** → this is the realistic
   bottleneck. Result: only ~100–190 req/s. **This is what matters for real users.**
4. **Protected endpoints** (users/me, cart) — need login → tests JWT auth overhead.

### 🟢 English — What the results told us

- The server itself is **very fast and stable** (never crashed).
- The **database queries are the real limit**, especially `/products` which returns ALL products
  with ALL their variants in one request (no pagination).
- Increasing concurrency does **not** make DB endpoints faster — they're capped by query time.

---

## Part 3 — كيف تشغّل الاختبارات بنفسك / How to run the tests on YOUR device

### 🟢 English — Prerequisites

1. **Node.js** installed (check with `node -v`).
2. **Docker Desktop** running, so your PostgreSQL database is up.
3. Your project's API running on port **3002**.

### 🟢 English — One-time setup (already done for you)

```bash
npm install --save-dev autocannon @types/autocannon
```

### 🟢 English — Start your server

```bash
# Start Docker (PostgreSQL database)
# 1. Open Docker Desktop and wait until it shows "running"
# 2. Then start the database:
docker-compose up -d

# 3. Start the API server (in a separate terminal):
npm run dev
```

### 🟢 English — Run the tests

```bash
# Basic test (10 connections, 10s, all public endpoints)
npm run load-test

# Advanced test (50 connections, 30s, includes login + protected endpoints + ramp-up)
npx ts-node load-test-advanced.ts

# Stress test / ramp up (finds the breaking point)
npx ts-node stress-test.ts ramp

# Concurrent test (hits all endpoints at the same time)
npx ts-node stress-test.ts concurrent
```

### 🟢 English — Change the target server

```powershell
$env:TARGET_URL="http://203.0.113.10:3002"
$env:CONNS="100"          # connections
$env:DURATION="30"        # seconds
npx ts-node load-test-advanced.ts
```

---

## Part 4 — شرح الاختبارات الأربعة بالتفصيل / The 4 test types, explained

### 1️⃣ الاختبار الأساسي / Basic test (`load-test.ts`)

**EN:** Simple, quick baseline. 10 users for 10 seconds on each public endpoint. Good first check.
**AR:** اختبار سريع بسيط. يحاكي 10 مستخدمين لمدة 10 ثوانٍ لكل نقطة عامة. مناسب للفحص الأولي.

### 2️⃣ الاختبار المتقدم / Advanced test (`load-test-advanced.ts`)

**EN:** Uses 50 users for 30 seconds. Also **logs in** as a real user and tests `users/me` and `cart`
(needs a JWT token), plus a **ramp-up** from 10→200 connections. More realistic.
**AR:** 50 مستخدم لمدة 30 ثانية. يقوم بتسجيل دخول حقيقي واختبار النقاط المحمية (تتطلب توكن)،
بالإضافة إلى زيادة متدرجة من 10 إلى 200 اتصال. أقرب للواقع.

### 3️⃣ اختبار نقطة الانهيار / Breaking-point test (`stress-test.ts ramp`)

**EN:** Slowly raises connections (10→500) until the server starts returning **errors** or latency
explodes. This tells you the **maximum users** your server can really handle.
**AR:** يزيد عدد الاتصالات تدريجياً (10 إلى 500) حتى يبدأ الخادم بإرجاع أخطاء أو يتباطأ بشدة.
يخبرك بالحد الأقصى الحقيقي للمستخدمين.

### 4️⃣ الاختبار المتزامن / Concurrent test (`stress-test.ts concurrent`)

**EN:** Hits **all endpoints at the same time** with 50 users each — simulates a real busy website
where people do different things at once. Shows how endpoints compete for resources.
**AR:** يصيب جميع النقاط في نفس الوقت بـ50 مستخدم — يحاكي موقعاً مزدحماً حقيقياً حيث يقوم الناس
بأمور مختلفة معاً. يظهر التنافس على الموارد.

---

## Part 5 — كيف تقرأ النتائج / How to read the results

### 🟢 English — A healthy result looks like:

```
GET /health   |  5,000 req/s  |  avg 8ms  |  p99 16ms  |  errors 0
```

- High `req/s` ✅
- Low `avg` and `p99` latency ✅
- **Zero** errors ✅

### 🟢 English — A warning sign looks like:

```
GET /products  |  160 req/s  |  avg 312ms  |  p99 445ms
```

- Low `req/s` but latency keeps rising as you add users
- High latency (300ms+ on a real site feels sluggish to users)

### 🟢 English — A failure looks like:

```
GET /products  |  166 req/s  |  avg 1867ms  |  p99 4703ms  |  errors 48
```

- **errors > 0** → the server is overwhelmed; users would see failures.

---

## Part 6 — الفرق بين الاختبار المحلي والاختبار على VPS / Local vs VPS testing

### 🟢 English — The BIG difference

Testing on **your laptop** and testing on a **VPS (cloud server)** give DIFFERENT results because
of **where the test and the app run**, and **the network in between**. Here's why:

| Factor | On YOUR device (localhost) | On a VPS (cloud) |
|--------|----------------------------|------------------|
| **Network travel** | Test and server on the same machine — near-zero network delay | Test → internet → server. Real network latency + bottleneck |
| **Which machine's CPU** | The SAME machine both runs the test AND runs the app → they compete for CPU | If test and app on different VPS, they don't compete. If same VPS, they do |
| **Internet bandwidth** | Ignored (loopback) | Real upload/download limits apply |
| **Firewall / limits** | Usually none | VPS / hosting may throttle or limit connections |
| **Database** | Local PostgreSQL (fast, same disk) | Remote DB = network round-trip on EVERY query |
| **Result meaning** | Shows the app's *raw* capability | Shows the *real-world* capability users experience |

### 🟢 English — Concrete example of why numbers differ

In our local test, `/health` got **~5,400 req/s** because the test, the app, and the database all
live on your fast local machine with no network delay.

If you run the **same test** against the **same app** hosted on a VPS:
- The test travels over the internet (real delay).
- The server's CPU is shared with everything else on that VPS (other websites, databases, OS).
- The database might run on another machine.
- Result: likely **much lower** req/s and **higher** latency — even though it's literally the same code.

### 🟢 English — Should you test locally or on the VPS?

| Goal | Where to test |
|------|---------------|
| Find bugs / break the code quickly | **Local** (fast, free, no network noise) |
| Find the app's max raw speed | **Local** |
| Find what REAL users will experience | **VPS**, and install autocannon on a **separate** machine |
| Compare before/after an optimization | **Always the same place** — never mix local vs VPS numbers |

### 🟢 English — Important rule (do not skip)

> **Never compare a local test number to a VPS test number.** Always compare **local-to-local**
> and **VPS-to-VPS**, or the comparison is meaningless.

### 🟢 English — How to test a VPS with autocannon

If the app is hosted on a VPS, you have two good options:

**Option A — Test from your local machine (easiest):**
```powershell
$env:TARGET_URL="http://YOUR_VPS_IP:3002"
npx ts-node load-test.ts
```
This measures the TRUE user experience (test travels over the internet). But your own internet
connection can become the bottleneck.

**Option B — Test from inside the VPS (fastest, most accurate):**
```bash
# SSH into your VPS, install the project deps there, then:
npm install --save-dev autocannon
npx ts-node load-test.ts
```
Run it against `http://localhost:3002` on the VPS itself. This removes internet noise so you see
the VPS's raw capability.

---

## Part 7 — الخطوات العملية لاختبارك على الجهاز / Practical checklist

### 🟢 English — Step by step to do it yourself

1. ✅ Install Node.js, Docker Desktop.
2. ✅ Open Docker Desktop, wait for it to be "running".
3. ✅ In project folder: `docker-compose up -d` (starts PostgreSQL).
4. ✅ Start API: `npm run dev` (keep the terminal open).
5. ✅ In a NEW terminal, run: `npm run load-test`.
6. ✅ Read the summary — check `req/s`, `avg latency`, and `errors`.
7. ✅ To test *your own VPS*: set `TARGET_URL` to your VPS address, run the same command.

### 🟢 English — Which test should you run when?

- **Quick sanity check** → `npm run load-test`
- **Realistic daily check** → `npx ts-node load-test-advanced.ts`
- **Worried about max users** → `npx ts-node stress-test.ts ramp`
- **Site gets heavy rush periods** (sales) → `npx ts-node stress-test.ts concurrent`

---

## Part 8 — ملخص سريع / Quick Summary (Arabic)

### 📌 ما هو اختبار الضغط؟
محاكاة عدد كبير من المستخدمين على موقعك في نفس الوقت لقياس السرعة والقدرة ونقطة الفشل.

### 📌 ما هي الأدوات؟
**autocannon** — أداة مجانية وخفيفة تولّد طلبات HTTP على خادمك وتقيس النتائج.

### 📌 ماذا كانت النتائج على جهازك؟
- الخادم نفسه **سريع جداً** (~6000-8000 طلب/ثانية) ولا يظهر عليه أي فشل.
- نقاط **القراءة من قاعدة البيانات** (`/products`, `/categories`) هي **الحد الحقيقي** (~100-190 طلب/ثانية).
- سبب البطء: لا يوجد **تقسيم صفحات (pagination)**، فيتم جلب كل المنتجات مع كل المتغيرات في كل طلب.

### 📌 ما الفرق بين الجهاز المحلي و VPS؟
| | محلي (جهازك) | VPS (سحابة) |
|---|---|---|
| سرعة الشبكة | شبه صفرية (داخل نفس الجهاز) | حقيقية عبر الإنترنت |
| مشاركة المعالج | الاختبار والموقع يتنافسان على نفس المعالج | يعتمد على الإعداد |
| النتيجة تعكس | القدرة الخام للتطبيق | التجربة الحقيقية للمستخدم النهائي |

### 📌 قاعدة ذهبية
> لا تقارن نتيجة جهازك المحلي بنتيجة الـ VPS أبداً. قارن محلي مع محلي، وسحابة مع سحابة.

---

## Appendix — Files used for testing

| File | Purpose |
|------|---------|
| `load-test.ts` | Basic test — 10 users, 10s, public endpoints |
| `load-test-advanced.ts` | 50 users, 30s, + login/protected endpoints + ramp-up |
| `stress-test.ts` | Breaking-point test (`ramp`) + concurrent test (`concurrent`) |
| `load-test-results.json` | JSON results from the advanced test |
| `stress-test-results.json` | JSON results from the stress test |

## Latest results from your machine

```
ENDPOINT                        REQ/S   AVG LATENCY   P99 LATENCY    ERRORS
GET /                            5591         8.4ms        20.0ms         0
GET /health                      5637         8.4ms        16.0ms         0
GET /products                     160       311.9ms       445.0ms         0
GET /categories                   185       269.1ms       390.0ms         0
GET /auth/status                 5986         7.8ms        16.0ms         0
GET /users/me                     360       138.1ms       236.0ms         0
GET /cart                         180       276.3ms       422.0ms         0
GET /orders/test                 5618         8.4ms        19.0ms         0
```
