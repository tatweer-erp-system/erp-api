# modules/ — Business Modules Reference

All modules use raw `sequelize.query()` against the tenant schema. No Sequelize models are auto-loaded per tenant — only the public schema models (Tenant, SuperAdmin, Plan, Subscription, PaymentTransaction) go through SequelizeModule.

---

## subscriptions/ ← NEW (Global module)

SaaS subscription + payment system. Plans stored in DB (manageable via API). Payment via Moyasar, provider-agnostic architecture.

**Plan → Module access map (seeded in migration):**

| Plan | Modules |
|---|---|
| `starter` | users, roles, hr, notifications |
| `professional` | + crm, inventory, purchasing, projects |
| `enterprise` | + chat, reporting |

**Access control:** `@ModuleFeature('crm')` on controller → `SubscriptionGuard` checks tenant's plan modules → `ForbiddenException` if not included. Cache key: `sub:modules:{tenantSlug}` TTL 5 min.

| File | Purpose |
|---|---|
| `subscriptions.module.ts` | `@Global()` — exports PlansService, PaymentService, SubscriptionsService, SubscriptionGuard |
| `entities/plan.entity.ts` | `public.plans` — slug, name (JSONB), monthlyPrice, annualPrice, currency, modules (JSONB array), maxUsers, features (JSONB), isActive, sortOrder |
| `entities/subscription.entity.ts` | `public.subscriptions` — tenantId (unique), planId, status (trial/active/past_due/cancelled/expired), billingCycle, trialEndsAt, currentPeriodStart, currentPeriodEnd |
| `entities/payment-transaction.entity.ts` | `public.payment_transactions` — subscriptionId, tenantId, amount, currency, status (pending/paid/failed/refunded), provider, providerTransactionId, providerResponse (JSONB) |
| `providers/payment-provider.interface.ts` | `IPaymentProvider` interface: `createPayment`, `verifyPayment`, `refund` — implement to add new provider |
| `providers/moyasar.provider.ts` | Moyasar REST API via axios — Basic Auth with secret key. Maps Moyasar statuses to internal statuses |
| `payment.service.ts` | Provider factory — reads `PAYMENT_PROVIDER` env, instantiates correct provider. Change `PAYMENT_PROVIDER=stripe` to switch. |
| `plans.service.ts` | CRUD for plans — `findAll`, `findAllActive`, `findOne`, `findBySlug`, `create`, `update`, `remove` |
| `plans.controller.ts` | `GET /plans/public` (no auth), `GET/POST/PATCH/DELETE /plans` (superadmin+IP) |
| `subscriptions.service.ts` | `createTrial(tenantId)`, `getSubscriptionModules(slug, tenantId)` (cached), `initiatePayment` → Moyasar → pending tx, `handlePaymentCallback` → verify → activate, `upgrade`, `cancel`, `adminActivate` |
| `subscriptions.controller.ts` | `GET /subscriptions/me`, `POST /subscriptions/pay`, `GET /subscriptions/payment/callback` (public, Moyasar redirect), `PATCH /subscriptions/upgrade`, `DELETE /subscriptions/cancel`, `GET /subscriptions/transactions`, `POST /subscriptions/admin/activate` |
| `dto/create-plan.dto.ts` | slug, name (LocalizedString), monthlyPrice, annualPrice, modules[], maxUsers, features, sortOrder |
| `dto/create-subscription.dto.ts` | InitiatePaymentDto (planSlug, billingCycle, frontendRedirectUrl?), UpgradeSubscriptionDto |

**Payment flow:**
1. Frontend calls `POST /subscriptions/pay` → gets `{ paymentUrl, transactionId }` → redirects user
2. User completes payment on Moyasar hosted page
3. Moyasar redirects to `GET /subscriptions/payment/callback?id=xxx`
4. Backend verifies with Moyasar API → activates subscription → redirects to `frontendRedirectUrl?success=true`

**Adding a new payment provider:**
1. Implement `IPaymentProvider` in `providers/your-provider.ts`
2. Register it in `PaymentService.onModuleInit()`
3. Set `PAYMENT_PROVIDER=your-provider` in `.env`

---

## auth/

JWT authentication with Passport.

| File | Purpose |
|---|---|
| `auth.module.ts` | PassportModule, JwtModule (access + refresh strategies), exports AuthService |
| `auth.controller.ts` | `POST /:tenantSlug/login`, `POST /refresh`, `POST /logout` |
| `auth.service.ts` | `login()` — bcrypt compare, generates token pair; `refreshTokens()`; `logout()` |
| `token-cache.service.ts` | Stores refresh tokens in Redis key `refresh:{userId}` TTL 7d |
| `strategies/jwt.strategy.ts` | ExtractJwt from Bearer header, validates payload against Redis |
| `strategies/refresh.strategy.ts` | ExtractJwt from request body field `refreshToken` |
| `dto/login.dto.ts` | `email`, `password` |
| `dto/register.dto.ts` | `email`, `password`, `firstName`, `lastName` |
| `dto/refresh-token.dto.ts` | `refreshToken` |

---

## tenants/

Tenant management + full provisioning (superadmin only).

| File | Purpose |
|---|---|
| `tenants.module.ts` | |
| `tenants.controller.ts` | CRUD — protected by `JwtAuthGuard` + `SuperAdminIpGuard` |
| `tenants.service.ts` | `findAll`, `findBySlug`, `findById`, `deactivate` — queries `public.tenants` |
| `tenant-provisioner.service.ts` | Full provisioning: insert `public.tenants` → create schema `tenant_{slug}` → run Umzug migrations → seed 50 permissions (10 modules × 5 actions) → create admin user (bcrypt hash) |
| `entities/tenant.entity.ts` | Sequelize model for `public.tenants` |
| `dto/create-tenant.dto.ts` | `name`, `slug` (regex validated: `^[a-z0-9-]+$`), `adminEmail`, `adminPassword`, `adminFirstName`, `adminLastName`, `plan` |

Seeded modules: `users`, `roles`, `hr`, `inventory`, `crm`, `purchasing`, `projects`, `reporting`, `notifications`, `chat`.
Seeded actions per module: `create`, `read`, `update`, `delete`, `export`.

---

## users/

User CRUD + FCM device token management.

| File | Purpose |
|---|---|
| `users.module.ts` | |
| `users.controller.ts` | CRUD + `POST /:id/fcm-tokens` |
| `users.service.ts` | `findAll` (search/pagination), `findOne`, `create` (bcrypt hash), `update`, `remove` (soft), `registerFcmToken` |
| `entities/user.entity.ts` | Sequelize model for `users` |
| `entities/user-fcm-token.entity.ts` | Sequelize model for `user_fcm_tokens` |
| `dto/create-user.dto.ts` | `email`, `password`, `firstName`, `lastName`, `phone?`, `avatarUrl?` |
| `dto/update-user.dto.ts` | Partial of create-user (PartialType) |

---

## roles/

RBAC: roles, permissions, user-role assignment.

| File | Purpose |
|---|---|
| `roles.module.ts` | |
| `roles.controller.ts` | Role CRUD + permission assignment + user-role assignment |
| `roles.service.ts` | `assignPermissions` (delete + reinsert), `assignRoleToUser`, `removeRoleFromUser` (invalidates permission cache) |
| `permissions.service.ts` | `findAll`, `findByModule`, raw SQL queries on `permissions` table |
| `permission-cache.service.ts` | `getPermissions(slug, userId)` → Redis → DB fallback; `invalidate(slug, userId)` |
| `entities/role.entity.ts` | `roles` table |
| `entities/permission.entity.ts` | `permissions` table — columns: `module`, `action`, `conditions` (JSONB) |
| `entities/role-permission.entity.ts` | `rolePermissions` join table |
| `entities/user-role.entity.ts` | `userRroles` join table |
| `dto/create-role.dto.ts` | `name`, `description?` |
| `dto/assign-permission.dto.ts` | `permissionIds: string[]` |

Permission string format: `module:action` (e.g., `users:create`).
Cache key: `perm:{tenantSlug}:{userId}` TTL 5 minutes.

---

## notifications/

Multi-channel notifications: push, SMS, email, in-app.

| File | Purpose |
|---|---|
| `notifications.module.ts` | Imports `QUEUE_FCM`, `QUEUE_SMS`, `QUEUE_MAIL` |
| `notifications.controller.ts` | `POST /push`, `POST /sms`, `POST /email`, `POST /in-app`, `GET /`, `PATCH /:id/read`, `PATCH /read-all` |
| `notifications.service.ts` | `sendPush()` (queues FCM job), `sendSms()` (queues SMS job), `sendEmail()` (queues mail job), `sendInApp()` (DB insert + Socket.IO emit), `findForUser()`, `markAsRead()`, `markAllAsRead()` |
| `fcm.processor.ts` | `@Process(QUEUE_FCM)` — reads `user_fcm_tokens`, calls `firebase-admin` `sendEachForMulticast` |
| `sms.processor.ts` | `@Process(QUEUE_SMS)` — Twilio `client.messages.create` |
| `entities/notification.entity.ts` | `notifications` table |
| `dto/send-notification.dto.ts` | `userId`, `title`, `body`, `type`, `data?` |

Config: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.

---

## chat/

Firebase Firestore-backed chat with WebSocket real-time layer.

| File | Purpose |
|---|---|
| `chat.module.ts` | |
| `chat.controller.ts` | `POST /conversations`, `GET /conversations`, `POST /conversations/:id/messages`, `POST /conversations/:id/messages/:msgId/reactions`, `PATCH /conversations/:id/read` |
| `chat.service.ts` | Orchestrates `FirestoreChatService` + metadata (tenant, participants) |
| `chat.gateway.ts` | WebSocket: `chat:send` event (save + broadcast), `chat:read` event (mark read) |
| `firestore-chat.service.ts` | Firestore batch writes: `createConversation`, `sendMessage` (updates lastMessage + unreadCount atomically), `addReaction`, `markRead`, `getConversations` |
| `dto/create-conversation.dto.ts` | `participantIds: string[]`, `name?` |
| `dto/send-message.dto.ts` | `content`, `type` (text/image/file), `attachmentUrl?` |
| `dto/add-reaction.dto.ts` | `emoji` |
| `dto/reply-message.dto.ts` | `content`, `replyToId` |

Firestore collection: `tenants/{tenantSlug}/conversations/{convId}/messages`.

---

## hr/

Human resources: employees, departments, leave requests.

| File | Purpose |
|---|---|
| `hr.module.ts` | Aggregates EmployeesModule, DepartmentsModule, LeavesModule |
| `employees/employees.service.ts` | CRUD with pagination/search |
| `employees/employees.controller.ts` | |
| `employees/entities/employee.entity.ts` | `employees` table — `firstName`, `lastName`, `email`, `phone`, `departmentId`, `position`, `salary`, `hireDate`, `status` |
| `employees/dto/create-employee.dto.ts` | |
| `employees/dto/update-employee.dto.ts` | PartialType |
| `departments/departments.service.ts` | CRUD |
| `departments/departments.controller.ts` | |
| `departments/entities/department.entity.ts` | `departments` table — `name` (JSONB), `managerId?` |
| `departments/dto/create-department.dto.ts` | |
| `leaves/leaves.service.ts` | `findAll`, `findOne`, `create`, `approve(id)`, `reject(id)` |
| `leaves/leaves.controller.ts` | `PATCH /:id/approve`, `PATCH /:id/reject` |
| `leaves/entities/leave-request.entity.ts` | `leave_requests` table — `employeeId`, `type`, `startDate`, `endDate`, `reason`, `status` |
| `leaves/dto/create-leave-request.dto.ts` | |

---

## inventory/

Products, warehouses, stock movements with low-stock alerting.

| File | Purpose |
|---|---|
| `inventory.module.ts` | Imports `QUEUE_INVENTORY`, aggregates sub-modules |
| `products/products.service.ts` | CRUD with category support |
| `products/products.controller.ts` | |
| `products/entities/product.entity.ts` | `products` — `name` (JSONB), `sku`, `categoryId`, `price`, `cost`, `unit`, `lowStockThreshold` |
| `products/entities/product-category.entity.ts` | `product_categories` — `name` (JSONB) |
| `products/dto/create-product.dto.ts` | |
| `products/dto/update-product.dto.ts` | PartialType |
| `warehouses/warehouses.service.ts` | CRUD |
| `warehouses/warehouses.controller.ts` | |
| `warehouses/entities/warehouse.entity.ts` | `warehouses` — `name`, `location`, `isDefault` |
| `warehouses/dto/create-warehouse.dto.ts` | |
| `stock-movements/stock-movements.service.ts` | Records movement, upserts `stock_levels` (`ON CONFLICT DO UPDATE`), triggers low-stock queue if qty < threshold |
| `stock-movements/stock-movements.controller.ts` | |
| `stock-movements/entities/stock-movement.entity.ts` | `stock_movements` — `productId`, `warehouseId`, `type` (in/out/adjustment), `quantity`, `reference` |
| `stock-movements/entities/stock-level.entity.ts` | `stock_levels` — `productId`, `warehouseId`, `quantity` (unique: productId+warehouseId) |
| `stock-movements/low-stock.processor.ts` | `@Process(QUEUE_INVENTORY)` — sends in-app + push notification for low stock |
| `stock-movements/dto/create-stock-movement.dto.ts` | |

---

## crm/

Contacts, leads, sales orders with line items.

| File | Purpose |
|---|---|
| `crm.module.ts` | |
| `contacts/contacts.service.ts` | CRUD with pagination |
| `contacts/contacts.controller.ts` | |
| `contacts/entities/contact.entity.ts` | `contacts` — `firstName`, `lastName`, `email`, `phone`, `company`, `type` (customer/supplier/prospect) |
| `contacts/dto/create-contact.dto.ts` | |
| `leads/leads.service.ts` | CRUD + status transitions |
| `leads/leads.controller.ts` | |
| `leads/entities/lead.entity.ts` | `leads` — `contactId?`, `title`, `value`, `status` (new/qualified/proposal/won/lost), `assignedTo` |
| `leads/dto/create-lead.dto.ts` | |
| `sales-orders/sales-orders.service.ts` | Creates order with line items, calculates totals |
| `sales-orders/sales-orders.controller.ts` | |
| `sales-orders/entities/sales-order.entity.ts` | `sales_orders` — `contactId`, `status`, `subtotal`, `tax`, `total`, `notes` |
| `sales-orders/entities/sales-order-line.entity.ts` | `sales_order_lines` — `orderId`, `productId`, `quantity`, `unitPrice`, `total` |
| `sales-orders/dto/create-sales-order.dto.ts` | Includes nested `lines: CreateSalesOrderLineDto[]` |

---

## purchasing/

Vendors + purchase orders with line items.

| File | Purpose |
|---|---|
| `purchasing.module.ts` | |
| `vendors/vendors.service.ts` | CRUD |
| `vendors/vendors.controller.ts` | |
| `vendors/entities/vendor.entity.ts` | `vendors` — `name`, `email`, `phone`, `address`, `taxId`, `paymentTerms` |
| `vendors/dto/create-vendor.dto.ts` | |
| `purchase-orders/purchase-orders.service.ts` | Creates PO with line items, calculates line totals + grand total |
| `purchase-orders/purchase-orders.controller.ts` | |
| `purchase-orders/entities/purchase-order.entity.ts` | `purchase_orders` — `vendorId`, `status`, `expectedDate`, `total`, `notes` |
| `purchase-orders/entities/purchase-order-line.entity.ts` | `purchase_order_lines` — `orderId`, `productId`, `quantity`, `unitPrice`, `total` |
| `purchase-orders/dto/create-purchase-order.dto.ts` | Includes nested `lines[]` |

---

## projects/

Projects (JSONB i18n name/description) with tasks and sub-tasks.

| File | Purpose |
|---|---|
| `projects.module.ts` | |
| `projects/projects.service.ts` | CRUD — `name` and `description` are `LocalizedString` JSONB |
| `projects/projects.controller.ts` | |
| `projects/entities/project.entity.ts` | `projects` — `name` (JSONB), `description` (JSONB), `status`, `startDate`, `endDate`, `ownerId`, `members` (UUID[] JSONB array) |
| `projects/dto/create-project.dto.ts` | |
| `tasks/tasks.service.ts` | CRUD, supports `parentTaskId` for sub-tasks |
| `tasks/tasks.controller.ts` | |
| `tasks/entities/task.entity.ts` | `tasks` — `projectId`, `title` (JSONB), `description` (JSONB), `status`, `priority`, `assigneeId`, `dueDate`, `parentTaskId?` |
| `tasks/dto/create-task.dto.ts` | |

---

## reporting/

Dashboard stats, HR/inventory reports, async PDF export via S3.

| File | Purpose |
|---|---|
| `reporting.module.ts` | Imports `QUEUE_REPORTS` |
| `reporting.controller.ts` | `GET /dashboard`, `GET /hr`, `GET /inventory`, `POST /export` |
| `reporting.service.ts` | `getDashboardStats()` (raw SQL aggregations), `getHrReport()`, `getInventoryReport()`, `exportReport()` (queues job, returns jobId) |
| `report-export.processor.ts` | `@Process(QUEUE_REPORTS)` — generates PDF via `PdfService`, uploads to S3, returns signed URL via job result |
