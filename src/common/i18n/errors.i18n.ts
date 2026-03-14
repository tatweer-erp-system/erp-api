export const ErrorMessages = {
  // ─── Orders ────────────────────────────────────────────────────────────
  ORDER_NOT_FOUND: {
    en: (id: string) => `Order "${id}" not found or does not belong to this branch`,
    ar: (id: string) => `الطلب "${id}" غير موجود أو لا ينتمي لهذا الفرع`,
  },
  ORDER_NOT_OPEN: {
    en: (status: string) => `Only open orders can be modified — current status is "${status}"`,
    ar: (status: string) => `لا يمكن تعديل الطلب — الحالة الحالية هي "${status}"`,
  },
  ORDER_NOT_PAID: {
    en: (status: string) => `Only paid orders can be refunded — current status is "${status}"`,
    ar: (status: string) =>
      `لا يمكن استرداد الطلب — الحالة الحالية "${status}"، يجب أن يكون الطلب مدفوعاً`,
  },
  ORDER_EMPTY: {
    en: () => `Cannot checkout an empty order — add at least one item first`,
    ar: () => `لا يمكن الدفع لطلب فارغ — أضف عنصراً واحداً على الأقل`,
  },
  ORDER_VERSION_CONFLICT: {
    en: () => `Record was modified by another user — please refresh and try again`,
    ar: () => `تم تعديل السجل بواسطة مستخدم آخر — يرجى التحديث والمحاولة مرة أخرى`,
  },
  ORDER_CANT_VOID: {
    en: (status: string) => `Only open orders can be voided — current status is "${status}"`,
    ar: (status: string) => `لا يمكن إلغاء الطلب — الحالة الحالية هي "${status}"`,
  },
  ORDER_CANT_HOLD: {
    en: (status: string) => `Only open orders can be held — current status is "${status}"`,
    ar: (status: string) => `لا يمكن تعليق الطلب — الحالة الحالية هي "${status}"`,
  },
  MAX_HELD_ORDERS: {
    en: (max: number) =>
      `Maximum of ${max} held orders per session reached — resume or void an existing held order`,
    ar: (max: number) =>
      `تم الوصول للحد الأقصى ${max} طلبات معلقة لكل جلسة — استأنف أو ألغِ طلباً معلقاً`,
  },
  PAYMENT_MISMATCH: {
    en: (total: number, paid: number) =>
      `Payment total (${paid}) does not match order total (${total})`,
    ar: (total: number, paid: number) =>
      `مجموع المدفوعات (${paid}) لا يتطابق مع إجمالي الطلب (${total})`,
  },
  CASH_AMOUNT_INSUFFICIENT: {
    en: () => `Cash amount given must be greater than or equal to the payment amount`,
    ar: () => `المبلغ النقدي المدفوع يجب أن يكون أكبر من أو يساوي مبلغ الطلب`,
  },

  // ─── Items ─────────────────────────────────────────────────────────────
  ITEM_ORDER_NOT_OPEN: {
    en: (action: string, status: string) =>
      `Can only ${action} items on open orders — current status is "${status}"`,
    ar: (action: string, status: string) =>
      `لا يمكن ${action} العناصر إلا على الطلبات المفتوحة — الحالة الحالية "${status}"`,
  },
  ITEM_NOT_FOUND: {
    en: (itemId: string, orderId: string) =>
      `Order item "${itemId}" not found in order "${orderId}"`,
    ar: (itemId: string, orderId: string) =>
      `عنصر الطلب "${itemId}" غير موجود في الطلب "${orderId}"`,
  },
  PRODUCT_NOT_FOUND: {
    en: (id: string) => `Product not found with ID "${id}"`,
    ar: (id: string) => `المنتج غير موجود بالمعرف "${id}"`,
  },

  // ─── Stock ─────────────────────────────────────────────────────────────
  INSUFFICIENT_STOCK: {
    en: (name: string, available: number, requested: number) =>
      `Insufficient stock for "${name}" — available: ${available}, requested: ${requested}`,
    ar: (name: string, available: number, requested: number) =>
      `مخزون غير كافٍ للمنتج "${name}" — المتاح: ${available}، المطلوب: ${requested}`,
  },
  WAREHOUSE_NOT_FOUND: {
    en: (id: string) => `Warehouse not found with ID "${id}"`,
    ar: (id: string) => `المستودع غير موجود بالمعرف "${id}"`,
  },

  // ─── Sessions ──────────────────────────────────────────────────────────
  SESSION_ALREADY_OPEN: {
    en: (id: string) =>
      `Cashier already has an open session (${id}) — close it before opening a new one`,
    ar: (id: string) => `الكاشير لديه جلسة مفتوحة بالفعل (${id}) — أغلقها قبل فتح جلسة جديدة`,
  },
  SESSION_NOT_OPEN: {
    en: () => `No open session found for the current cashier`,
    ar: () => `لا توجد جلسة مفتوحة للكاشير الحالي`,
  },
  SESSION_CLOSED: {
    en: () => `Session is not open`,
    ar: () => `الجلسة ليست مفتوحة`,
  },

  // ─── Terminals ─────────────────────────────────────────────────────────
  TERMINAL_NOT_FOUND: {
    en: (id: string) => `Terminal not found with ID "${id}"`,
    ar: (id: string) => `الطرفية غير موجودة بالمعرف "${id}"`,
  },
  TERMINAL_INACTIVE: {
    en: () => `Terminal is not active`,
    ar: () => `الطرفية غير نشطة`,
  },
  TERMINAL_VERSION_CONFLICT: {
    en: () =>
      `Version conflict: the record has been modified by another user — please refresh and try again`,
    ar: () =>
      `تعارض في الإصدار: تم تعديل السجل بواسطة مستخدم آخر — يرجى التحديث والمحاولة مرة أخرى`,
  },

  // ─── User PIN ───────────────────────────────────────────────────────────
  USER_PIN_NOT_SET: {
    en: () => `No PIN has been set for this account`,
    ar: () => `لم يتم تعيين رقم تعريف شخصي لهذا الحساب`,
  },
  USER_PIN_INCORRECT: {
    en: () => `Incorrect PIN — please try again`,
    ar: () => `رقم التعريف الشخصي غير صحيح — يرجى المحاولة مرة أخرى`,
  },

  // ─── Cashiers & PIN ────────────────────────────────────────────────────
  CASHIER_NOT_FOUND: {
    en: (id: string) => `Cashier profile not found with ID "${id}"`,
    ar: (id: string) => `ملف الكاشير غير موجود بالمعرف "${id}"`,
  },
  INVALID_PIN: {
    en: (remaining: number) =>
      `Invalid PIN — ${remaining} attempt(s) remaining before account lockout`,
    ar: (remaining: number) =>
      `رقم التعريف الشخصي غير صحيح — ${remaining} محاولة متبقية قبل قفل الحساب`,
  },
  INVALID_MANAGER_PIN: {
    en: (remaining: number) =>
      `Invalid manager PIN — ${remaining} attempt(s) remaining before lockout`,
    ar: (remaining: number) =>
      `رقم التعريف الشخصي للمدير غير صحيح — ${remaining} محاولة متبقية قبل القفل`,
  },
  ACCOUNT_LOCKED: {
    en: (until: string) => `Account is locked until ${until} due to too many failed PIN attempts`,
    ar: (until: string) => `الحساب مقفل حتى ${until} بسبب تجاوز عدد محاولات الدخول`,
  },
  MANAGER_NOT_FOUND: {
    en: (id: string) => `Manager cashier profile not found with ID "${id}"`,
    ar: (id: string) => `ملف كاشير المدير غير موجود بالمعرف "${id}"`,
  },

  // ─── Overrides ─────────────────────────────────────────────────────────
  OVERRIDE_NOT_FOUND: {
    en: (id: string) => `Override not found with ID "${id}"`,
    ar: (id: string) => `التجاوز غير موجود بالمعرف "${id}"`,
  },
  OVERRIDE_ALREADY_APPROVED: {
    en: () => `Override has already been approved`,
    ar: () => `تمت الموافقة على التجاوز بالفعل`,
  },

  // ─── Discount ──────────────────────────────────────────────────────────
  DISCOUNT_EXCEEDS_LIMIT: {
    en: (pct: number, max: number) =>
      `Discount of ${pct}% exceeds your limit of ${max}% — request a manager override to proceed`,
    ar: (pct: number, max: number) =>
      `الخصم ${pct}% يتجاوز حدك المسموح ${max}% — اطلب موافقة مدير للمتابعة`,
  },

  // ─── Vouchers ──────────────────────────────────────────────────────────
  VOUCHER_NOT_FOUND: {
    en: (code: string) => `Voucher "${code}" not found`,
    ar: (code: string) => `الكوبون "${code}" غير موجود`,
  },
  VOUCHER_EXPIRED: {
    en: (code: string) => `Voucher "${code}" has expired`,
    ar: (code: string) => `انتهت صلاحية الكوبون "${code}"`,
  },
  VOUCHER_INACTIVE: {
    en: (code: string) => `Voucher "${code}" is not active`,
    ar: (code: string) => `الكوبون "${code}" غير نشط`,
  },
  VOUCHER_MIN_ORDER: {
    en: (code: string, min: number, total: number) =>
      `Voucher "${code}" requires a minimum order of ${min} SAR — current total is ${total} SAR`,
    ar: (code: string, min: number, total: number) =>
      `الكوبون "${code}" يتطلب حداً أدنى ${min} ريال — الإجمالي الحالي ${total} ريال`,
  },
  VOUCHER_MAX_USES: {
    en: (code: string) => `Voucher "${code}" has reached its maximum usage limit`,
    ar: (code: string) => `الكوبون "${code}" وصل إلى الحد الأقصى للاستخدام`,
  },
  VOUCHER_NOT_VALID: {
    en: (error: string) => `Voucher validation failed: ${error}`,
    ar: (error: string) => `فشل التحقق من الكوبون: ${error}`,
  },
  VOUCHER_MODULE_NOT_WIRED: {
    en: () => `Vouchers module is not configured — contact your administrator`,
    ar: () => `وحدة الكوبونات غير مُهيئة — تواصل مع مسؤول النظام`,
  },
  CUSTOMER_REQUIRED: {
    en: () => `Customer must be selected to use loyalty points or vouchers`,
    ar: () => `يجب تحديد العميل لاستخدام نقاط الولاء أو الكوبونات`,
  },

  // ─── Gift Cards ────────────────────────────────────────────────────────
  GIFT_CARD_NOT_FOUND: {
    en: (code: string) => `Gift card not found with code "${code}"`,
    ar: (code: string) => `بطاقة الهدية غير موجودة بالرمز "${code}"`,
  },
  GIFT_CARD_INACTIVE: {
    en: () => `Gift card is inactive`,
    ar: () => `بطاقة الهدية غير نشطة`,
  },
  GIFT_CARD_EXPIRED: {
    en: () => `Gift card has expired`,
    ar: () => `انتهت صلاحية بطاقة الهدية`,
  },
  GIFT_CARD_INSUFFICIENT: {
    en: (available: number, requested: number) =>
      `Gift card balance is ${available} SAR — insufficient for ${requested} SAR payment`,
    ar: (available: number, requested: number) =>
      `رصيد بطاقة الهدية ${available} ريال — غير كافٍ للدفع ${requested} ريال`,
  },

  // ─── Loyalty ───────────────────────────────────────────────────────────
  LOYALTY_ACCOUNT_NOT_FOUND: {
    en: (customerId: string) => `Loyalty account not found for customer "${customerId}"`,
    ar: (customerId: string) => `حساب الولاء غير موجود للعميل "${customerId}"`,
  },
  LOYALTY_INSUFFICIENT_POINTS: {
    en: (available: number, requested: number) =>
      `Loyalty account has ${available} points — not enough for the requested ${requested} points`,
    ar: (available: number, requested: number) =>
      `حساب الولاء يحتوي على ${available} نقطة — غير كافٍ للاستبدال المطلوب ${requested} نقطة`,
  },
  LOYALTY_TIER_NOT_FOUND: {
    en: (tierId: string, programId: string) =>
      `Loyalty tier "${tierId}" not found in program "${programId}"`,
    ar: (tierId: string, programId: string) =>
      `مستوى الولاء "${tierId}" غير موجود في البرنامج "${programId}"`,
  },

  // ─── Accounting — Chart of Accounts ───────────────────────────────────
  ACCOUNT_NOT_FOUND: {
    en: (id: string) => `Account "${id}" not found`,
    ar: (id: string) => `الحساب "${id}" غير موجود`,
  },
  ACCOUNT_HAS_POSTED_LINES: {
    en: (code: string) => `Account "${code}" has posted journal lines and cannot be deleted`,
    ar: (code: string) => `الحساب "${code}" يحتوي على قيود محاسبية مرحّلة ولا يمكن حذفه`,
  },
  ACCOUNT_REFERENCED_BY_ENTRIES: {
    en: (code: string) =>
      `Account "${code}" is referenced by unposted entries and cannot be deactivated`,
    ar: (code: string) => `الحساب "${code}" مرتبط بقيود غير مرحّلة ولا يمكن تعطيله`,
  },
  ACCOUNT_NO_DIRECT_POSTING: {
    en: (code: string) => `Account "${code}" does not allow direct posting`,
    ar: (code: string) => `الحساب "${code}" لا يسمح بالترحيل المباشر`,
  },
  ACCOUNT_CODE_DUPLICATE: {
    en: (code: string) => `Account code "${code}" already exists in this tenant`,
    ar: (code: string) => `رمز الحساب "${code}" موجود بالفعل في هذا المستأجر`,
  },

  // ─── Accounting — Fiscal Periods ──────────────────────────────────────
  PERIOD_NOT_FOUND: {
    en: (id: string) => `Fiscal period "${id}" not found`,
    ar: (id: string) => `الفترة المالية "${id}" غير موجودة`,
  },
  PERIOD_CLOSED: {
    en: (date: string) => `Fiscal period for date "${date}" is closed or locked`,
    ar: (date: string) => `الفترة المالية للتاريخ "${date}" مغلقة أو مقفلة`,
  },
  PERIOD_HAS_DRAFTS: {
    en: (numbers: string) => `Cannot close period — unposted entries exist: ${numbers}`,
    ar: (numbers: string) => `لا يمكن إغلاق الفترة — توجد قيود غير مرحّلة: ${numbers}`,
  },
  PERIOD_REOPEN_LOCKED: {
    en: () => `Locked periods cannot be reopened`,
    ar: () => `لا يمكن إعادة فتح الفترات المقفلة`,
  },

  // ─── Accounting — Journal Entries ─────────────────────────────────────
  JOURNAL_NOT_FOUND: {
    en: (id: string) => `Journal entry "${id}" not found`,
    ar: (id: string) => `القيد المحاسبي "${id}" غير موجود`,
  },
  JOURNAL_UNBALANCED: {
    en: (debit: number, credit: number) =>
      `Journal entry is not balanced — debits: ${debit}, credits: ${credit}`,
    ar: (debit: number, credit: number) =>
      `القيد المحاسبي غير متوازن — المدين: ${debit}، الدائن: ${credit}`,
  },
  JOURNAL_ALREADY_POSTED: {
    en: (id: string) => `Journal entry "${id}" is already posted and cannot be modified`,
    ar: (id: string) => `القيد المحاسبي "${id}" تم ترحيله بالفعل ولا يمكن تعديله`,
  },
  JOURNAL_ALREADY_REVERSED: {
    en: (id: string) => `Journal entry "${id}" has already been reversed`,
    ar: (id: string) => `القيد المحاسبي "${id}" تم عكسه بالفعل`,
  },
  JOURNAL_NOT_POSTED: {
    en: (id: string) => `Journal entry "${id}" must be posted before it can be reversed`,
    ar: (id: string) => `يجب ترحيل القيد المحاسبي "${id}" قبل عكسه`,
  },
  JOURNAL_DRAFT_ONLY: {
    en: () => `Only draft journal entries can be deleted`,
    ar: () => `يمكن حذف القيود المسودة فقط`,
  },

  // ─── Accounting — Cost Centers ─────────────────────────────────────────
  COST_CENTER_NOT_FOUND: {
    en: (id: string) => `Cost center "${id}" not found`,
    ar: (id: string) => `مركز التكلفة "${id}" غير موجود`,
  },

  // ─── Treasury ──────────────────────────────────────────────────────────
  TREASURY_ACCOUNT_NOT_FOUND: {
    en: (id: string) => `Treasury account "${id}" not found`,
    ar: (id: string) => `حساب الخزينة "${id}" غير موجود`,
  },
  TREASURY_ACCOUNT_CURRENCY_MISMATCH: {
    en: () => `Transaction currency must match account currency`,
    ar: () => `يجب أن تتطابق عملة المعاملة مع عملة الحساب`,
  },
  TREASURY_INSUFFICIENT_BALANCE: {
    en: (available: number, requested: number) =>
      `Insufficient balance: ${available} available, ${requested} requested`,
    ar: (available: number, requested: number) =>
      `رصيد غير كافٍ: المتاح ${available}، المطلوب ${requested}`,
  },
  RECONCILIATION_NOT_FOUND: {
    en: (id: string) => `Reconciliation "${id}" not found`,
    ar: (id: string) => `جلسة المطابقة "${id}" غير موجودة`,
  },
  RECONCILIATION_NOT_ZERO: {
    en: (diff: number) =>
      `Reconciliation has unresolved difference of ${diff} — must be zero to complete`,
    ar: (diff: number) =>
      `المطابقة لديها فارق غير محلول بمقدار ${diff} — يجب أن يكون صفراً للإكمال`,
  },
  RECONCILIATION_ALREADY_COMPLETED: {
    en: () => `Reconciliation is already completed`,
    ar: () => `جلسة المطابقة مكتملة بالفعل`,
  },
  IBAN_INVALID: {
    en: (iban: string) =>
      `Invalid Saudi IBAN format: "${iban}" — expected SA followed by 22 digits`,
    ar: (iban: string) =>
      `صيغة الآيبان السعودي غير صحيحة: "${iban}" — يجب أن تبدأ بـ SA متبوعة بـ 22 رقماً`,
  },

  // ─── HR Extensions ─────────────────────────────────────────────────────
  SHIFT_NOT_FOUND: {
    en: (id: string) => `Shift "${id}" not found`,
    ar: (id: string) => `الوردية "${id}" غير موجودة`,
  },
  ATTENDANCE_NOT_FOUND: {
    en: (id: string) => `Attendance record "${id}" not found`,
    ar: (id: string) => `سجل الحضور "${id}" غير موجود`,
  },
  PAYROLL_RUN_NOT_FOUND: {
    en: (id: string) => `Payroll run "${id}" not found`,
    ar: (id: string) => `مسير الرواتب "${id}" غير موجود`,
  },
  PAYROLL_WRONG_STATUS: {
    en: (current: string, expected: string) =>
      `Payroll run status is "${current}" — expected "${expected}"`,
    ar: (current: string, expected: string) =>
      `حالة مسير الرواتب هي "${current}" — المتوقع "${expected}"`,
  },
  PAYROLL_ITEM_NOT_FOUND: {
    en: (id: string) => `Payroll item "${id}" not found`,
    ar: (id: string) => `بند مسير الرواتب "${id}" غير موجود`,
  },
  TRAINING_NOT_FOUND: {
    en: (id: string) => `Training record "${id}" not found`,
    ar: (id: string) => `سجل التدريب "${id}" غير موجود`,
  },
  CONTRACT_NOT_FOUND: {
    en: (id: string) => `Contract "${id}" not found`,
    ar: (id: string) => `العقد "${id}" غير موجود`,
  },
  CONTRACT_ALREADY_ACTIVE: {
    en: (employeeId: string) => `Employee "${employeeId}" already has an active contract`,
    ar: (employeeId: string) => `الموظف "${employeeId}" لديه عقد نشط بالفعل`,
  },

  // ─── Restaurant ────────────────────────────────────────────────────────
  SECTION_NOT_FOUND: {
    en: (id: string) => `Restaurant section "${id}" not found`,
    ar: (id: string) => `قسم المطعم "${id}" غير موجود`,
  },
  TABLE_NOT_FOUND: {
    en: (id: string) => `Restaurant table "${id}" not found`,
    ar: (id: string) => `طاولة المطعم "${id}" غير موجودة`,
  },
  TABLE_NUMBER_DUPLICATE: {
    en: (number: string, sectionId: string) =>
      `Table number ${number} already exists in section "${sectionId}"`,
    ar: (number: string, sectionId: string) =>
      `رقم الطاولة ${number} موجود بالفعل في القسم "${sectionId}"`,
  },
  TABLE_OCCUPIED: {
    en: (tableId: string) => `Table "${tableId}" is already occupied`,
    ar: (tableId: string) => `الطاولة "${tableId}" مشغولة بالفعل`,
  },
  TABLE_SESSION_NOT_FOUND: {
    en: (id: string) => `Table session "${id}" not found`,
    ar: (id: string) => `جلسة الطاولة "${id}" غير موجودة`,
  },
  TABLE_SESSION_ALREADY_RELEASED: {
    en: (id: string) => `Table session "${id}" has already been released`,
    ar: (id: string) => `جلسة الطاولة "${id}" تم إنهاؤها بالفعل`,
  },
  KITCHEN_TICKET_NOT_FOUND: {
    en: (id: string) => `Kitchen ticket "${id}" not found`,
    ar: (id: string) => `تذكرة المطبخ "${id}" غير موجودة`,
  },
  KITCHEN_TICKET_ALREADY_CANCELLED: {
    en: (id: string) => `Kitchen ticket "${id}" is already cancelled`,
    ar: (id: string) => `تذكرة المطبخ "${id}" تم إلغاؤها بالفعل`,
  },

  // ─── Currency ──────────────────────────────────────────────────────────
  CURRENCY_NOT_FOUND: {
    en: (id: string) => `Currency not found with ID "${id}"`,
    ar: (id: string) => `العملة غير موجودة بالمعرف "${id}"`,
  },
  NO_BASE_CURRENCY: {
    en: (tenantId: string) => `No base currency configured for tenant "${tenantId}"`,
    ar: (tenantId: string) => `لا توجد عملة أساسية مُهيأة للمستأجر "${tenantId}"`,
  },
  EXCHANGE_RATE_NOT_FOUND: {
    en: (from: string, to: string, date: string) =>
      `No exchange rate found from currency "${from}" to "${to}" on or before "${date}"`,
    ar: (from: string, to: string, date: string) =>
      `لا يوجد سعر صرف من العملة "${from}" إلى "${to}" في أو قبل التاريخ "${date}"`,
  },
  EXCHANGE_RATE_PARAMS_REQUIRED: {
    en: () => `Both "from" and "to" currency IDs are required`,
    ar: () => `يجب تحديد كلا معرفي العملتين "من" و"إلى"`,
  },
  CURRENCY_ID_REQUIRED: {
    en: () => `Currency ID query parameter is required`,
    ar: () => `معرف العملة مطلوب كمعامل استعلام`,
  },

  // ─── Accounting — Journal Validation ─────────────────────────────
  JOURNAL_EMPTY: {
    en: () => `Journal entry must have at least one line`,
    ar: () => `يجب أن يحتوي القيد المحاسبي على سطر واحد على الأقل`,
  },
  JOURNAL_LINE_INVALID: {
    en: () => `Each journal line must have exactly one of debit or credit greater than zero`,
    ar: () => `يجب أن يحتوي كل سطر على مبلغ مدين أو دائن واحد فقط أكبر من صفر`,
  },
  ACCOUNT_INACTIVE: {
    en: (code: string) => `Account "${code}" is not active`,
    ar: (code: string) => `الحساب "${code}" غير نشط`,
  },
  ACCOUNTING_SETTING_MISSING: {
    en: (key: string) =>
      `Accounting setting "${key}" is not configured for this tenant — please configure it in accounting settings`,
    ar: (key: string) =>
      `إعداد المحاسبة "${key}" غير مُهيأ لهذا المستأجر — يرجى تهيئته في إعدادات المحاسبة`,
  },

  // ─── Accounting — Fiscal Period Status ───────────────────────────
  PERIOD_NOT_OPEN: {
    en: (status: string) => `Period is not open — current status is "${status}"`,
    ar: (status: string) => `الفترة ليست مفتوحة — الحالة الحالية هي "${status}"`,
  },
  PERIOD_ALREADY_OPEN: {
    en: () => `Period is already open`,
    ar: () => `الفترة مفتوحة بالفعل`,
  },
  PERIOD_ALREADY_LOCKED: {
    en: () => `Period is already locked`,
    ar: () => `الفترة مقفلة بالفعل`,
  },

  // ─── Accounting — Cost Centers ───────────────────────────────────
  COST_CENTER_CODE_DUPLICATE: {
    en: (code: string) => `Cost center code "${code}" already exists in this tenant`,
    ar: (code: string) => `رمز مركز التكلفة "${code}" موجود بالفعل في هذا المستأجر`,
  },

  // ─── Voucher Validation ──────────────────────────────────────────
  VOUCHER_NOT_VALID_FOR_TIME: {
    en: (code: string) => `Voucher "${code}" is not valid at this time`,
    ar: (code: string) => `الكوبون "${code}" غير صالح في هذا الوقت`,
  },
  VOUCHER_NOT_FOR_CUSTOMER: {
    en: (code: string) => `Voucher "${code}" is not valid for this customer`,
    ar: (code: string) => `الكوبون "${code}" غير صالح لهذا العميل`,
  },
  VOUCHER_CUSTOMER_MAX_USES: {
    en: (code: string) => `Customer has reached maximum uses for voucher "${code}"`,
    ar: (code: string) => `وصل العميل للحد الأقصى لاستخدام الكوبون "${code}"`,
  },

  // ─── Loyalty ─────────────────────────────────────────────────────
  LOYALTY_TIER_NOT_IN_PROGRAM: {
    en: (tierId: string, programId: string) =>
      `Tier "${tierId}" not found in program "${programId}"`,
    ar: (tierId: string, programId: string) =>
      `المستوى "${tierId}" غير موجود في البرنامج "${programId}"`,
  },

  // ─── Kitchen ─────────────────────────────────────────────────────
  KITCHEN_NO_VALID_ITEMS: {
    en: (orderId: string) =>
      `No valid order items found for the provided IDs in order "${orderId}"`,
    ar: (orderId: string) =>
      `لم يتم العثور على عناصر طلب صالحة للمعرفات المقدمة في الطلب "${orderId}"`,
  },

  // ─── CRM ──────────────────────────────────────────────────────────────
  LEAD_ALREADY_CLOSED: {
    en: (id: string) => `Lead ${id} is already won or lost — cannot be modified`,
    ar: (id: string) => `الفرصة ${id} مغلقة بالفعل — لا يمكن تعديلها`,
  },
  CONTACT_NOT_FOUND: {
    en: (id: string) => `Contact ${id} not found`,
    ar: (id: string) => `جهة الاتصال ${id} غير موجودة`,
  },

  // ─── Sales & Purchase Orders ─────────────────────────────────────────
  ORDER_ALREADY_CONFIRMED: {
    en: (n: string) => `Order ${n} is confirmed and cannot be edited — cancel it to make changes`,
    ar: (n: string) => `الطلب ${n} مؤكد ولا يمكن تعديله — ألغِه لإجراء تغييرات`,
  },
  ORDER_NOT_CANCELLABLE: {
    en: (n: string, s: string) => `Order ${n} cannot be cancelled — current status is "${s}"`,
    ar: (n: string, s: string) => `لا يمكن إلغاء الطلب ${n} — الحالة الحالية "${s}"`,
  },
  VENDOR_NOT_FOUND: {
    en: (id: string) => `Vendor ${id} not found`,
    ar: (id: string) => `المورد ${id} غير موجود`,
  },

  // ─── Inventory ────────────────────────────────────────────────────────
  TRANSFER_INSUFFICIENT_STOCK: {
    en: (n: string, a: number, r: number) =>
      `Cannot transfer "${n}" — available: ${a}, requested: ${r}`,
    ar: (n: string, a: number, r: number) => `لا يمكن نقل "${n}" — المتاح: ${a}، المطلوب: ${r}`,
  },

  // ─── Notifications & Outbox ───────────────────────────────────────────
  OUTBOX_MAX_ATTEMPTS: {
    en: (type: string) => `Event "${type}" failed after 3 attempts and moved to dead letter`,
    ar: (type: string) => `فشل الحدث "${type}" بعد 3 محاولات وتم إرساله للرسائل الميتة`,
  },

  // ─── Generic ───────────────────────────────────────────────────────────
  NOT_FOUND: {
    en: (entity: string, id: string) => `${entity} not found with ID "${id}"`,
    ar: (entity: string, id: string) => `${entity} غير موجود بالمعرف "${id}"`,
  },
  VERSION_CONFLICT: {
    en: (expected: number, actual: number) =>
      `Version conflict: expected ${expected}, but record is at version ${actual}`,
    ar: (expected: number, actual: number) =>
      `تعارض في الإصدار: المتوقع ${expected}، لكن السجل في الإصدار ${actual}`,
  },
} as const;
