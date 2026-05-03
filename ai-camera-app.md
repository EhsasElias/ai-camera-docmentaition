# توثيق `ai-camera-app` (عربي)

## 1) نظرة عامة

`ai-camera-app` هو تطبيق Expo/React Native مخصص للموظف، ويتكامل مع API الموظف في `ai-camera-backend-fresh`.

الوظائف الأساسية:

- تسجيل الدخول واستعادة كلمة المرور بالـ OTP.
- عرض حالة الحضور اليومية والشهرية.
- عرض الإشعارات وتمييزها كمقروءة.
- عرض المخالفات وتفاصيلها وتقديم الاعتراض.
- دعم لغتين (العربية/الإنجليزية) مع RTL.

التقنيات الأساسية:

- Expo SDK 54
- React Native 0.81
- Expo Router
- React Query
- i18next
- AsyncStorage

---

## 2) بنية المشروع المهمة

- `src/app`
  - تعريف المسارات (Expo Router).
- `src/features`
  - شاشات ووحدات كل نطاق وظيفي (`auth`, `attendance`, `violations`, ...).
- `src/shared`
  - طبقة مشتركة: `api`, `auth`, `attendance`, `notifications`, `violations`, `i18n`, `query`.
- `src/components`
  - مكونات واجهة عامة.

---

## 3) خريطة التنقل (Routing)

## مسار البداية

- `src/app/index.tsx` يعيد التوجيه إلى `/onboarding`.

## Onboarding

- `/onboarding`
  - اختيار اللغة.
  - حفظ اللغة في `AsyncStorage` تحت المفتاح `user.language`.
  - إذا يوجد جلسة صالحة: تحويل إلى `/(tabs)`.
  - إن لم توجد جلسة: تحويل إلى `/auth`.

## Auth

- `/auth`
- `/auth/forgot-password`
- `/auth/otp-verification`
- `/auth/reset-password`
- `/auth/account-suspended`
- `/auth/session-expired`

## Tabs

- `/(tabs)/home`
- `/(tabs)/history`
- `/(tabs)/violations`
- `/(tabs)/alerts`
- `/(tabs)/profile`

## وحدات إضافية

- `attendance/*` مثل:
  - `/attendance/final-records`
  - `/attendance/raw-events`
  - `/attendance/adjustment`
  - صفحات الحالات الاستثنائية (`offline`, `gps-spoof`, `outside-geofence`)
- `identity/*` (تدفق الهوية والبصمة الوجهية)
- `violation-details/[id]` تفاصيل مخالفة ديناميكية.

---

## 4) إعداد البيئة والتشغيل

## المتطلبات

- Node.js
- npm
- Expo CLI عبر `npx expo`

## التشغيل

```bash
cd ai-camera-app
npm install
npx expo start
```

أوامر مفيدة:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

---

## 5) متغيرات البيئة المعتمدة فعليًا

## متغيرات API

- `EXPO_PUBLIC_API_BASE_URL`
  - إن لم تُضبط، يستخدم التطبيق القيمة الافتراضية:
  - `https://ai-camera-tenant.b-it.dev/api`

## متغيرات إحداثيات الحضور

- `EXPO_PUBLIC_ATTENDANCE_LATITUDE`
- `EXPO_PUBLIC_ATTENDANCE_LONGITUDE`

في حال عدم ضبطهما، يستخدم التطبيق قيم fallback:

- latitude: `24.7136`
- longitude: `46.6753`

---

## 6) طبقة API في التطبيق

## عميل الطلبات (`src/shared/api/client.ts`)

- يرسل `Accept: application/json` و`X-Requested-With: XMLHttpRequest`.
- يدعم JSON و`FormData`.
- عند `auth: true` يضيف `Authorization: Bearer <token>`.
- إذا جاء `401` في طلب محمي، يتم مسح الجلسة تلقائيًا.

## صيغة الاستجابة المتوقعة

```ts
type ApiEnvelope<T> = {
  message: string;
  status: number;
  data: T;
}
```

---

## 7) المصادقة والجلسة

## تخزين الجلسة

- الملف: `src/shared/auth/session.ts`
- المفتاح: `auth.session`
- الصيغة: `token`, `issuedAt`, `expiresAt`
- مدة افتراضية: 24 ساعة.

## سلوك الجلسة

- `useLoginMutation`:
  - ينفذ `/employee/auth/login`
  - يخزن `access_token`
  - يحدّث كاش بيانات المستخدم.
- `useLogoutMutation`:
  - ينفذ `/employee/auth/logout`
  - يمسح الجلسة والكاش.

## APIs المصادقة المستخدمة

- `POST /employee/auth/login`
- `POST /employee/auth/forgot-password`
- `POST /employee/auth/verify-otp`
- `POST /employee/auth/reset-password`
- `POST /employee/auth/logout`
- `GET /employee/me`

---

## 8) الحضور (Attendance)

## Hooks وخدمات

- `useTodayAttendanceQuery` -> `GET /employee/attendance/today`
- `useAttendanceRangeQuery` -> `GET /employee/attendance?from=...&to=...`
- `useSubmitAttendanceMutation` -> `POST /employee/attendance`

## السلوك داخل شاشة Home

- زر واحد يتبدل بين `Check In` و`Check Out`.
- عند أخطاء معينة من الخادم:
  - `status=0` -> شاشة Offline.
  - `401` -> Session Expired.
  - رسائل spoof/geofence -> شاشات متخصصة.
- بعد submit ناجح يتم تحديث React Query cache.

---

## 9) الإشعارات (Notifications)

## API المستخدمة

- `GET /employee/notifications`
- `GET /employee/notifications/unread-count`
- `PATCH /employee/notifications/{id}/read`
- `POST /employee/notifications/mark-all-read`

## سلوك الواجهة

- Optimistic updates عند mark single/all read.
- مزامنة العدّاد أعلى شريط التبويبات (`alerts` badge).

---

## 10) المخالفات (Violations)

## API المستخدمة

- `GET /employee/violations`
- `GET /employee/violations/summary`
- `GET /employee/violations/{id}`
- `POST /employee/violations/{id}/appeals`

## سلوك الواجهة

- شاشة القائمة تقرأ summary + list.
- شاشة التفاصيل تعتمد route dynamic: `/violation-details/[id]`.
- إرسال الاعتراض يتم عبر `FormData` عند وجود مرفقات.

ملاحظة:

- يوجد معالجة UI لرسالة route غير متوفرة لإظهار أن endpoint غير مفعّل على الخادم الحالي.

---

## 11) React Query strategy

الإعدادات الافتراضية:

- `staleTime`: 5 دقائق
- `gcTime`: 30 دقيقة
- `retry` للـ queries: مرة واحدة
- `retry` للـ mutations: غير مفعل

مفاتيح الاستعلام منظمة في `src/shared/query/keys.ts` حسب النطاق:

- `auth`
- `attendance`
- `notifications`
- `violations`

---

## 12) الترجمة والـ RTL

- ملفات النصوص:
  - `src/shared/i18n/messages/ar.json`
  - `src/shared/i18n/messages/en.json`
- الإعداد:
  - `src/shared/i18n/localization.ts`
- يدعم:
  - كشف لغة الجهاز.
  - fallback إلى الإنجليزية.
  - ضبط اتجاه الواجهة RTL عند العربية.

---

## 13) التكامل مع backend (Checklist)

قبل الاختبار النهائي، تأكد من التالي:

1. `EXPO_PUBLIC_API_BASE_URL` يشير إلى tenant domain الصحيح (مثال: `https://tenant-domain/api`).
2. تسجيل دخول موظف فعلي يعمل عبر `/employee/auth/login`.
3. endpoint `attendance today` يعمل ويعيد envelope صحيح.
4. endpoints الإشعارات والمخالفات مفعلة على نفس domain.
5. التوكن المرسل من التطبيق مقبول في Sanctum.

---

## 14) أعطال شائعة وحلولها

- التطبيق دائمًا يعيدك إلى تسجيل الدخول:
  - تحقق من صلاحية التوكن أو قيمة `EXPO_PUBLIC_API_BASE_URL`.
- أخطاء `Unable to connect to the server`:
  - تحقق من الشبكة وشهادة HTTPS والدومين.
- صفحة المخالفات فارغة أو رسالة route:
  - endpoint غير متاح على الخادم أو tenant domain غير صحيح.
- مشاكل الوقت في الحضور:
  - راجع timezone في backend (`EMPLOYEE_API_ATTENDANCE_TIMEZONE`).

