import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

interface ReleaseChange {
  category: 'feature' | 'improvement' | 'fix' | 'breaking';
  text: { en: string; ar: string };
}

interface TourStep {
  target: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface ReleaseDef {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'hotfix';
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  changes: ReleaseChange[];
  tour: TourStep[] | null;
  isPublished: boolean;
}

const releases: ReleaseDef[] = [
  {
    version: '1.0.0',
    date: '2025-06-01',
    type: 'major',
    titleEn: 'Initial Release',
    titleAr: 'الإصدار الأول',
    descriptionEn: 'First production release of the Tatweer ERP system with core modules.',
    descriptionAr: 'أول إصدار إنتاجي لنظام تطوير ERP مع الوحدات الأساسية.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'POS module with multi-branch support',
          ar: 'وحدة نقاط البيع مع دعم الفروع المتعددة',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Inventory management with stock tracking',
          ar: 'إدارة المخزون مع تتبع المخزون',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'HR module with attendance and payroll',
          ar: 'وحدة الموارد البشرية مع الحضور والرواتب',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Accounting module with chart of accounts',
          ar: 'وحدة المحاسبة مع شجرة الحسابات',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'CRM with lead and sales order management',
          ar: 'إدارة علاقات العملاء مع إدارة العملاء المحتملين وأوامر البيع',
        },
      },
    ],
    tour: [
      {
        target: '#sidebar-dashboard',
        title: { en: 'Welcome to Tatweer ERP', ar: 'مرحباً بك في نظام تطوير' },
        description: {
          en: 'This is your dashboard. Get an overview of your business at a glance.',
          ar: 'هذه لوحة التحكم الخاصة بك. احصل على نظرة عامة على أعمالك.',
        },
        placement: 'right',
      },
      {
        target: '#sidebar-pos',
        title: { en: 'Point of Sale', ar: 'نقاط البيع' },
        description: {
          en: 'Manage your sales, sessions, and orders from here.',
          ar: 'قم بإدارة مبيعاتك وجلساتك وطلباتك من هنا.',
        },
        placement: 'right',
      },
    ],
    isPublished: true,
  },
  {
    version: '1.1.0',
    date: '2025-07-15',
    type: 'minor',
    titleEn: 'Loyalty & Vouchers',
    titleAr: 'الولاء والقسائم',
    descriptionEn: 'Introducing the loyalty points program and gift card/voucher support.',
    descriptionAr: 'تقديم برنامج نقاط الولاء ودعم بطاقات الهدايا والقسائم.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'Loyalty points program with configurable earn/redeem rates',
          ar: 'برنامج نقاط الولاء مع معدلات كسب واسترداد قابلة للتعديل',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Gift card management with balance tracking',
          ar: 'إدارة بطاقات الهدايا مع تتبع الرصيد',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Voucher creation and redemption at POS',
          ar: 'إنشاء واسترداد القسائم في نقاط البيع',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'POS checkout flow optimized for faster transactions',
          ar: 'تحسين عملية الدفع في نقاط البيع لمعاملات أسرع',
        },
      },
    ],
    tour: [
      {
        target: '#sidebar-loyalty',
        title: { en: 'Loyalty Program', ar: 'برنامج الولاء' },
        description: {
          en: 'Set up your loyalty program, manage points, and track customer rewards.',
          ar: 'قم بإعداد برنامج الولاء وإدارة النقاط وتتبع مكافآت العملاء.',
        },
        placement: 'right',
      },
    ],
    isPublished: true,
  },
  {
    version: '1.1.1',
    date: '2025-07-22',
    type: 'patch',
    titleEn: 'Bug Fixes',
    titleAr: 'إصلاحات',
    descriptionEn: 'Fixes for reported issues in POS and inventory modules.',
    descriptionAr: 'إصلاحات للمشاكل المبلغ عنها في وحدتي نقاط البيع والمخزون.',
    changes: [
      {
        category: 'fix',
        text: {
          en: 'Fixed POS terminal freezing after 30 minutes of inactivity',
          ar: 'إصلاح تجمد نقطة البيع بعد 30 دقيقة من عدم النشاط',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed negative stock calculation for concurrent sales',
          ar: 'إصلاح حساب المخزون السالب للمبيعات المتزامنة',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed PDF export failing for reports with more than 500 rows',
          ar: 'إصلاح فشل تصدير PDF للتقارير التي تحتوي على أكثر من 500 صف',
        },
      },
    ],
    tour: null,
    isPublished: true,
  },
  {
    version: '1.2.0',
    date: '2025-08-20',
    type: 'minor',
    titleEn: 'Restaurant Module',
    titleAr: 'وحدة المطاعم',
    descriptionEn:
      'Full restaurant management with kitchen display, table management, and modifiers.',
    descriptionAr: 'إدارة مطاعم كاملة مع شاشة المطبخ وإدارة الطاولات والإضافات.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'Kitchen display system with real-time order updates',
          ar: 'نظام شاشة المطبخ مع تحديثات الطلبات الفورية',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Table management with sections and floor plan',
          ar: 'إدارة الطاولات مع الأقسام ومخطط القاعة',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Product modifiers (paid and free add-ons)',
          ar: 'إضافات المنتجات (مدفوعة ومجانية)',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Split bill and table transfer support',
          ar: 'دعم تقسيم الفاتورة ونقل الطاولة',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'Course management for multi-course meals',
          ar: 'إدارة الأطباق للوجبات متعددة الأصناف',
        },
      },
    ],
    tour: [
      {
        target: '#sidebar-restaurant',
        title: { en: 'Restaurant Management', ar: 'إدارة المطاعم' },
        description: {
          en: 'Manage tables, kitchen display, and restaurant-specific settings.',
          ar: 'إدارة الطاولات وشاشة المطبخ وإعدادات المطعم.',
        },
        placement: 'right',
      },
    ],
    isPublished: true,
  },
  {
    version: '1.2.1',
    date: '2025-09-05',
    type: 'hotfix',
    titleEn: 'ZATCA Integration Fix',
    titleAr: 'إصلاح تكامل زاتكا',
    descriptionEn: 'Critical fix for ZATCA e-invoice signing failures.',
    descriptionAr: 'إصلاح حرج لفشل توقيع الفواتير الإلكترونية في زاتكا.',
    changes: [
      {
        category: 'fix',
        text: {
          en: 'Fixed ZATCA certificate renewal causing signing failures',
          ar: 'إصلاح فشل التوقيع بسبب تجديد شهادة زاتكا',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed simplified invoice XML generation for B2C transactions',
          ar: 'إصلاح إنشاء XML للفاتورة المبسطة لمعاملات B2C',
        },
      },
    ],
    tour: null,
    isPublished: true,
  },
  {
    version: '1.3.0',
    date: '2025-10-10',
    type: 'minor',
    titleEn: 'Multi-Currency & Reporting',
    titleAr: 'العملات المتعددة والتقارير',
    descriptionEn: 'Added multi-currency support and enhanced reporting capabilities.',
    descriptionAr: 'إضافة دعم العملات المتعددة وتحسين قدرات التقارير.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'Multi-currency support with automatic exchange rate updates',
          ar: 'دعم العملات المتعددة مع تحديث أسعار الصرف التلقائي',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Custom report builder with Excel and PDF export',
          ar: 'منشئ التقارير المخصصة مع تصدير Excel و PDF',
        },
      },
      {
        category: 'feature',
        text: { en: 'Inventory aging report by warehouse', ar: 'تقرير أعمار المخزون حسب المستودع' },
      },
      {
        category: 'improvement',
        text: {
          en: 'Dashboard widgets now support date range filtering',
          ar: 'أدوات لوحة التحكم تدعم الآن تصفية نطاق التاريخ',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'Optimized report generation for large datasets',
          ar: 'تحسين إنشاء التقارير لمجموعات البيانات الكبيرة',
        },
      },
    ],
    tour: null,
    isPublished: true,
  },
  {
    version: '1.4.0',
    date: '2025-11-15',
    type: 'minor',
    titleEn: 'Project Management',
    titleAr: 'إدارة المشاريع',
    descriptionEn: 'New project management module with tasks, milestones, and time tracking.',
    descriptionAr: 'وحدة إدارة مشاريع جديدة مع المهام والمراحل وتتبع الوقت.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'Project management with milestones and deadlines',
          ar: 'إدارة المشاريع مع المراحل والمواعيد النهائية',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Task assignment with priority and status tracking',
          ar: 'تعيين المهام مع تتبع الأولوية والحالة',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Time tracking per task with billable hours',
          ar: 'تتبع الوقت لكل مهمة مع ساعات قابلة للفوترة',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'Employee self-service portal for leave requests',
          ar: 'بوابة الخدمة الذاتية للموظفين لطلبات الإجازات',
        },
      },
    ],
    tour: [
      {
        target: '#sidebar-projects',
        title: { en: 'Project Management', ar: 'إدارة المشاريع' },
        description: {
          en: 'Create projects, assign tasks, and track progress.',
          ar: 'إنشاء المشاريع وتعيين المهام وتتبع التقدم.',
        },
        placement: 'right',
      },
    ],
    isPublished: true,
  },
  {
    version: '1.4.1',
    date: '2025-12-01',
    type: 'patch',
    titleEn: 'Payroll & Attendance Fixes',
    titleAr: 'إصلاحات الرواتب والحضور',
    descriptionEn: 'Fixes for payroll calculation and attendance import issues.',
    descriptionAr: 'إصلاحات لحساب الرواتب ومشاكل استيراد الحضور.',
    changes: [
      {
        category: 'fix',
        text: {
          en: 'Fixed overtime calculation using 1x rate instead of 1.5x',
          ar: 'إصلاح حساب العمل الإضافي باستخدام معدل 1x بدلاً من 1.5x',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed attendance import from fingerprint device files',
          ar: 'إصلاح استيراد الحضور من ملفات أجهزة البصمة',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed GOSI calculation for Saudi employees',
          ar: 'إصلاح حساب التأمينات الاجتماعية للموظفين السعوديين',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'Leave deduction now shown as a separate line in payslip',
          ar: 'خصم الإجازات يظهر الآن كبند منفصل في كشف الراتب',
        },
      },
    ],
    tour: null,
    isPublished: true,
  },
  {
    version: '2.0.0',
    date: '2026-01-15',
    type: 'major',
    titleEn: 'Platform Upgrade',
    titleAr: 'ترقية المنصة',
    descriptionEn:
      'Major platform upgrade with new UI, performance improvements, and breaking API changes.',
    descriptionAr: 'ترقية كبرى للمنصة مع واجهة جديدة وتحسينات أداء وتغييرات في الواجهة البرمجية.',
    changes: [
      {
        category: 'breaking',
        text: {
          en: 'API v1 endpoints deprecated — migrate to v2 by March 2026',
          ar: 'واجهات v1 مهملة — الترحيل إلى v2 بحلول مارس 2026',
        },
      },
      {
        category: 'breaking',
        text: {
          en: 'Minimum browser version updated: Chrome 90+, Safari 15+',
          ar: 'تحديث الحد الأدنى لإصدار المتصفح: Chrome 90+ ، Safari 15+',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Completely redesigned dashboard with customizable widgets',
          ar: 'لوحة تحكم معاد تصميمها بالكامل مع أدوات قابلة للتخصيص',
        },
      },
      {
        category: 'feature',
        text: { en: 'Real-time notifications via WebSocket', ar: 'إشعارات فورية عبر WebSocket' },
      },
      {
        category: 'improvement',
        text: { en: 'Page load time reduced by 40%', ar: 'تقليل وقت تحميل الصفحة بنسبة 40%' },
      },
      {
        category: 'improvement',
        text: {
          en: 'Mobile-responsive layout for all modules',
          ar: 'تصميم متجاوب للهاتف لجميع الوحدات',
        },
      },
    ],
    tour: [
      {
        target: '#new-dashboard',
        title: { en: 'New Dashboard', ar: 'لوحة التحكم الجديدة' },
        description: {
          en: 'Your dashboard has been redesigned. Drag and drop widgets to customize your view.',
          ar: 'تم إعادة تصميم لوحة التحكم. اسحب وأفلت الأدوات لتخصيص عرضك.',
        },
        placement: 'bottom',
      },
      {
        target: '#notification-bell',
        title: { en: 'Real-time Notifications', ar: 'الإشعارات الفورية' },
        description: {
          en: 'You now receive instant notifications for important events.',
          ar: 'ستتلقى الآن إشعارات فورية للأحداث المهمة.',
        },
        placement: 'bottom',
      },
    ],
    isPublished: true,
  },
  {
    version: '2.0.1',
    date: '2026-02-01',
    type: 'patch',
    titleEn: 'Post-Upgrade Fixes',
    titleAr: 'إصلاحات ما بعد الترقية',
    descriptionEn: 'Quick fixes for issues reported after the v2.0.0 upgrade.',
    descriptionAr: 'إصلاحات سريعة للمشاكل المبلغ عنها بعد ترقية الإصدار 2.0.0.',
    changes: [
      {
        category: 'fix',
        text: {
          en: 'Fixed dashboard widgets not saving layout on refresh',
          ar: 'إصلاح عدم حفظ ترتيب أدوات لوحة التحكم عند التحديث',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed RTL layout issues in the new notification panel',
          ar: 'إصلاح مشاكل التصميم من اليمين لليسار في لوحة الإشعارات الجديدة',
        },
      },
      {
        category: 'fix',
        text: {
          en: 'Fixed scheduled report emails not being delivered',
          ar: 'إصلاح عدم تسليم رسائل التقارير المجدولة',
        },
      },
    ],
    tour: null,
    isPublished: true,
  },
  {
    version: '2.1.0',
    date: '2026-03-01',
    type: 'minor',
    titleEn: 'Support Tickets & Chat',
    titleAr: 'تذاكر الدعم والمحادثات',
    descriptionEn: 'Built-in support ticket system and internal team chat.',
    descriptionAr: 'نظام تذاكر الدعم المدمج والمحادثات الداخلية للفريق.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'Support ticket system with priority and SLA tracking',
          ar: 'نظام تذاكر الدعم مع تتبع الأولوية واتفاقيات مستوى الخدمة',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Internal team chat with file sharing',
          ar: 'محادثات الفريق الداخلية مع مشاركة الملفات',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Release notes viewer with guided tours',
          ar: 'عارض ملاحظات الإصدار مع الجولات الإرشادية',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'Bulk actions for inventory adjustments',
          ar: 'إجراءات جماعية لتعديلات المخزون',
        },
      },
    ],
    tour: [
      {
        target: '#sidebar-support',
        title: { en: 'Support Tickets', ar: 'تذاكر الدعم' },
        description: {
          en: 'Submit and track support tickets directly from the app.',
          ar: 'أرسل وتابع تذاكر الدعم مباشرة من التطبيق.',
        },
        placement: 'right',
      },
      {
        target: '#sidebar-chat',
        title: { en: 'Team Chat', ar: 'محادثات الفريق' },
        description: {
          en: 'Chat with your team members in real-time.',
          ar: 'تحدث مع أعضاء فريقك في الوقت الفعلي.',
        },
        placement: 'right',
      },
    ],
    isPublished: true,
  },
  {
    version: '2.2.0',
    date: '2026-04-01',
    type: 'minor',
    titleEn: 'Advanced Analytics',
    titleAr: 'التحليلات المتقدمة',
    descriptionEn: 'New analytics dashboard with predictive insights and trend analysis.',
    descriptionAr: 'لوحة تحليلات جديدة مع رؤى تنبؤية وتحليل الاتجاهات.',
    changes: [
      {
        category: 'feature',
        text: {
          en: 'Predictive sales forecasting using historical data',
          ar: 'التنبؤ بالمبيعات باستخدام البيانات التاريخية',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Customer segmentation and behavior analysis',
          ar: 'تقسيم العملاء وتحليل السلوك',
        },
      },
      {
        category: 'feature',
        text: {
          en: 'Automated low-stock alerts with reorder suggestions',
          ar: 'تنبيهات نقص المخزون التلقائية مع اقتراحات إعادة الطلب',
        },
      },
      {
        category: 'improvement',
        text: {
          en: 'Report scheduler now supports weekly frequency',
          ar: 'جدولة التقارير تدعم الآن التكرار الأسبوعي',
        },
      },
    ],
    tour: null,
    isPublished: false,
  },
];

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();

  const rows = releases.map((r) => ({
    id: uuidv7(),
    version: r.version,
    date: r.date,
    type: r.type,
    titleEn: r.titleEn,
    titleAr: r.titleAr,
    descriptionEn: r.descriptionEn,
    descriptionAr: r.descriptionAr,
    changes: JSON.stringify(r.changes),
    tour: r.tour ? JSON.stringify(r.tour) : null,
    isPublished: r.isPublished,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(r.date),
    updatedAt: new Date(r.date),
    deletedAt: null,
  }));

  await qi.bulkInsert('releases', rows);

  console.log(`[17-releases] Seeded ${rows.length} releases.`);
}
