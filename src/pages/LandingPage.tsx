import '@/styles/landing.css'
import { Link } from 'react-router-dom'
import { QRCard } from '@/components/landing/QRCard'
import { tenantApp, tenantParty, tenantBots } from '@/config/tenant.config'

const CITIZEN_BOT_USERNAME = tenantBots.citizen.username
const TELEGRAM_URL = `https://t.me/${CITIZEN_BOT_USERNAME}`
const LOGIN_URL = '/sign-in'
const CONTACT_EMAIL = `mailto:${tenantParty.contactEmail}`

/* ─── Inline SVG icons ─────────────────────────────────────────────────────── */

function IconSignal() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconPeople() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

/* ─── (image placeholders removed — real images wired in below) ─── */

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="lp-root">

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <header className="lp-nav">
        <div className="lp-container">
          <div className="lp-nav-inner">
            <a href="/" aria-label={`${tenantApp.name} home`} className="lp-nav-logo">
              <img src="/logo.svg" alt={tenantApp.name} width={160} height={40} style={{ height: '36px', width: 'auto' }} />
            </a>
            <nav aria-label="Main navigation" className="lp-nav-links">
              <a href="#citizens" className="lp-nav-link">For Citizens</a>
              <a href="#leaders" className="lp-nav-link">For Leaders</a>
            </nav>
            <Link to="/sign-in" className="lp-btn-red lp-nav-cta">
              Karyakarta Login
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-grid">

            {/* Text */}
            <div className="lp-hero-text">
              <div className="lp-hero-badge">
                <span className="lp-hero-badge-dot" />
                <span>Live in AP &amp; Telangana</span>
              </div>
              <h1 className="lp-hero-h1">
                Direct line.<br />
                <span style={{ color: '#CC0000' }}>No middlemen.</span><br />
                No filters.
              </h1>
              <p className="lp-hero-sub">
                {tenantApp.name} connects citizens directly to their elected representative — bypassing media spin and worker bias. Report a real problem. Get real action.
              </p>
              <div className="lp-hero-ctas">
                <a href="#citizens" className="lp-btn-red lp-btn-lg">
                  I&apos;m a Citizen <IconArrowRight />
                </a>
                <a href="#leaders" className="lp-btn-ghost lp-btn-lg">
                  I&apos;m a Leader <IconArrowRight />
                </a>
              </div>
              <div className="lp-trust-row">
                {[
                  'Telegram-based — no app needed',
                  'Telugu & English',
                  'Every issue tracked & assigned',
                ].map((item) => (
                  <div key={item} className="lp-trust-item">
                    <IconCheck />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="lp-hero-img-side">
              <div className="lp-hero-img-wrapper">
                <img
                  src="/images/citizen-hero.png"
                  alt="South Indian citizen holding smartphone on a street with civic issues — AP/Telangana"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CITIZEN SECTION ─────────────────────────────────────────────── */}
      <section id="citizens" className="lp-section-white">
        <div className="lp-container">
          <div className="lp-section-label" style={{ color: '#CC0000' }}>FOR CITIZENS</div>
          <h2 className="lp-section-h2">
            మీ సమస్య, నేరుగా నేత దగ్గరికి.
          </h2>
          <p className="lp-section-tagline">&ldquo;Your problem. Straight to your leader.&rdquo;</p>
          <p className="lp-section-body">
            Road potholes. Water shortage. Ration card issues. Corruption. Whatever you&apos;re facing — report it directly to your representative. No middlemen. No filters. Your issue is logged, assigned, and tracked until it&apos;s resolved.
          </p>

          {/* 3 Cards */}
          <div className="lp-citizen-cards">

            {/* QR Card */}
            <div className="lp-card lp-card-hover lp-card-centered">
              <div className="lp-card-label">Scan to Start</div>
              <QRCard />
              <p className="lp-card-caption">Point your phone camera at this code — Telegram opens automatically.</p>
            </div>

            {/* Telegram Card */}
            <div className="lp-card lp-card-hover lp-card-centered">
              <div className="lp-tg-icon">
                <IconTelegram />
              </div>
              <div>
                <div className="lp-card-label">Chat Your Grievance</div>
                <p className="lp-card-body-text">
                  Send text, photos, or audio in <strong>Telugu or English</strong>. Works on any phone with Telegram.
                </p>
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="lp-btn-tg">
                  <IconTelegram />
                  Start on Telegram
                </a>
              </div>
            </div>

            {/* Coming Soon Card */}
            <div className="lp-card lp-card-coming-soon lp-card-centered">
              <div className="lp-app-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" aria-hidden="true">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <div>
                <div className="lp-coming-soon-header">
                  <div className="lp-card-label" style={{ color: '#9CA3AF' }}>{tenantApp.name} App</div>
                  <span className="lp-badge-soon">Coming Soon</span>
                </div>
                <p className="lp-card-body-text" style={{ color: '#6B7280' }}>
                  Full citizen app with live case updates, issue tracking, and direct notifications from your representative&apos;s office.
                </p>
                <button disabled aria-disabled="true" className="lp-btn-disabled">
                  Download App
                </button>
              </div>
            </div>
          </div>

          {/* Karyakarta link */}
          <div className="lp-karyakarta-row">
            <p>
              Are you a ground worker?{' '}
              <Link to="/sign-in" className="lp-link-red">Login as Karyakarta →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── LEADER SECTION ──────────────────────────────────────────────── */}
      <section id="leaders" className="lp-section-grey">
        <div className="lp-container">
          <div className="lp-leaders-inner">

            {/* Copy side */}
            <div className="lp-leaders-copy">
              <div className="lp-section-label" style={{ color: '#CC0000' }}>FOR LEADERS</div>
              <h2 className="lp-section-h2">
                Know What&apos;s Really Happening in Your Constituency.
              </h2>
              <p className="lp-leaders-quote">
                Not what the media says. Not what your workers tell you.
              </p>
              <p className="lp-section-body">
                What citizens are <strong>actually facing</strong> — raw, geotagged, and tracked from first report to resolution.
              </p>
              <a href={CONTACT_EMAIL} className="lp-btn-red lp-btn-lg lp-btn-shadow">
                Request Access for Your Office <IconArrowRight />
              </a>
              <div style={{ marginTop: '40px', borderRadius: '16px', overflow: 'hidden' }}>
                <img src="/images/leader-office.png" alt="South Indian political leader reviewing constituency data in his office" width="800" height="450"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>

            {/* Value props grid */}
            <div className="lp-value-props">
              {[
                {
                  icon: <IconSignal />,
                  title: 'Direct Line to Citizens',
                  body: 'Citizens report issues straight to your office. No workers diluting or filtering the message before it reaches you.',
                },
                {
                  icon: <IconMapPin />,
                  title: 'Ground Intelligence, Not Media Intelligence',
                  body: 'See real issues geotagged to specific mandals and wards. Identify sensitive zones before they become headlines.',
                },
                {
                  icon: <IconPeople />,
                  title: 'Manage Your Karyakartas',
                  body: 'Assign cases to your ground team by area. Track who is responding, who is lagging. Build real accountability.',
                },
                {
                  icon: <IconChart />,
                  title: 'Pattern Insights for Strategy',
                  body: 'Identify recurring issues by area. Plan targeted Janata Darbar stops and outreach based on actual citizen data — not assumptions.',
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="lp-vp-card">
                  <div className="lp-vp-icon">{icon}</div>
                  <div>
                    <h3 className="lp-vp-title">{title}</h3>
                    <p className="lp-vp-body">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="lp-section-white">
        <div className="lp-container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div className="lp-section-label" style={{ color: '#CC0000', textAlign: 'center' }}>HOW IT WORKS</div>
            <h2 className="lp-section-h2" style={{ textAlign: 'center' }}>
              Three steps from problem to action.
            </h2>
          </div>
          <div className="lp-hiw-grid">
            {[
              {
                step: '01',
                title: 'Citizen Sends a Message',
                body: `Open Telegram, start a chat with ${tenantApp.name}. Send your grievance in text, photo, or audio — in Telugu or English. No forms. No queues.`,
                imgSrc: '/images/ground-reality.png',
                imgAlt: 'Residents standing on a waterlogged street in AP/Telangana — a real civic issue',
              },
              {
                step: '02',
                title: 'Issue is Logged & Assigned',
                body: 'Every message creates a tracked ticket. Tagged by location, type, and severity — then assigned to the nearest available karyakarta on the ground.',
                imgSrc: '/images/karyakartas-field.png',
                imgAlt: 'Karyakartas listening to elderly villagers at their home in a rural AP/Telangana village',
              },
              {
                step: '03',
                title: 'Leader Gets Visibility. Citizen Gets an Update.',
                body: 'The leader sees real-time case status on the dashboard. The citizen receives a Telegram notification when their issue is accepted and resolved.',
                imgSrc: '/images/leader-office.png',
                imgAlt: 'Political leader reviewing constituency case data on a tablet in his office',
              },
            ].map(({ step, title, body, imgSrc, imgAlt }) => (
              <div key={step} className="lp-hiw-step">
                <div className="lp-hiw-img-wrapper">
                  <img
                    src={imgSrc}
                    alt={imgAlt}
                    width={600}
                    height={450}
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '16px' }}
                  />
                </div>
                <div>
                  <span className="lp-hiw-num">{step}</span>
                  <h3 className="lp-hiw-title">{title}</h3>
                  <p className="lp-hiw-body">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BANNER ────────────────────────────────────────────── */}
      <section className="lp-cta-banner">
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', padding: '0 20px' }}>
          <h2 className="lp-cta-h2">Ready to make your voice count?</h2>
          <p className="lp-cta-sub">
            Start a Telegram chat and report your issue in under 60 seconds. No registration. No waiting. Your leader will know.
          </p>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="lp-btn-white-on-red">
            <IconTelegram />
            Open {tenantApp.name} on Telegram
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div>
              <img src="/logo.svg" alt={tenantApp.name} width={140} height={36} style={{ height: '32px', width: 'auto', filter: 'brightness(0) invert(1)', marginBottom: '12px' }} />
              <p className="lp-footer-tagline">
                A civic issue platform for one organization at a time.<br />Built for AP &amp; Telangana.
              </p>
            </div>
            <div className="lp-footer-col">
              <p className="lp-footer-col-label">Navigate</p>
              <a href="#citizens" className="lp-footer-link">For Citizens</a>
              <a href="#leaders" className="lp-footer-link">For Leaders</a>
              <a href="#how" className="lp-footer-link">How It Works</a>
            </div>
            <div className="lp-footer-col">
              <p className="lp-footer-col-label">Connect</p>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="lp-footer-link lp-footer-tg">
                <IconTelegram /> @{CITIZEN_BOT_USERNAME}
              </a>
              <a href={CONTACT_EMAIL} className="lp-footer-link">{tenantParty.contactEmail}</a>
              <Link to="/sign-in" className="lp-footer-link-red">Karyakarta Login →</Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>© 2026 {tenantApp.name}. All rights reserved.</p>
            <p>Made for the people of AP &amp; Telangana.</p>
          </div>
        </div>
      </footer>

      {/* ── STYLES ──────────────────────────────────────────────────────── */}
      
    </div>
  )
}
