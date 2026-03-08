# infrastructure/ — File Reference

All infrastructure modules are **Global** (no need to import elsewhere).

---

## cache/

Redis-backed cache using ioredis. Host: `REDIS_CACHE_HOST:REDIS_CACHE_PORT` (default 6379).

| File | Purpose |
|---|---|
| `cache.module.ts` | Global — `CacheModule.registerAsync` with `@keyv/redis` |
| `cache.service.ts` | ioredis-based: `get`, `set`, `del`, `delPattern`, `exists`, `ttl`, helper key builders |

Key helpers in `CacheService`:
- `permissionKey(slug, userId)` → `perm:{slug}:{userId}`
- `refreshTokenKey(userId)` → `refresh:{userId}`
- `responseKey(path, query)` → `res:{path}:{hash}`

---

## queues/

BullMQ queues. Host: `REDIS_QUEUE_HOST:REDIS_QUEUE_PORT` (default 6380 — separate Redis instance).

| File | Purpose |
|---|---|
| `queue.constants.ts` | Exports: `QUEUE_MAIL`, `QUEUE_FCM`, `QUEUE_SMS`, `QUEUE_REPORTS`, `QUEUE_INVENTORY` |
| `queues.module.ts` | Global — `BullModule.forRootAsync` + registers all 5 queues |

Processors live in their respective modules:
- `QUEUE_MAIL` → `infrastructure/mail/mail.processor.ts`
- `QUEUE_FCM` → `modules/notifications/fcm.processor.ts`
- `QUEUE_SMS` → `modules/notifications/sms.processor.ts`
- `QUEUE_REPORTS` → `modules/reporting/report-export.processor.ts`
- `QUEUE_INVENTORY` → `modules/inventory/stock-movements/low-stock.processor.ts`

---

## firebase/

Firebase Admin SDK initialization (Firestore + FCM).

| File | Purpose |
|---|---|
| `firebase.module.ts` | Global — provides `FirebaseService` |
| `firebase.service.ts` | Initializes firebase-admin app, exposes `getFirestore()`, `getMessaging()`, `sendPushNotification(token, title, body, data)` |

Config: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (with `\n` replace).

---

## storage/

AWS S3 file storage.

| File | Purpose |
|---|---|
| `storage.module.ts` | Global — provides `StorageService` |
| `storage.service.ts` | `upload(key, buffer, mime)`, `getSignedUrl(key, expiresIn)`, `delete(key)`, `getPublicUrl(key)` |

Config: `STORAGE_PROVIDER`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`, `AWS_REGION`.

---

## mail/

Email sending via Nodemailer + Handlebars templates, queued through BullMQ.

| File | Purpose |
|---|---|
| `mail.module.ts` | Imports `QUEUE_MAIL`, provides `MailService` + `MailProcessor` |
| `mail.service.ts` | `sendWelcome()`, `sendInvoice()`, `sendPayslip()` — queues jobs with retry logic |
| `mail.processor.ts` | `@Process` handler: Nodemailer transporter + Handlebars template rendering |
| `templates/welcome.hbs` | Welcome email template |
| `templates/invoice.hbs` | Invoice email template |
| `templates/payslip.hbs` | Payslip email template |

Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

---

## pdf/

PDF generation via Puppeteer (Chromium).

| File | Purpose |
|---|---|
| `pdf.module.ts` | Global — provides `PdfService` |
| `pdf.service.ts` | `generateFromHtml(html, options)` → `Buffer`, `generateFromUrl(url, options)` → `Buffer`. Uses `--no-sandbox` args for Docker. |

---

## audit/

Audit log writer. Used by `AuditInterceptor`.

| File | Purpose |
|---|---|
| `audit.module.ts` | Global — provides `AuditService` (token: `'AuditService'`) |
| `audit.service.ts` | `log(entry)` — raw SQL insert into `audit_logs`; `findByTenant(slug, dto)` — paginated query |
| `entities/audit-log.entity.ts` | Sequelize model for `audit_logs` table |

`audit_logs` columns: `id`, `tenantSlug`, `userId`, `action`, `module`, `resourceId`, `before` (JSONB), `after` (JSONB), `ip`, `userAgent`, `createdAt`.

---

## websockets/

Socket.IO gateway for real-time events. JWT auth on connect, tenant-namespaced rooms.

| File | Purpose |
|---|---|
| `events.module.ts` | Global — provides + exports `EventsGateway` |
| `events.gateway.ts` | `OnGatewayConnection` / `OnGatewayDisconnect`: validates JWT on connect, joins `tenant:{slug}` room. Methods: `emitToUser(userId, event, data)`, `emitToRole(tenantSlug, role, event, data)`, `emitToGroup(room, event, data)` |

Socket.IO namespace: `/` — clients join room `tenant:{tenantSlug}` on connect.
