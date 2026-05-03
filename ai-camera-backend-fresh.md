# توثيق `ai-camera-backend-fresh` (عربي)

## 1) نظرة عامة

`ai-camera-backend-fresh` هو نظام Laravel متعدد الطبقات يدير:

- منصة مركزية (`Central`) لإدارة المستأجرين والباقات والعمال (`Recorder` و`Inference Worker`).
- واجهة مستأجر (`Tenant Dashboard`) لإدارة الموظفين، الكاميرات، المخالفات، التقارير، والدعم.
- API للموبايل (`/api/employee/*`) خاص بموظفي المؤسسة.
- API لأجهزة التسجيل (`/api/recorder/*`) وعمّال الاستدلال (`/api/inference/*`).

التقنيات الأساسية:

- PHP `^8.4`
- Laravel `^12`
- Sanctum
- Fortify
- Stancl Tenancy
- Spatie Permission + Activity Log
- Inertia + Vue 3 + Vite (لوحة الويب)

---

## 2) المعمارية المختصرة

```text
Mobile App (Expo) ----> Tenant API (/api/employee/*) ----> Tenant DB
                             |
                             +--> Attendance / Violations / Notifications

Recorder Worker --------> Central API (/api/recorder/*)
                             |
                             +--> Segment metadata + storage config

Inference Worker -------> Central API (/api/inference/*)
                             |
                             +--> Job assignment / model registry / ingest
                             +--> Tenant data (biometrics, face profiles)

Tenant Dashboard (Web) -> Tenant routes (/dashboard/*) -> Tenant DB
Super Admin Dashboard -> Super routes (/super/*) -> Central DB
```

---

## 3) البنية المهمة داخل المشروع

- `app/Http/Controllers`
  - `Tenant/Api/*`: API الموظف.
  - `Api/RecorderController.php`: API أجهزة التسجيل.
  - `Api/InferenceWorkerController.php`: API عمّال الاستدلال.
  - `Tenant/*` و`Super/*`: لوحات الإدارة.
- `app/Services`
  - `Attendance/*`, `Inference/*`, `Recorder/*`, `Violations/*`, `Reports/*`.
- `routes`
  - `api.php`: API الموظف + Recorder + Inference Worker.
  - `tenant.php`: واجهة المستأجر.
  - `super.php`: واجهة السوبر أدمن.
  - `web.php`: مسارات عامة + تثبيت recorder.
- `database/migrations`
  - `database/migrations` للجداول المركزية.
  - `database/migrations/tenant` لجداول كل مستأجر.
- `workers`
  - `workers/recorder`: عامل التسجيل (CLI مستقل).
  - `workers/inference`: عامل الاستدلال (CLI + Python runtime).

---

## 4) التشغيل المحلي السريع

## المتطلبات

- PHP 8.4+
- Composer
- Node.js + npm
- قاعدة بيانات (SQLite/MySQL/PostgreSQL حسب البيئة)

## خطوات التشغيل

```bash
cd ai-camera-backend-fresh
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run dev
php artisan serve
```

أوامر مفيدة أثناء التطوير:

```bash
php artisan test --compact
composer test
composer dev
```

`composer dev` يشغّل: `serve` + `queue:listen` + `pail` + `vite`.

---

## 5) إعدادات البيئة الأهم

## إعدادات عامة

- `APP_URL`
- `APP_DOMAIN` (مفيد مع Tenancy domains)
- `DB_*`
- `QUEUE_CONNECTION`

## إعدادات API الموظف

- `EMPLOYEE_API_OTP_DIGITS`
- `EMPLOYEE_API_OTP_EXPIRES_MINUTES`
- `EMPLOYEE_API_RESET_TOKEN_EXPIRES_MINUTES`
- `EMPLOYEE_API_LOGIN_RATE_LIMIT_PER_MINUTE`
- `EMPLOYEE_API_ATTENDANCE_SUBMIT_RATE_LIMIT_PER_MINUTE`
- `EMPLOYEE_API_ATTENDANCE_TIMEZONE`

ملاحظات:

- في غير `production`، OTP يمكن أن يقبل قيمة تطويرية (`1234`) وفق منطق الكنترولر.
- سجل الحضور يدعم idempotency window لتفادي التكرار السريع.

## إعدادات Recorder API

- `RECORDING_API_ABILITY`
- `RECORDING_STORAGE_DISK`
- `RECORDING_DEFAULT_SEGMENT_SECONDS`
- `RECORDING_DEFAULT_RETENTION_DAYS`
- `RECORDING_FFMPEG_BINARY`
- `RECORDING_FFPROBE_BINARY`

## إعدادات Inference Worker API

- `INFERENCE_WORKER_API_ABILITY`
- `INFERENCE_WORKER_POLL_INTERVAL_SECONDS`
- `INFERENCE_WORKER_HEARTBEAT_INTERVAL_SECONDS`
- `INFERENCE_WORKER_MAX_CLAIM_JOBS`

---

## 6) المصادقة والصلاحيات

## داخل لوحة الويب

- حراس المصادقة الأساسية: `web` (جلسات).
- الصلاحيات بالأدوار عبر Spatie.
- `super` routes تتطلب middleware: `auth`, `verified`, `super-admin`.

## API الموظف

- يستخدم Sanctum Bearer token صادر من `Employee`.
- نقاط `auth` المفتوحة:
  - `POST /employee/auth/login`
  - `POST /employee/auth/forgot-password`
  - `POST /employee/auth/verify-otp`
  - `POST /employee/auth/reset-password`

## API الـ Recorder وInference Worker

- تستخدم Sanctum tokens لكن على موديلات مركزية مخصصة:
  - `RecorderClient`
  - `InferenceWorkerClient`
- middleware إضافي يتحقق من:
  - نوع العميل الصحيح.
  - حالة العميل/العامل `is_active`.
  - صلاحية token ability (`recorder:access` أو `inference-worker:access` افتراضيًا).

---

## 7) Tenancy باختصار

- التعرف على المستأجر عبر الدومين (`InitializeTenancyByDomain`).
- منع الوصول من الدومينات المركزية لمسارات المستأجر (`PreventAccessFromCentralDomains`).
- فصل قواعد البيانات والملفات والكاش لكل tenant.
- يوجد Bootstrappers لـ:
  - Database
  - Cache
  - Filesystem
  - Queue
  - Redis

---

## 8) مرجع API عملي (مختصر وواضح)

## API الموظف (`/api/employee/*`)

- `POST /employee/auth/login`
  - body: `employee_code`, `password`, `device_name?`
- `POST /employee/auth/forgot-password`
  - body: `identifier`
- `POST /employee/auth/verify-otp`
  - body: `identifier`, `otp`
- `POST /employee/auth/reset-password`
  - body: `reset_token`, `new_password`, `confirm_password`
- `POST /employee/auth/logout` (auth)
- `GET /employee/me` (auth)
- `POST /employee/biometrics/faces` (auth)
  - multipart: `image` (`jpg/jpeg`)
- `GET /employee/attendance` (auth)
  - filters: `from`, `to`, `include_absent`, `status`
- `POST /employee/attendance` (auth)
  - body: `action` (`check_in|check_out`), `latitude`, `longitude`
- `GET /employee/attendance/today` (auth)
- `GET /employee/notifications` (auth)
- `GET /employee/notifications/unread-count` (auth)
- `PATCH /employee/notifications/{notification}/read` (auth)
- `POST /employee/notifications/mark-all-read` (auth)
- `GET /employee/violations` (auth)
- `GET /employee/violations/summary` (auth)
- `GET /employee/violations/{violation}` (auth)
- `GET /employee/violations/{violation}/preview` (auth)
- `POST /employee/violations/{violation}/appeals` (auth)

## API الـ Recorder (`/api/recorder/*`)

- `GET /recorder/bootstrap`
- `POST /recorder/heartbeat`
- `GET /recorder/update`
- `GET /recorder/update/release`
- `POST /recorder/segments/pending`
- `POST /recorder/segments/complete`
- `POST /recorder/segments/failed`
- `POST /recorder/segments`
- `POST /recorder/cameras/{tenant}/{cameraId}/runtime`

## API الـ Inference Worker (`/api/inference/*`)

- `GET /inference/bootstrap`
- `POST /inference/heartbeat`
- `GET /inference/assignments`
- `GET /inference/model-registry`
- `POST /inference/jobs/claim`
- `POST /inference/jobs/{id}/complete`
- `POST /inference/jobs/{id}/fail`
- `POST /inference/jobs/{id}/release`
- `GET /inference/employee-biometrics`
- `GET /inference/employee-biometrics/{tenantId}/{id}`
- `GET /inference/employee-biometrics/{tenantId}/{id}/download`
- `GET /inference/employee-face-profiles`
- `GET /inference/employee-face-profiles/{tenantId}/{id}`
- `GET /inference/employee-face-profiles/{tenantId}/{id}/download`
- `POST /inference/employee-face-profiles`
- `POST /inference/raw-events`
- `POST /inference/attendance-events`
- `POST /inference/violations`
- `GET /inference/update`
- `GET /inference/update/release`

## صيغة الاستجابة العامة

معظم API يرجع Envelope بالشكل:

```json
{
  "message": "Success",
  "status": 200,
  "data": {}
}
```

وعند pagination يضاف كائن `pagination`.

---

## 9) أوامر Artisan المهمة للإدارة

## توكنات

```bash
php artisan inference:issue-token {tenant_id} {client_name} --rotate
php artisan inference-worker:issue-token {worker_name} {client_name} --rotate
php artisan recorder:issue-token {node_name} "{client_name}" --rotate
```

## Inference orchestration

```bash
php artisan inference:compile-zone-assignments --tenant={tenant_id}
php artisan inference:rebuild-segment-jobs --tenant={tenant_id}
```

## Recorder bundling

```bash
php artisan recorder:bundle-node-config {node}
```

## مهام دورية

- `attendance:finalize-open-days` كل ساعة.
- `recordings:cleanup-conversions` يوميًا.

---

## 10) تشغيل العمّال الخارجية (Workers)

## Recorder Worker

```bash
cd workers/recorder
composer install
php bin/recorder-worker doctor --env-file=/path/to/recorder.env
php bin/recorder-worker run --env-file=/path/to/recorder.env
```

أهم متغيرات env:

- `RECORDER_API_BASE_URL`
- `RECORDER_API_TOKEN`
- `RECORDER_FFMPEG_BINARY`
- `RECORDER_FFPROBE_BINARY`
- `RECORDER_SPOOL_ROOT`

## Inference Worker

```bash
cd workers/inference
composer install
php bin/inference-worker python:prepare --env-file=/path/to/inference.env
php bin/inference-worker status --env-file=/path/to/inference.env
php bin/inference-worker run --env-file=/path/to/inference.env
```

أهم متغيرات env:

- `INFERENCE_API_BASE_URL`
- `INFERENCE_API_TOKEN`
- `INFERENCE_PYTHON_BIN`
- `INFERENCE_PYTHON_ENTRYPOINT`

متطلبات Python الحالية:

- `numpy`
- `opencv-python-headless`
- `insightface`
- `onnxruntime-gpu`

---

## 11) تكامل backend مع `ai-camera-app`

لنجاح التطبيق الموبايل مع هذا الـ backend:

1. اجعل `EXPO_PUBLIC_API_BASE_URL` يشير إلى دومين tenant وليس الدومين المركزي.
2. تأكد أن tenant domain يمر على middleware الخاصة بالـ tenancy.
3. فعّل endpoints التالية على tenant domain:
   - `/api/employee/auth/*`
   - `/api/employee/attendance/*`
   - `/api/employee/notifications/*`
   - `/api/employee/violations/*`
4. استخدم Bearer token من `login` في كل طلب `auth`.

---

## 12) أعطال شائعة

- `401` في تطبيق الموبايل:
  - التوكن غير موجود/منتهي/غير صالح.
- `404 route api/employee/violations`:
  - التطبيق يشير لسيرفر لا يحتوي مسارات المخالفات أو ليس دومين tenant الصحيح.
- مشاكل attendance submit:
  - راجع `action`, `latitude`, `longitude` وقيم rate limit.
- مشاكل workers:
  - token ability غير مطابق أو client غير active.
  - عدم توفر artifact في `/update/release`.

