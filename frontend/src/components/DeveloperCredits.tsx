export interface TeamMember {
  name: string
  nameAr: string
  role: string
  roleAr: string
  initials: string
  accent: string
  glow: string
  ring: string
}

export const ENGINEERING_TEAM: TeamMember[] = [
  {
    name: 'Mustafa Al Dayoub',
    nameAr: 'مصطفى الديّوب',
    role: 'Software Engineer',
    roleAr: 'مهندس برمجيات',
    initials: 'MD',
    accent: 'from-cyan-400 via-sky-500 to-blue-600',
    glow: 'shadow-cyan-500/40',
    ring: 'ring-cyan-400/30',
  },
  {
    name: 'Mousa Al Awad',
    nameAr: 'موسى العوض',
    role: 'Software Engineer',
    roleAr: 'مهندس برمجيات',
    initials: 'MA',
    accent: 'from-violet-400 via-purple-500 to-fuchsia-600',
    glow: 'shadow-violet-500/40',
    ring: 'ring-violet-400/30',
  },
]

interface DeveloperCreditsProps {
  variant?: 'hero' | 'footer' | 'compact'
}

export function DeveloperCredits({ variant = 'hero' }: DeveloperCreditsProps) {
  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ENGINEERING_TEAM.map((member) => (
          <span
            key={member.name}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 backdrop-blur-sm"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${member.accent} text-[9px] font-bold text-white`}
            >
              {member.initials}
            </span>
            {member.name}
          </span>
        ))}
      </div>
    )
  }

  if (variant === 'footer') {
    return (
      <div className="mx-auto max-w-4xl">
        <FooterHeader />
        <div className="flex flex-wrap items-stretch justify-center gap-5">
          {ENGINEERING_TEAM.map((member, index) => (
            <DeveloperCard key={member.name} member={member} size="sm" delay={index * 100} />
          ))}
        </div>
        <p className="mt-5 text-center text-[11px] text-slate-600">
          Smart Parking System © {new Date().getFullYear()}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl">
      <HeroHeader />
      <div className="grid gap-5 sm:grid-cols-2">
        {ENGINEERING_TEAM.map((member, index) => (
          <DeveloperCard key={member.name} member={member} size="lg" delay={index * 120} />
        ))}
      </div>
    </div>
  )
}

function HeroHeader() {
  return (
    <div className="team-header mb-6 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-300/90">
          فريق التطوير
        </span>
      </div>
      <h2 className="name-shimmer text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Engineering Team
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Architects of the Smart Parking experience
      </p>
    </div>
  )
}

function FooterHeader() {
  return (
    <div className="mb-5 flex items-center justify-center gap-4">
      <span className="h-px w-20 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-cyan-400/80">
          فريق التطوير
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">Engineering Team</p>
      </div>
      <span className="h-px w-20 bg-gradient-to-l from-transparent via-violet-500/40 to-transparent" />
    </div>
  )
}

function DeveloperCard({
  member,
  size,
  delay = 0,
}: {
  member: TeamMember
  size: 'sm' | 'lg'
  delay?: number
}) {
  const isLarge = size === 'lg'

  return (
    <div
      className="team-card group relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`dev-card-border ${isLarge ? 'dev-card-border-lg' : 'dev-card-border-sm'}`}>
        <div
          className={`dev-card-inner relative overflow-hidden ${
            isLarge ? 'px-5 py-5' : 'px-4 py-3.5'
          }`}
        >
          <div className="dev-card-grid pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
          <div
            className={`dev-card-glow pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${member.accent} blur-2xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-60`}
            aria-hidden
          />

          <div className="relative flex items-start gap-3.5">
            <Avatar member={member} isLarge={isLarge} />

            <div className="min-w-0 flex-1 text-left">
              <p
                className={`dev-name-ar font-semibold leading-snug text-white ${
                  isLarge ? 'text-base' : 'text-sm'
                }`}
                dir="rtl"
              >
                {member.nameAr}
              </p>
              <p
                className={`dev-name-en mt-0.5 truncate bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text font-medium text-transparent ${
                  isLarge ? 'text-sm' : 'text-xs'
                }`}
              >
                {member.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 backdrop-blur-sm ${
                    isLarge ? '' : 'text-[9px]'
                  }`}
                >
                  {member.role}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500 backdrop-blur-sm ${
                    isLarge ? '' : 'text-[9px]'
                  }`}
                  dir="rtl"
                >
                  {member.roleAr}
                </span>
              </div>
            </div>

            {isLarge ? (
              <div className="dev-spark hidden shrink-0 opacity-40 transition-all duration-500 group-hover:opacity-100 sm:block">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                    className="fill-cyan-400/80"
                  />
                </svg>
              </div>
            ) : null}
          </div>

          {isLarge ? (
            <div className="dev-card-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Avatar({ member, isLarge }: { member: TeamMember; isLarge: boolean }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`avatar-ring absolute -inset-1 rounded-2xl bg-gradient-to-br ${member.accent} opacity-40 blur-sm transition-opacity duration-500 group-hover:opacity-70`}
        aria-hidden
      />
      <div
        className={`avatar-pulse relative flex items-center justify-center rounded-xl bg-gradient-to-br ${member.accent} font-bold text-white shadow-lg ${member.glow} ${
          isLarge ? 'h-14 w-14 text-base' : 'h-10 w-10 text-xs'
        }`}
      >
        <span className="relative z-10 drop-shadow-sm">{member.initials}</span>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-white/20" />
      </div>
    </div>
  )
}
