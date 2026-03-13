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
