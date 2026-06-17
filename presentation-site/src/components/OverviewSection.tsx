import { motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  CalendarCheck,
  CreditCard,
  Radio,
  Shield,
  Wifi,
} from 'lucide-react'

const features = [
  {
    icon: Radio,
    title: 'تتبع المواقف لحظياً',
    description:
      'مستشعرات IoT ترسل حالات الإشغال عبر webhook مؤمَّن. التحديثات تنتشر عبر Redis Pub/Sub إلى عملاء WebSocket في أجزاء من الثانية.',
  },
  {
    icon: CalendarCheck,
    title: 'حجز ذكي',
    description:
      'حجز خالٍ من التعارض مع أرقام حجز مقروءة، تسجيل لوحة المركبة، وإدارة تلقائية لحالة الموقف.',
  },
  {
    icon: CreditCard,
    title: 'دفع متكامل',
    description:
      'بوابة دفع وهمية مع سجل معاملات، تأكيد webhook، تطبيق سياسة الاسترداد، وإيصالات رقمية.',
  },
  {
    icon: BarChart3,
    title: 'تقارير الإدارة',
    description:
      'تحليلات إشغال ومؤشرات مالية مقيدة بالدور، تُجمَع بواسطة Celery Beat لدعم القرارات التشغيلية.',
  },
  {
    icon: Bell,
    title: 'تنبيهات الأعطال',
    description:
      'قراءات FAULT من المستشعرات تنشئ تنبيهات أعطال وتُبثّ إلى لوحة الإدارة دون التأثير على توفر الموقف.',
  },
  {
    icon: Shield,
    title: 'آمن وقابل للتوسع',
    description:
      'مصادقة JWT، RBAC، ingest محمي بمفتاح API، وخدمات مصغّرة عبر Docker Compose.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
}

export function OverviewSection() {
  return (
    <section id="overview" className="section-padding border-t border-white/5">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
            نظرة عامة على النظام
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
            حلّ مشكلة إهدار الوقت في البحث عن مواقف في المدن
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            يُضيّع السائقون وقتاً طويلاً في البحث عن مواقف متاحة. يجمع نظام المواقف الذكي
            بين بيانات المستشعرات اللحظية، الحجز الإلكتروني مع الدفع، وتحليلات الإدارة في
            منصة موحّدة. العمال الخلفيون يعالجون المهام الثقيلة بشكل غير متزامن، مما يحافظ
            على استجابة الـ API تحت الضغط.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={fadeUp}
              className="glass-panel group p-6 transition hover:border-brand-500/30 hover:bg-white/[0.07]"
            >
              <div className="mb-4 inline-flex rounded-xl bg-brand-500/15 p-3 text-brand-300 transition group-hover:bg-brand-500/25">
                <feature.icon size={22} />
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-6 py-4"
        >
          <Wifi className="shrink-0 text-cyan-400" size={20} />
          <p className="text-sm text-slate-300">
            <strong className="text-white">تحديثات حية:</strong> العملاء المتصلون يستقبلون
            تغييرات حالة المواقف، إيصالات الدفع، تأكيدات الإلغاء، وتنبيهات الأعطال عبر
            قناة WebSocket دائمة.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
