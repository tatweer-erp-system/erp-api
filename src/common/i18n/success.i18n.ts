export const SuccessMessages = {
  // ─── Users ────────────────────────────────────────────────────────────
  PASSWORD_CHANGED: {
    en: () => `Password changed successfully`,
    ar: () => `تم تغيير كلمة المرور بنجاح`,
  },
  ERASURE_SUBMITTED: {
    en: () => `Erasure request submitted successfully`,
    ar: () => `تم تقديم طلب الحذف بنجاح`,
  },
  CONSENT_RECORDED: {
    en: () => `Consent recorded successfully`,
    ar: () => `تم تسجيل الموافقة بنجاح`,
  },
  CONSENT_REVOKED: {
    en: () => `Consent revoked successfully`,
    ar: () => `تم إلغاء الموافقة بنجاح`,
  },
  SESSIONS_REVOKED: {
    en: () => `All user sessions have been revoked`,
    ar: () => `تم إلغاء جميع جلسات المستخدم`,
  },

  // ─── Chat ─────────────────────────────────────────────────────────────
  REACTION_ADDED: {
    en: () => `Reaction added`,
    ar: () => `تمت إضافة التفاعل`,
  },
  REACTION_REMOVED: {
    en: () => `Reaction removed`,
    ar: () => `تمت إزالة التفاعل`,
  },
  CONVERSATION_READ: {
    en: () => `Conversation marked as read`,
    ar: () => `تم تحديد المحادثة كمقروءة`,
  },

  // ─── Notifications ────────────────────────────────────────────────────
  NOTIFICATION_DISPATCHED: {
    en: () => `Notification dispatched successfully`,
    ar: () => `تم إرسال الإشعار بنجاح`,
  },
  NOTIFICATION_READ: {
    en: () => `Notification marked as read`,
    ar: () => `تم تحديد الإشعار كمقروء`,
  },
  ALL_NOTIFICATIONS_READ: {
    en: () => `All notifications marked as read`,
    ar: () => `تم تحديد جميع الإشعارات كمقروءة`,
  },
  NOTIFICATION_DELETED: {
    en: () => `Notification deleted`,
    ar: () => `تم حذف الإشعار`,
  },
  TEMPLATE_DELETED: {
    en: () => `Template deleted`,
    ar: () => `تم حذف القالب`,
  },
  TEMPLATES_SEEDED: {
    en: (count: number) => `Seeded ${count} default notification templates`,
    ar: (count: number) => `تم إنشاء ${count} قوالب إشعارات افتراضية`,
  },
  FCM_TOKEN_REGISTERED: {
    en: () => `FCM token registered`,
    ar: () => `تم تسجيل رمز FCM`,
  },
  FCM_TOKEN_UPDATED: {
    en: () => `FCM token updated`,
    ar: () => `تم تحديث رمز FCM`,
  },
  FCM_TOKEN_UNREGISTERED: {
    en: () => `FCM token unregistered`,
    ar: () => `تم إلغاء تسجيل رمز FCM`,
  },
} as const;
