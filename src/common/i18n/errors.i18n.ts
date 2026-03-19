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
  REFUND_ITEMS_REQUIRED: {
    en: () =>
      `Partial refund requires an items list — specify which items and quantities to refund`,
    ar: () => `الاسترداد الجزئي يتطلب قائمة عناصر — حدد العناصر والكميات المراد استردادها`,
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
  SYNC_SESSION_NOT_FOUND: {
    en: (sessionId: string) =>
      `Session "${sessionId}" not found — offline orders cannot be synced without a valid session`,
    ar: (sessionId: string) =>
      `الجلسة "${sessionId}" غير موجودة — لا يمكن مزامنة الطلبات دون جلسة صالحة`,
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

  // ─── Accounting — Setup ──────────────────────────────────────────────
  ACCOUNT_GROUP_NOT_FOUND: {
    en: (id: string) => `Account group "${id}" not found`,
    ar: (id: string) => `مجموعة الحسابات "${id}" غير موجودة`,
  },
  ACCOUNT_GROUP_CODE_PREFIX_DUPLICATE: {
    en: (prefix: string) =>
      `Account group with code prefix "${prefix}" already exists for this tenant`,
    ar: (prefix: string) => `مجموعة حسابات ببادئة الرمز "${prefix}" موجودة بالفعل لهذا المستأجر`,
  },
  TAX_GROUP_NOT_FOUND: {
    en: (id: string) => `Tax group "${id}" not found`,
    ar: (id: string) => `مجموعة الضرائب "${id}" غير موجودة`,
  },
  TAX_NOT_FOUND: {
    en: (id: string) => `Tax "${id}" not found`,
    ar: (id: string) => `الضريبة "${id}" غير موجودة`,
  },
  JOURNAL_CODE_DUPLICATE: {
    en: (code: string) => `Journal with code "${code}" already exists for this tenant`,
    ar: (code: string) => `دفتر يومية بالرمز "${code}" موجود بالفعل لهذا المستأجر`,
  },
  JOURNAL_SETUP_NOT_FOUND: {
    en: (id: string) => `Journal "${id}" not found`,
    ar: (id: string) => `دفتر اليومية "${id}" غير موجود`,
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
  FISCAL_LOCK_DATE_VIOLATION: {
    en: (date: string, lockDate: string) =>
      `Entry date "${date}" is on or before the fiscal lock date "${lockDate}" — posting is not allowed`,
    ar: (date: string, lockDate: string) =>
      `تاريخ القيد "${date}" يساوي أو يسبق تاريخ القفل المالي "${lockDate}" — لا يُسمح بالترحيل`,
  },
  JOURNAL_TYPE_NOT_FOUND: {
    en: (type: string) =>
      `No active journal of type "${type}" found for this tenant — please create one in accounting setup`,
    ar: (type: string) =>
      `لم يتم العثور على دفتر يومية نشط من نوع "${type}" لهذا المستأجر — يرجى إنشاء واحد في إعدادات المحاسبة`,
  },
  ACCOUNT_DEPRECATED: {
    en: (code: string) => `Account "${code}" is deprecated and cannot be used in new entries`,
    ar: (code: string) => `الحساب "${code}" مُهمل ولا يمكن استخدامه في قيود جديدة`,
  },
  PARTNER_REQUIRED_FOR_ACCOUNT: {
    en: (code: string) => `Partner is required for reconcilable account "${code}" (AR/AP)`,
    ar: (code: string) => `الشريك مطلوب للحساب القابل للمطابقة "${code}" (مدينون/دائنون)`,
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
  LEAD_NOT_FOUND: {
    en: (id: string) => `Lead "${id}" not found`,
    ar: (id: string) => `الفرصة "${id}" غير موجودة`,
  },
  LEAD_ALREADY_CLOSED: {
    en: (id: string) => `Lead "${id}" is already won or lost — cannot be modified`,
    ar: (id: string) => `الفرصة "${id}" مغلقة بالفعل — لا يمكن تعديلها`,
  },
  LEAD_ALREADY_CONVERTED: {
    en: (id: string) => `Lead "${id}" is already an opportunity — cannot convert again`,
    ar: (id: string) => `الفرصة "${id}" محولة بالفعل إلى فرصة — لا يمكن التحويل مرة أخرى`,
  },
  CONTACT_NOT_FOUND: {
    en: (id: string) => `Contact "${id}" not found`,
    ar: (id: string) => `جهة الاتصال "${id}" غير موجودة`,
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
  TRANSFER_SAME_WAREHOUSE: {
    en: () => `Source and destination warehouse cannot be the same — select a different warehouse`,
    ar: () => `لا يمكن أن يكون مستودع المصدر والوجهة نفسه — اختر مستودعاً مختلفاً`,
  },

  // ─── Notifications & Outbox ───────────────────────────────────────────
  OUTBOX_MAX_ATTEMPTS: {
    en: (type: string) => `Event "${type}" failed after 3 attempts and moved to dead letter`,
    ar: (type: string) => `فشل الحدث "${type}" بعد 3 محاولات وتم إرساله للرسائل الميتة`,
  },

  // ─── Settings ─────────────────────────────────────────────────────────
  SETTING_NOT_CONFIGURED: {
    en: (key: string) => `Setting "${key}" is not configured`,
    ar: (key: string) => `الإعداد "${key}" غير مُهيأ`,
  },
  SETTING_INVALID_VALUE: {
    en: (key: string, value: string, expected: string) =>
      `Setting "${key}" has invalid value "${value}" — expected ${expected}`,
    ar: (key: string, value: string, expected: string) =>
      `الإعداد "${key}" يحتوي على قيمة غير صالحة "${value}" — يُتوقع ${expected}`,
  },

  // ─── Sales Orders ────────────────────────────────────────────────────
  SALES_ORDER_NOT_FOUND: {
    en: (id: string) => `Sales order ${id} not found`,
    ar: (id: string) => `أمر البيع ${id} غير موجود`,
  },
  SALES_ORDER_WRONG_STATUS: {
    en: (n: string, current: string, required: string) =>
      `Sales order ${n} cannot perform this action — status is "${current}", requires "${required}"`,
    ar: (n: string, current: string, required: string) =>
      `أمر البيع ${n} لا يمكن تنفيذ هذا الإجراء — الحالة "${current}"، يتطلب "${required}"`,
  },
  SALES_ORDER_DRAFT_ONLY_EDIT: {
    en: (id: string) => `Sales order "${id}" can only be edited in draft status`,
    ar: (id: string) => `أمر البيع "${id}" يمكن تعديله فقط في حالة المسودة`,
  },
  SALES_ORDER_DRAFT_ONLY_DELETE: {
    en: (id: string) => `Sales order "${id}" can only be deleted in draft status`,
    ar: (id: string) => `أمر البيع "${id}" يمكن حذفه فقط في حالة المسودة`,
  },
  SALES_ORDER_NO_LINES: {
    en: (id: string) => `Sales order "${id}" has no lines — cannot confirm`,
    ar: (id: string) => `أمر البيع "${id}" لا يحتوي على بنود — لا يمكن التأكيد`,
  },
  SALES_ORDER_HAS_INVOICES: {
    en: (id: string) => `Sales order "${id}" has linked invoices — cannot cancel`,
    ar: (id: string) => `أمر البيع "${id}" مرتبط بفواتير — لا يمكن الإلغاء`,
  },
  SALES_ORDER_HAS_DELIVERIES: {
    en: (id: string) => `Sales order "${id}" has linked deliveries — cannot cancel`,
    ar: (id: string) => `أمر البيع "${id}" مرتبط بتسليمات — لا يمكن الإلغاء`,
  },
  SALES_ORDER_NOT_CONFIRMED: {
    en: (id: string) =>
      `Sales order "${id}" must be confirmed before creating invoices or deliveries`,
    ar: (id: string) => `أمر البيع "${id}" يجب تأكيده قبل إنشاء فواتير أو تسليمات`,
  },
  STOCK_RESERVATION_FAILED: {
    en: (name: string, available: number, requested: number) =>
      `Cannot reserve "${name}" — available: ${available}, requested: ${requested}`,
    ar: (name: string, available: number, requested: number) =>
      `لا يمكن حجز "${name}" — المتاح: ${available}، المطلوب: ${requested}`,
  },
  SALES_ORDER_NO_LINES_TO_DELIVER: {
    en: (id: string) => `Sales order "${id}" has no lines remaining to deliver`,
    ar: (id: string) => `أمر البيع "${id}" لا يحتوي على بنود متبقية للتسليم`,
  },
  NO_DEFAULT_WAREHOUSE: {
    en: () => `No default warehouse configured for this tenant`,
    ar: () => `لم يتم تكوين مستودع افتراضي لهذا المستأجر`,
  },
  DOWN_PAYMENT_PERCENTAGE_INVALID: {
    en: (min: number, max: number) => `Down payment percentage must be between ${min} and ${max}`,
    ar: (min: number, max: number) => `نسبة الدفعة المقدمة يجب أن تكون بين ${min} و ${max}`,
  },
  DOWN_PAYMENT_AMOUNT_INVALID: {
    en: (orderTotal: number) =>
      `Down payment amount must be between 0 and the order total (${orderTotal})`,
    ar: (orderTotal: number) =>
      `مبلغ الدفعة المقدمة يجب أن يكون بين 0 وإجمالي الطلب (${orderTotal})`,
  },

  // ─── Purchase Orders ─────────────────────────────────────────────────
  PURCHASE_ORDER_NOT_FOUND: {
    en: (id: string) => `Purchase order ${id} not found`,
    ar: (id: string) => `أمر الشراء ${id} غير موجود`,
  },
  PURCHASE_ORDER_WRONG_STATUS: {
    en: (n: string, current: string, required: string) =>
      `Purchase order ${n} status is "${current}", requires "${required}"`,
    ar: (n: string, current: string, required: string) =>
      `أمر الشراء ${n} الحالة "${current}"، يتطلب "${required}"`,
  },
  PURCHASE_ORDER_NOT_CONFIRMED: {
    en: (id: string) =>
      `Purchase order "${id}" must be confirmed before creating receipts or bills`,
    ar: (id: string) => `أمر الشراء "${id}" يجب تأكيده قبل إنشاء إيصالات أو فواتير`,
  },
  PURCHASE_ORDER_HAS_RECEIPTS: {
    en: (id: string) => `Purchase order "${id}" has linked receipts — cannot cancel`,
    ar: (id: string) => `أمر الشراء "${id}" مرتبط بإيصالات استلام — لا يمكن الإلغاء`,
  },
  PURCHASE_ORDER_HAS_BILLS: {
    en: (id: string) => `Purchase order "${id}" has linked bills — cannot cancel`,
    ar: (id: string) => `أمر الشراء "${id}" مرتبط بفواتير — لا يمكن الإلغاء`,
  },
  PARTNER_NOT_SUPPLIER: {
    en: (id: string) => `Partner "${id}" is not a supplier — cannot create purchase order`,
    ar: (id: string) => `الشريك "${id}" ليس موردًا — لا يمكن إنشاء أمر شراء`,
  },

  // ─── Users ────────────────────────────────────────────────────────────
  USER_NOT_FOUND: {
    en: (id: string) => `User not found with ID "${id}"`,
    ar: (id: string) => `المستخدم غير موجود بالمعرف "${id}"`,
  },
  EMAIL_ALREADY_EXISTS: {
    en: (email: string) => `Email "${email}" is already registered`,
    ar: (email: string) => `البريد الإلكتروني "${email}" مسجل بالفعل`,
  },
  PASSWORD_MISMATCH: {
    en: () => `New password and confirmation do not match`,
    ar: () => `كلمة المرور الجديدة والتأكيد غير متطابقين`,
  },
  PASSWORD_INCORRECT: {
    en: () => `Current password is incorrect`,
    ar: () => `كلمة المرور الحالية غير صحيحة`,
  },
  ERASURE_ALREADY_PENDING: {
    en: () => `An erasure request is already pending for this user`,
    ar: () => `يوجد طلب حذف معلق بالفعل لهذا المستخدم`,
  },
  USER_DELETED_NOT_FOUND: {
    en: () => `Deleted user not found — may have already been permanently removed`,
    ar: () => `المستخدم المحذوف غير موجود — ربما تم حذفه نهائياً بالفعل`,
  },
  ALL_SESSIONS_REVOKED: {
    en: () => `All user sessions have been revoked`,
    ar: () => `تم إلغاء جميع جلسات المستخدم`,
  },

  // ─── Roles & Permissions ─────────────────────────────────────────────
  ROLE_NOT_FOUND: {
    en: (id: string) => `Role not found with ID "${id}"`,
    ar: (id: string) => `الدور غير موجود بالمعرف "${id}"`,
  },
  ROLE_NAME_EXISTS: {
    en: (name: string) => `Role name "${name}" already exists`,
    ar: (name: string) => `اسم الدور "${name}" موجود بالفعل`,
  },
  SYSTEM_ROLE_IMMUTABLE: {
    en: () => `System role names cannot be modified`,
    ar: () => `لا يمكن تعديل أسماء أدوار النظام`,
  },
  SYSTEM_ROLE_UNDELETABLE: {
    en: () => `System roles cannot be deleted`,
    ar: () => `لا يمكن حذف أدوار النظام`,
  },
  NO_AUTHENTICATED_USER: {
    en: () => `No authenticated user — please log in`,
    ar: () => `لا يوجد مستخدم مصادق — يرجى تسجيل الدخول`,
  },
  BRANCH_INVALID_HEADER: {
    en: (value: string) => `Invalid x-branch-id header format: "${value}"`,
    ar: (value: string) => `صيغة رأس x-branch-id غير صحيحة: "${value}"`,
  },
  BRANCH_ACCESS_DENIED: {
    en: () => `You do not have access to this branch`,
    ar: () => `ليس لديك صلاحية الوصول إلى هذا الفرع`,
  },
  INVALID_OVERRIDE_FORMAT: {
    en: (id: string) => `Invalid override ID format: "${id}"`,
    ar: (id: string) => `صيغة معرف التجاوز غير صحيحة: "${id}"`,
  },
  PERMISSION_OVERRIDE_NOT_FOUND: {
    en: (id: string) => `Permission override not found with ID "${id}"`,
    ar: (id: string) => `تجاوز الصلاحية غير موجود بالمعرف "${id}"`,
  },
  INVALID_OVERRIDE_TYPE: {
    en: (type: string) => `Invalid override type: "${type}"`,
    ar: (type: string) => `نوع التجاوز غير صحيح: "${type}"`,
  },

  // ─── Tenants ─────────────────────────────────────────────────────────
  TENANT_ALREADY_SUSPENDED: {
    en: () => `Tenant is already suspended`,
    ar: () => `المستأجر معلق بالفعل`,
  },
  TENANT_ALREADY_ACTIVE: {
    en: () => `Tenant is already active`,
    ar: () => `المستأجر نشط بالفعل`,
  },

  // ─── HR — Employees & Departments ────────────────────────────────────
  EMPLOYEE_NOT_FOUND: {
    en: (id: string) => `Employee not found with ID "${id}"`,
    ar: (id: string) => `الموظف غير موجود بالمعرف "${id}"`,
  },
  DEPARTMENT_NOT_FOUND: {
    en: (id: string) => `Department not found with ID "${id}"`,
    ar: (id: string) => `القسم غير موجود بالمعرف "${id}"`,
  },

  // ─── HR — Leave Requests ─────────────────────────────────────────────
  LEAVE_NOT_FOUND: {
    en: (id: string) => `Leave request not found with ID "${id}"`,
    ar: (id: string) => `طلب الإجازة غير موجود بالمعرف "${id}"`,
  },
  LEAVE_END_BEFORE_START: {
    en: () => `End date must be after start date`,
    ar: () => `تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية`,
  },
  LEAVE_OVERLAP: {
    en: () => `Leave request overlaps with an existing leave`,
    ar: () => `طلب الإجازة يتداخل مع إجازة موجودة`,
  },
  LEAVE_ONLY_PENDING_UPDATE: {
    en: () => `Only pending leave requests can be updated`,
    ar: () => `يمكن تعديل طلبات الإجازة المعلقة فقط`,
  },

  // ─── Product Variants & Attributes ───────────────────────────────────
  PRODUCT_ATTRIBUTE_NOT_FOUND: {
    en: (id: string) => `Product attribute not found with ID "${id}"`,
    ar: (id: string) => `خاصية المنتج غير موجودة بالمعرف "${id}"`,
  },
  ATTRIBUTE_VALUE_NOT_FOUND: {
    en: (id: string) => `Attribute value not found with ID "${id}"`,
    ar: (id: string) => `قيمة الخاصية غير موجودة بالمعرف "${id}"`,
  },
  ATTRIBUTE_ALREADY_ASSIGNED: {
    en: (attributeId: string, productId: string) =>
      `Attribute "${attributeId}" is already assigned to product "${productId}"`,
    ar: (attributeId: string, productId: string) =>
      `الخاصية "${attributeId}" مُعينة بالفعل للمنتج "${productId}"`,
  },
  TEMPLATE_ATTRIBUTE_NOT_FOUND: {
    en: (id: string) => `Template attribute not found with ID "${id}"`,
    ar: (id: string) => `خاصية القالب غير موجودة بالمعرف "${id}"`,
  },
  NO_ACTIVE_ATTRIBUTE_VALUES: {
    en: (productId: string) => `No active attribute values configured for product "${productId}"`,
    ar: (productId: string) => `لا توجد قيم خصائص نشطة مُهيأة للمنتج "${productId}"`,
  },
  NO_ATTRIBUTE_GROUPS: {
    en: () => `No attribute groups found for variant generation`,
    ar: () => `لم يتم العثور على مجموعات خصائص لتوليد المتغيرات`,
  },
  COMBO_ALREADY_CONFIGURED: {
    en: (productId: string) => `Product "${productId}" is already configured as a combo`,
    ar: (productId: string) => `المنتج "${productId}" مُهيأ بالفعل كمجموعة`,
  },

  // ─── Stock Movements ─────────────────────────────────────────────────
  TO_WAREHOUSE_REQUIRED: {
    en: () => `toWarehouseId is required for transfer movements`,
    ar: () => `معرف المستودع الوجهة مطلوب لحركات النقل`,
  },

  // ─── Pricelists ──────────────────────────────────────────────────────
  PRICELIST_PRODUCT_REQUIRED: {
    en: () => `productId is required when applyOn is set to "product"`,
    ar: () => `معرف المنتج مطلوب عندما يكون التطبيق على "منتج"`,
  },
  PRICELIST_CATEGORY_REQUIRED: {
    en: () => `categoryId is required when applyOn is set to "category"`,
    ar: () => `معرف الفئة مطلوب عندما يكون التطبيق على "فئة"`,
  },

  // ─── Sequences ───────────────────────────────────────────────────────
  ZATCA_SEQUENCE_NO_RESET: {
    en: () => `ZATCA invoice sequences cannot be manually reset`,
    ar: () => `لا يمكن إعادة تعيين تسلسلات فواتير ZATCA يدوياً`,
  },

  // ─── Reports ─────────────────────────────────────────────────────────
  REPORT_FROM_TO_REQUIRED: {
    en: () => `"from" and "to" query params are required`,
    ar: () => `معاملات الاستعلام "من" و"إلى" مطلوبة`,
  },
  REPORT_ACCOUNT_FROM_TO_REQUIRED: {
    en: () => `"accountId", "from", and "to" query params are required`,
    ar: () => `معاملات الاستعلام "معرف الحساب" و"من" و"إلى" مطلوبة`,
  },
  REPORT_AS_OF_DATE_REQUIRED: {
    en: () => `"asOfDate" query param is required`,
    ar: () => `معامل الاستعلام "حتى تاريخ" مطلوب`,
  },

  // ─── Infrastructure ──────────────────────────────────────────────────
  METRICS_RESTRICTED: {
    en: () => `Metrics endpoint restricted to internal networks`,
    ar: () => `نقطة نهاية المقاييس مقتصرة على الشبكات الداخلية`,
  },
  DOWN_PAYMENT_AMOUNT_POSITIVE: {
    en: () => `Down payment amount must be greater than 0`,
    ar: () => `مبلغ الدفعة المقدمة يجب أن يكون أكبر من 0`,
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

  // ─── Projects & Tasks ────────────────────────────────────────────────────
  PROJECT_NOT_FOUND: {
    en: (id: string) => `Project ${id} not found`,
    ar: (id: string) => `المشروع ${id} غير موجود`,
  },
  PROJECT_HAS_ACTIVE_TASKS: {
    en: (name: string) => `Cannot delete project "${name}" — it has active tasks`,
    ar: (name: string) => `لا يمكن حذف المشروع "${name}" — لديه مهام نشطة`,
  },
  TASK_NOT_FOUND: {
    en: (id: string) => `Task ${id} not found`,
    ar: (id: string) => `المهمة ${id} غير موجودة`,
  },
  CANNOT_REMOVE_LAST_MANAGER: {
    en: () => `Cannot remove the last manager from the project`,
    ar: () => `لا يمكن إزالة المدير الأخير من المشروع`,
  },
  PROJECT_NOT_COMPLETABLE: {
    en: (n: string) => `Cannot complete project — ${n} tasks are still active`,
    ar: (n: string) => `لا يمكن إكمال المشروع — ${n} مهمة لا تزال نشطة`,
  },

  // ─── Audit Logs ────────────────────────────────────────────────────────
  AUDIT_LOG_NOT_FOUND: {
    en: (id: string) => `Audit log entry ${id} not found`,
    ar: (id: string) => `سجل التدقيق ${id} غير موجود`,
  },

  // ─── ZATCA ──────────────────────────────────────────────────────────────
  ZATCA_NOT_CONFIGURED: {
    en: (key: string) => `ZATCA setting "${key}" is not configured for this tenant`,
    ar: (key: string) => `إعداد ZATCA "${key}" غير مُهيأ لهذا المستأجر`,
  },
  ZATCA_ALREADY_ISSUED: {
    en: (n: string) => `Invoice ${n} has already been issued and cannot be reissued`,
    ar: (n: string) => `الفاتورة ${n} صدرت بالفعل ولا يمكن إعادة إصدارها`,
  },
  ZATCA_CLEARANCE_FAILED: {
    en: (n: string, err: string) => `ZATCA clearance failed for invoice ${n}: ${err}`,
    ar: (n: string, err: string) => `فشل تخليص ZATCA للفاتورة ${n}: ${err}`,
  },

  // ─── HR Definitions ────────────────────────────────────────────────
  JOB_TITLE_NOT_FOUND: {
    en: (id: string) => `Job title "${id}" not found`,
    ar: (id: string) => `المسمى الوظيفي "${id}" غير موجود`,
  },
  EMPLOYMENT_TYPE_NOT_FOUND: {
    en: (id: string) => `Employment type "${id}" not found`,
    ar: (id: string) => `نوع التوظيف "${id}" غير موجود`,
  },
  LEAVE_TYPE_CONFIG_NOT_FOUND: {
    en: (id: string) => `Leave type "${id}" not found`,
    ar: (id: string) => `نوع الإجازة "${id}" غير موجود`,
  },
  PUBLIC_HOLIDAY_NOT_FOUND: {
    en: (id: string) => `Public holiday "${id}" not found`,
    ar: (id: string) => `الإجازة الرسمية "${id}" غير موجودة`,
  },
  TERMINATION_REASON_NOT_FOUND: {
    en: (id: string) => `Termination reason "${id}" not found`,
    ar: (id: string) => `سبب إنهاء الخدمة "${id}" غير موجود`,
  },

  // ─── Inventory Definitions ────────────────────────────────────────
  UNIT_OF_MEASURE_NOT_FOUND: {
    en: (id: string) => `Unit of measure "${id}" not found`,
    ar: (id: string) => `وحدة القياس "${id}" غير موجودة`,
  },
  ADJUSTMENT_REASON_NOT_FOUND: {
    en: (id: string) => `Adjustment reason "${id}" not found`,
    ar: (id: string) => `سبب التعديل "${id}" غير موجود`,
  },

  // ─── Sales & POS Definitions ──────────────────────────────────────
  VOUCHER_TYPE_NOT_FOUND: {
    en: (id: string) => `Voucher type "${id}" not found`,
    ar: (id: string) => `نوع القسيمة "${id}" غير موجود`,
  },
  RECEIPT_TEMPLATE_NOT_FOUND: {
    en: (id: string) => `Receipt template "${id}" not found`,
    ar: (id: string) => `قالب الإيصال "${id}" غير موجود`,
  },
  CANCELLATION_REASON_NOT_FOUND: {
    en: (id: string) => `Cancellation reason "${id}" not found`,
    ar: (id: string) => `سبب الإلغاء "${id}" غير موجود`,
  },
  VOID_REFUND_REASON_NOT_FOUND: {
    en: (id: string) => `Void/refund reason "${id}" not found`,
    ar: (id: string) => `سبب الإلغاء/الاسترداد "${id}" غير موجود`,
  },
  DISCOUNT_REASON_NOT_FOUND: {
    en: (id: string) => `Discount reason "${id}" not found`,
    ar: (id: string) => `سبب الخصم "${id}" غير موجود`,
  },
  HOLD_REASON_NOT_FOUND: {
    en: (id: string) => `Hold reason "${id}" not found`,
    ar: (id: string) => `سبب التعليق "${id}" غير موجود`,
  },

  // ─── Purchasing Definitions ────────────────────────────────────────
  PAYMENT_TERM_NOT_FOUND: {
    en: (id: string) => `Payment term "${id}" not found`,
    ar: (id: string) => `شرط الدفع "${id}" غير موجود`,
  },
  REJECTION_REASON_NOT_FOUND: {
    en: (id: string) => `Rejection reason "${id}" not found`,
    ar: (id: string) => `سبب الرفض "${id}" غير موجود`,
  },

  // ─── Treasury Definitions ────────────────────────────────────────
  TRANSFER_REASON_NOT_FOUND: {
    en: (id: string) => `Transfer reason "${id}" not found`,
    ar: (id: string) => `سبب التحويل "${id}" غير موجود`,
  },

  // ─── Tickets ──────────────────────────────────────────────────────────
  TICKET_NOT_FOUND: {
    en: (id: string) => `Ticket "${id}" not found`,
    ar: (id: string) => `التذكرة "${id}" غير موجودة`,
  },
  TICKET_CLOSED: {
    en: (id: string) => `Ticket "${id}" is closed — please create a new ticket`,
    ar: (id: string) => `التذكرة "${id}" مغلقة — يرجى إنشاء تذكرة جديدة`,
  },

  // ─── Releases ─────────────────────────────────────────────────────────
  RELEASE_NOT_FOUND: {
    en: (id: string) => `Release ${id} not found`,
    ar: (id: string) => `الإصدار ${id} غير موجود`,
  },
  RELEASE_VERSION_EXISTS: {
    en: (v: string) => `Release version "${v}" already exists`,
    ar: (v: string) => `إصدار النسخة "${v}" موجود بالفعل`,
  },
  RELEASE_INVALID_VERSION: {
    en: (v: string) => `Invalid version format "${v}" — expected X.Y.Z`,
    ar: (v: string) => `صيغة الإصدار غير صحيحة "${v}" — يُتوقع X.Y.Z`,
  },

  // ─── Partners ─────────────────────────────────────────────────────────
  PARTNER_NOT_FOUND: {
    en: (id: string) => `Partner ${id} not found`,
    ar: (id: string) => `الشريك ${id} غير موجود`,
  },
  PARTNER_EMAIL_EXISTS: {
    en: (email: string) => `A partner with email "${email}" already exists`,
    ar: (email: string) => `يوجد شريك بالبريد الإلكتروني "${email}" بالفعل`,
  },
  PARTNER_CONTACT_NOT_FOUND: {
    en: (id: string) => `Partner contact ${id} not found`,
    ar: (id: string) => `جهة اتصال الشريك ${id} غير موجودة`,
  },

  // ─── Activities ─────────────────────────────────────────────────────────
  ACTIVITY_NOT_FOUND: {
    en: (id: string) => `Activity "${id}" not found`,
    ar: (id: string) => `النشاط "${id}" غير موجود`,
  },
  ACTIVITY_ALREADY_DONE: {
    en: (id: string) =>
      `Activity "${id}" is already marked as done — completed activities cannot be modified`,
    ar: (id: string) => `النشاط "${id}" مكتمل بالفعل — لا يمكن تعديل الأنشطة المكتملة`,
  },

  // ─── Email Templates ──────────────────────────────────────────────────
  EMAIL_TEMPLATE_NOT_FOUND: {
    en: (id: string) => `Email template "${id}" not found`,
    ar: (id: string) => `قالب البريد الإلكتروني "${id}" غير موجود`,
  },
  EMAIL_TEMPLATE_INACTIVE: {
    en: (name: string) => `Email template "${name}" is inactive — activate it before sending`,
    ar: (name: string) => `قالب البريد الإلكتروني "${name}" غير نشط — قم بتفعيله قبل الإرسال`,
  },

  // ─── Bank Statements ──────────────────────────────────────────────────
  BANK_STATEMENT_NOT_FOUND: {
    en: (id: string) => `Bank statement "${id}" not found`,
    ar: (id: string) => `كشف الحساب البنكي "${id}" غير موجود`,
  },
  BANK_STATEMENT_NOT_OPEN: {
    en: (id: string, status: string) =>
      `Bank statement "${id}" cannot be modified — current status is "${status}"`,
    ar: (id: string, status: string) =>
      `كشف الحساب البنكي "${id}" لا يمكن تعديله — الحالة الحالية هي "${status}"`,
  },
  BANK_STATEMENT_LINE_NOT_FOUND: {
    en: (id: string) => `Bank statement line "${id}" not found`,
    ar: (id: string) => `سطر كشف الحساب البنكي "${id}" غير موجود`,
  },
  BANK_STATEMENT_LINE_RECONCILED: {
    en: (id: string) =>
      `Bank statement line "${id}" is already reconciled — unmatch it first before deleting`,
    ar: (id: string) =>
      `سطر كشف الحساب البنكي "${id}" تمت مطابقته — قم بإلغاء المطابقة أولاً قبل الحذف`,
  },
  BANK_STATEMENT_LINE_NOT_RECONCILED: {
    en: (id: string) =>
      `Bank statement line "${id}" is not reconciled — cannot unmatch a line that is not matched`,
    ar: (id: string) =>
      `سطر كشف الحساب البنكي "${id}" غير مطابق — لا يمكن إلغاء مطابقة سطر غير مطابق`,
  },
  BANK_STATEMENT_IMPORT_EMPTY: {
    en: (id: string) =>
      `CSV file for statement "${id}" contains no valid data rows — check the file format`,
    ar: (id: string) =>
      `ملف CSV لكشف الحساب "${id}" لا يحتوي على بيانات صالحة — تحقق من تنسيق الملف`,
  },
  // ─── Invoices & Payments ──────────────────────────────────────────────
  INVOICE_DRAFT_ONLY_EDIT: {
    en: () => `Only draft invoices can be edited — post or cancel to modify`,
    ar: () => `يمكن تعديل الفواتير المسودة فقط — قم بالترحيل أو الإلغاء للتعديل`,
  },
  INVOICE_DRAFT_ONLY_DELETE: {
    en: () => `Only draft invoices can be deleted`,
    ar: () => `يمكن حذف الفواتير المسودة فقط`,
  },
  INVOICE_NO_LINES: {
    en: (id: string) => `Invoice "${id}" has no lines — add at least one line before posting`,
    ar: (id: string) =>
      `الفاتورة "${id}" لا تحتوي على بنود — أضف بنداً واحداً على الأقل قبل الترحيل`,
  },
  INVOICE_HAS_PAYMENTS: {
    en: (id: string) =>
      `Invoice "${id}" has linked payments and cannot be cancelled — reverse the payments first`,
    ar: (id: string) =>
      `الفاتورة "${id}" مرتبطة بمدفوعات ولا يمكن إلغاؤها — قم بعكس المدفوعات أولاً`,
  },
  INVOICE_NOT_POSTED: {
    en: (id: string) => `Invoice "${id}" must be posted before registering a payment`,
    ar: (id: string) => `يجب ترحيل الفاتورة "${id}" قبل تسجيل دفعة`,
  },
  INVOICE_PAYMENT_EXCEEDS_RESIDUAL: {
    en: (amount: number, residual: number) =>
      `Payment amount (${amount}) exceeds the remaining balance (${residual})`,
    ar: (amount: number, residual: number) =>
      `مبلغ الدفعة (${amount}) يتجاوز الرصيد المتبقي (${residual})`,
  },

  // ─── Fiscal Positions ───────────────────────────────────────────────
  FISCAL_POSITION_NOT_FOUND: {
    en: (id: string) => `Fiscal position "${id}" not found`,
    ar: (id: string) => `الوضع المالي "${id}" غير موجود`,
  },

  // ─── CRM Stages ─────────────────────────────────────────────────────
  CRM_STAGE_NOT_FOUND: {
    en: (id: string) => `CRM stage "${id}" not found`,
    ar: (id: string) => `مرحلة CRM "${id}" غير موجودة`,
  },

  // ─── Company Settings ───────────────────────────────────────────────
  COMPANY_SETTINGS_NOT_FOUND: {
    en: (tenantId: string) => `Company settings not found for tenant "${tenantId}"`,
    ar: (tenantId: string) => `إعدادات الشركة غير موجودة للمستأجر "${tenantId}"`,
  },

  // ─── POS Partners / Variants ──────────────────────────────────────────
  VARIANT_NOT_FOUND: {
    en: (id: string) => `Product variant "${id}" not found`,
    ar: (id: string) => `متغير المنتج "${id}" غير موجود`,
  },
  VARIANT_REQUIRED: {
    en: (productName: string) => `Product "${productName}" has variants — variantId is required`,
    ar: (productName: string) => `المنتج "${productName}" لديه متغيرات — معرف المتغير مطلوب`,
  },
  VARIANT_PRODUCT_MISMATCH: {
    en: (variantId: string, productId: string) =>
      `Variant "${variantId}" does not belong to product "${productId}"`,
    ar: (variantId: string, productId: string) =>
      `المتغير "${variantId}" لا ينتمي إلى المنتج "${productId}"`,
  },
  INVOICE_CREATION_FAILED: {
    en: (orderId: string) => `Failed to create invoice for POS order "${orderId}"`,
    ar: (orderId: string) => `فشل إنشاء الفاتورة لطلب نقطة البيع "${orderId}"`,
  },
  PARTNER_INACTIVE: {
    en: (id: string) =>
      `Partner "${id}" is inactive — cannot create invoices for inactive partners`,
    ar: (id: string) => `الشريك "${id}" غير نشط — لا يمكن إنشاء فواتير لشركاء غير نشطين`,
  },
  DUPLICATE_VENDOR_BILL: {
    en: (partnerId: string, reference: string, date: string) =>
      `A vendor bill already exists for partner "${partnerId}" with reference "${reference}" on date "${date}"`,
    ar: (partnerId: string, reference: string, date: string) =>
      `فاتورة مورد موجودة بالفعل للشريك "${partnerId}" بالمرجع "${reference}" بتاريخ "${date}"`,
  },
  ORIGINAL_INVOICE_NOT_FOUND: {
    en: (id: string) =>
      `Original invoice "${id}" not found — credit note must reference a valid invoice`,
    ar: (id: string) =>
      `الفاتورة الأصلية "${id}" غير موجودة — يجب أن تشير الإشعارة الدائنة إلى فاتورة صالحة`,
  },
  CREDIT_NOTE_EXCEEDS_ORIGINAL: {
    en: (creditAmount: number, originalAmount: number) =>
      `Credit note amount (${creditAmount}) exceeds original invoice amount (${originalAmount})`,
    ar: (creditAmount: number, originalAmount: number) =>
      `مبلغ الإشعارة الدائنة (${creditAmount}) يتجاوز مبلغ الفاتورة الأصلية (${originalAmount})`,
  },
  RECEIPT_QTY_EXCEEDS_DEMAND: {
    en: (qtyDone: number, qtyDemand: number, productId: string) =>
      `Received quantity (${qtyDone}) exceeds demanded quantity (${qtyDemand}) for product "${productId}"`,
    ar: (qtyDone: number, qtyDemand: number, productId: string) =>
      `الكمية المستلمة (${qtyDone}) تتجاوز الكمية المطلوبة (${qtyDemand}) للمنتج "${productId}"`,
  },
} as const;
