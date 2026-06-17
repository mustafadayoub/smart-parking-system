# موقع العرض التقديمي — نظام المواقف الذكي

موقع SPA للعرض الجامعي والتوثيق التقني (باللغة العربية).

## التشغيل

```bash
cd presentation-site
npm install
npm run dev
```

افتح **http://localhost:5173**

## البناء للإنتاج

```bash
npm run build
npm run preview
```

## المخططات

ملفات SVG الحقيقية موجودة في `public/diagrams/`:

| الملف | المخطط |
|-------|--------|
| `use-case.svg` | حالات الاستخدام |
| `activity-case-01.svg` | مخطط النشاط UC-01 |
| `activity-case-02.svg` | مخطط النشاط UC-02 |
| `bfd.svg` | مخطط تدفق الكتل |
| `dfd-context.svg` | DFD السياق |
| `dfd-level-0.svg` | DFD المستوى 0 |
| `dfd-level-1.svg` | DFD المستوى 1 |

## التقنيات

React · Vite · TypeScript · Tailwind CSS · Framer Motion · Lucide React
