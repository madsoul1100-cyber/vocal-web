import { Link, NavLink, Outlet } from 'react-router-dom'
import { CitizenSessionProvider, useCitizenSession } from './session'

const NAV = {
  te: { home: 'హోమ్', file: 'ఫిర్యాదు', cases: 'నా కేసులు', track: 'స్థితి', dash: 'డాష్‌బోర్డ్', feed: 'వార్తలు', in: 'లాగిన్', out: 'బయటకు' },
  en: { home: 'Home', file: 'File', cases: 'My cases', track: 'Status', dash: 'Dashboard', feed: 'Feed', in: 'Sign in', out: 'Sign out' },
}

function Shell() {
  const { lang, setLang, token, signOut } = useCitizenSession()
  const t = NAV[lang]
  const link = 'text-sm px-2 py-1 rounded-md'
  return (
    <div className="min-h-full" style={{ background: 'var(--canvas-bg)', color: 'var(--canvas-text)', fontFamily: "'Noto Sans Telugu', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-20" style={{ background: 'var(--canvas-surface)', borderBottom: '1px solid var(--canvas-border)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
          <Link to="/bharosa" className="font-semibold text-sm mr-2">Bharosa</Link>
          <NavLink to="/bharosa" end className={link}>{t.home}</NavLink>
          <NavLink to="/bharosa/new" className={link}>{t.file}</NavLink>
          <NavLink to="/bharosa/cases" className={link}>{t.cases}</NavLink>
          <NavLink to="/bharosa/status" className={link}>{t.track}</NavLink>
          <NavLink to="/bharosa/dashboard" className={link}>{t.dash}</NavLink>
          <NavLink to="/bharosa/feed" className={link}>{t.feed}</NavLink>
          <span className="ml-auto flex items-center gap-2">
            <button type="button" className="text-xs rounded-full px-2 py-1" style={{ border: '1px solid var(--canvas-border)' }} onClick={() => setLang(lang === 'te' ? 'en' : 'te')}>
              {lang === 'te' ? 'English' : 'తెలుగు'}
            </button>
            {token ? (
              <button type="button" className="text-xs" style={{ color: 'var(--canvas-muted)' }} onClick={signOut}>{t.out}</button>
            ) : (
              <Link to="/bharosa/login" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>{t.in}</Link>
            )}
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export function CitizenLayout() {
  return (
    <CitizenSessionProvider>
      <Shell />
    </CitizenSessionProvider>
  )
}
