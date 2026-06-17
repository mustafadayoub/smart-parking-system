export type DiagramCategory = 'behavioral' | 'structural' | 'data-flow' | 'scenario'

export type DiagramItem = {
  id: string
  title: string
  shortTitle: string
  category: DiagramCategory
  kind: 'svg' | 'scenario'
  filename?: string
  scenarioId?: string
  description: string
  keyPoints: string[]
}

export const categoryLabels: Record<DiagramCategory, string> = {
  behavioral: 'سلوكي',
  structural: 'هيكلي',
  'data-flow': 'تدفق بيانات',
  scenario: 'سيناريو',
}

export const diagrams: DiagramItem[] = [
  {
    id: 'bfd',
    title: 'مخطط التحليل الوظيفي (BFD)',
    shortTitle: '1. BFD',
    category: 'structural',
    kind: 'svg',
    filename: 'bfd.svg',
    description:
      'يُقسّم مخطط BFD نظام المواقف الذكي إلى وحدات وظيفية رئيسية: إدارة الحجوزات، معالجة بيانات المستشعرات، إدارة الدفع، وإصدار التقارير. يوضّح العلاقة بين طبقة العرض (React)، طبقة API (FastAPI)، قواعد البيانات، Redis، وCelery.',
    keyPoints: [
      'فصل واضح بين واجهة المستخدم والخدمات الخلفية.',
      'PostgreSQL للتخزين الدائم وRedis للرسائل اللحظية.',
      'Celery للمعالجة غير المتزامنة والتقارير المجدولة.',
    ],
  },
  {
    id: 'dfd-context',
    title: 'مخطط السياق (DFD — Context Diagram)',
    shortTitle: '2. DFD السياق',
    category: 'data-flow',
    kind: 'svg',
    filename: 'dfd-context.svg',
    description:
      'يضع النظام كعملية واحدة محاطة بكيانات خارجية: السائق، الإدارة، مستشعرات IoT، وبوابة الدفع. يحدّد تدفقات البيانات عبر حدود النظام.',
    keyPoints: [
      'السائق يرسل طلبات الحجز ويستقبل التأكيدات.',
      'الإدارة تستقبل التقارير وتنبيهات الأعطال.',
      'المستشعرات ترسل حالات الإشغال.',
      'بوابة الدفع تتبادل تأكيدات الدفع والاسترداد.',
    ],
  },
  {
    id: 'dfd-level-0',
    title: 'مخطط تدفق البيانات — المستوى 0 (DFD Level 0)',
    shortTitle: '3. DFD L0',
    category: 'data-flow',
    kind: 'svg',
    filename: 'dfd-level-0.svg',
    description:
      'يُفصّل العملية الرئيسية إلى: إدارة الحجوزات، معالجة الدفع، معالجة المستشعرات، وإصدار التقارير. يظهر مخازن البيانات D1–D5.',
    keyPoints: [
      'D1: المستخدمون — D2: المواقف — D3: الحجوزات.',
      'D4: سجلات المستشعرات — D5: معاملات الدفع.',
      'كل عملية مرتبطة بمخازن البيانات ذات الصلة.',
    ],
  },
  {
    id: 'dfd-level-1-1',
    title: 'مخطط تدفق البيانات — المستوى 1-1 (DFD Level 1-1)',
    shortTitle: '4. DFD L1-1',
    category: 'data-flow',
    kind: 'svg',
    filename: 'dfd-level-1-1.svg',
    description:
      'تفصيل عملية إدارة الحجوزات (1.0) إلى: التحقق من التوفر (1.1)، إنشاء الحجز (1.2)، وإرسال التأكيد (1.3). يوضّح التفاعل مع مخازن المواقف والحجوزات.',
    keyPoints: [
      'التحقق من عدم تعارض الحجوزات.',
      'تحديث حالة الموقف إلى RESERVED.',
      'إطلاق إشعار تأكيد عبر Celery/WebSocket.',
    ],
  },
  {
    id: 'dfd-level-1-2',
    title: 'مخطط تدفق البيانات — المستوى 1-2 (DFD Level 1-2)',
    shortTitle: '5. DFD L1-2',
    category: 'data-flow',
    kind: 'svg',
    filename: 'dfd-level-1-2.svg',
    description:
      'تفصيل عملية معالجة الدفع (3.0): استقبال بيانات الدفع (3.1)، التحقق (3.2)، التأكد من توفر المبلغ (3.3)، وإرسال إشعار العملية (3.4) مع التسجيل في D1 سجل المدفوعات.',
    keyPoints: [
      'تكامل مع بوابة الدفع الإلكتروني.',
      'تسجيل كل معاملة في payment_transactions.',
      'إشعار السائق والإدارة بنتيجة الدفع.',
    ],
  },
  {
    id: 'use-cases',
    title: 'مخطط حالات الاستخدام (Use Cases Diagram)',
    shortTitle: '6. Use Cases',
    category: 'behavioral',
    kind: 'svg',
    filename: 'use-cases.svg',
    description:
      'يحدّد الفاعلين الأربعة (السائق، الإدارة، المستشعرات، بوابة الدفع) وجميع حالات الاستخدام مع علاقات include وextend.',
    keyPoints: [
      'السائق: تسجيل، عرض، حجز، إلغاء.',
      'الإدارة: مستخدمين، إشغال، تقارير، تحديث مواقف.',
      'المستشعرات: قراءة وتحديث الحالة وتنبيهات الأعطال.',
      'الدفع: استقبال، تحقق، وإشعارات.',
    ],
  },
  {
    id: 'scenario-01',
    title: 'سيناريو حالة الاستخدام 1 (Use Case Scenario 1)',
    shortTitle: '7. Scenario UC-01',
    category: 'scenario',
    kind: 'scenario',
    scenarioId: 'uc-01',
    description:
      'الوصف التفصيلي لحالة الاستخدام UC-01 «حجز موقف»: المتطلبات المسبقة، التدفق الطبيعي، البدائل، الاستثناءات، والعلاقات include/extend — كما ورد في وثيقة المشروع.',
    keyPoints: [
      'Use Case ID: UC-01 — حجز موقف.',
      'يشمل الدفع الإلكتروني وتأكيد الحجز.',
      'يرتبط بمخطط النشاط Case 1.',
    ],
  },
  {
    id: 'activity-case-01',
    title: 'مخطط النشاط — الحالة 1 (Activity Diagram — Case 1)',
    shortTitle: '8. Activity Case 1',
    category: 'behavioral',
    kind: 'svg',
    filename: 'activity-case-01.svg',
    description:
      'يمثّل سير عمل الحجز والدفع عبر مسارات: السائق، النظام، بوابة الدفع، وأجهزة الاستشعار. يشمل التحقق من الحساب، اختيار الموقف، الدفع، وتحديث الحالة.',
    keyPoints: [
      'مسارات (Swimlanes) لأربعة فاعلين.',
      'قرارات: توفر الموقف، صحة الدفع.',
      'تحديث الموقف إلى محجوز بعد الدفع الناجح.',
    ],
  },
  {
    id: 'scenario-02',
    title: 'سيناريو حالة الاستخدام 2 (Use Case Scenario 2)',
    shortTitle: '9. Scenario UC-02',
    category: 'scenario',
    kind: 'scenario',
    scenarioId: 'uc-02',
    description:
      'الوصف التفصيلي لحالة الاستخدام UC-02 «إلغاء الحجز»: الشروط، التدفق الطبيعي، سياسة الاسترداد، والنتائج المتوقعة بعد الإلغاء.',
    keyPoints: [
      'Use Case ID: UC-02 — إلغاء الحجز.',
      'يُمدّد باسترداد المبلغ عند تحقق الشروط.',
      'يرتبط بمخطط النشاط Case 2.',
    ],
  },
  {
    id: 'activity-case-02',
    title: 'مخطط النشاط — الحالة 2 (Activity Diagram — Case 2)',
    shortTitle: '10. Activity Case 2',
    category: 'behavioral',
    kind: 'svg',
    filename: 'activity-case-02.svg',
    description:
      'يمثّل مسار إلغاء الحجز: التحقق من إمكانية الإلغاء، تطبيق سياسة الاسترداد، معالجة الدفع العكسي، تحرير الموقف، وإرسال الإشعار.',
    keyPoints: [
      'قرار: هل يمكن الإلغاء؟',
      'قرار: هل يوجد مبلغ مسترد؟',
      'تحديث المستشعر/الموقف إلى «متاح».',
    ],
  },
  {
    id: 'class-diagram',
    title: 'مخطط الأصناف (Class Diagram)',
    shortTitle: '11. Class Diagram',
    category: 'structural',
    kind: 'svg',
    filename: 'class-diagram.svg',
    description:
      'يعرض الكيانات: Admin، Driver، ParkingSpot، Reservation، Sensor، Report — مع الخصائص والعمليات والعلاقات (1..*، 1..1) بينها.',
    keyPoints: [
      'Driver ينشئ Reservation.',
      'Sensor يحدّث ParkingSpot.',
      'Admin يولّد Report من الحجوزات والمواقف.',
      'Reservation يرتبط بـ ParkingSpot.',
    ],
  },
]
