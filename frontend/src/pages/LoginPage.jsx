import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiZap, FiArrowRight, FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [tab, setTab] = useState('password')
  const [form, setForm] = useState({ email: '', password: '' })
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/')
    } catch (err) { toast.error(err.response?.data?.error || 'Login failed') }
    finally { setLoading(false) }
  }

  async function sendOTP() {
    if (!form.email) { toast.error('Enter email first'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/otp/send', { email: form.email })
      setOtpSent(true); toast.success(data.message)
      if (data.demo_otp) toast(`OTP: ${data.demo_otp}`, { icon: '🔑', duration: 10000 })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  async function verifyOTP(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/otp/verify', { email: form.email, otp })
      login(data.token, data.user); navigate('/')
    } catch (err) { toast.error(err.response?.data?.error || 'Invalid OTP') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1535 40%, #0a0f1e 100%)',
      fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'relative',
    }}>
      {/* Animated background blobs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.35) 0%, transparent 70%)', animation: 'blobFloat 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,.25) 0%, transparent 70%)', animation: 'blobFloat 10s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '40%', right: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,.2) 0%, transparent 70%)', animation: 'blobFloat 12s ease-in-out infinite 2s' }} />
        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <style>{`
        @keyframes blobFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes otpPop { 0%{transform:scale(.9);opacity:0} 70%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
        .glass { background:rgba(255,255,255,.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,.1); }
        .inp-dark { width:100%; background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.12); border-radius:10px; padding:13px 16px; font-size:15px; color:#fff; font-family:Inter; outline:none; transition:all .2s; }
        .inp-dark:focus { border-color:#6366f1; background:rgba(99,102,241,.12); box-shadow:0 0 0 3px rgba(99,102,241,.15); }
        .inp-dark::placeholder { color:rgba(255,255,255,.3); }
        .btn-glow { background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; border-radius:12px; color:#fff; font-size:16px; font-weight:700; font-family:Inter; cursor:pointer; transition:all .2s; box-shadow:0 4px 24px rgba(99,102,241,.4); }
        .btn-glow:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 32px rgba(99,102,241,.6); }
        .btn-glow:disabled { opacity:.5; cursor:not-allowed; }
        .feature-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:20px; transition:all .2s; }
        .feature-card:hover { background:rgba(255,255,255,.07); border-color:rgba(99,102,241,.4); transform:translateY(-3px); }
      `}</style>

      {/* LEFT — Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 60, animation: 'fadeSlideIn .6s ease both' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(99,102,241,.6)' }}>
            <FiZap size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>EcoNet</span>
        </div>

        <div style={{ animation: 'fadeSlideUp .7s ease .1s both' }}>
          <div style={{ display: 'inline-block', background: 'rgba(99,102,241,.2)', border: '1px solid rgba(99,102,241,.4)', borderRadius: 999, padding: '6px 16px', fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 20 }}>
            🚀 Professional Collaboration Platform
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px' }}>
            Connect. Share.<br/>
            <span style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Collaborate.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 420, marginBottom: 48 }}>
            The platform built for retailers and distributors to share posts, publish blogs, and communicate in real-time — all in one place.
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 460, animation: 'fadeSlideUp .7s ease .2s both' }}>
          {[
            { icon: '⚡', title: 'Real-time Chat', desc: 'Group & direct messaging with WebSockets' },
            { icon: '📝', title: 'Blog Publishing', desc: 'Share marketplace insights with Markdown' },
            { icon: '🔐', title: 'Secure Auth', desc: 'JWT + bcrypt + Email OTP verification' },
            { icon: '🌐', title: '50+ Concurrent', desc: 'Built with Go for high performance' },
          ].map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${.3 + i*.07}s` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 3 }}>{f.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Trusted by */}
        <div style={{ marginTop: 48, animation: 'fadeSlideUp .7s ease .4s both' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, fontWeight: 600 }}>Trusted by professionals at</p>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {['Retailers', 'Distributors', 'Startups', 'Enterprises'].map((b, i) => (
              <span key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,.25)', fontWeight: 600 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Login form */}
      <div style={{ width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', position: 'relative', zIndex: 1 }}>
        <div className="glass" style={{ width: '100%', borderRadius: 24, padding: '40px 36px', animation: 'fadeSlideUp .6s ease .1s both' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.4px' }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 28 }}>
            Don't have an account? <Link to="/register" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600 }}>Sign up free →</Link>
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {['password', 'otp'].map(t => (
              <button key={t} onClick={() => { setTab(t); setOtpSent(false) }} style={{
                flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter', transition: 'all .2s',
                background: tab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,.4)',
                boxShadow: tab === t ? '0 2px 12px rgba(99,102,241,.4)' : 'none',
              }}>
                {t === 'password' ? '🔑 Password' : '📧 Email OTP'}
              </button>
            ))}
          </div>

          {tab === 'password' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <FiMail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)' }} />
                  <input type="email" className="inp-dark" style={{ paddingLeft: 40 }} placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)' }} />
                  <input type={showPw ? 'text' : 'password'} className="inp-dark" style={{ paddingLeft: 40, paddingRight: 44 }} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)' }}>
                    {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-glow" style={{ width: '100%', padding: '14px', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Signing in…' : <><span>Sign In</span><FiArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Email address</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="email" className="inp-dark" style={{ flex: 1 }} placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  <button onClick={sendOTP} disabled={loading} style={{ padding: '13px 16px', borderRadius: 10, border: '1.5px solid rgba(99,102,241,.5)', background: 'rgba(99,102,241,.15)', color: '#a5b4fc', fontSize: 13, fontWeight: 600, fontFamily: 'Inter', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                    {otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>
              {otpSent && (
                <form onSubmit={verifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'otpPop .35s ease both' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>6-digit OTP</label>
                    <input type="text" className="inp-dark" style={{ textAlign: 'center', letterSpacing: 16, fontSize: 24, fontFamily: 'DM Mono', fontWeight: 700 }} placeholder="000000" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required />
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 6, textAlign: 'center' }}>Check your email inbox for the 6-digit code</p>
                  </div>
                  <button type="submit" disabled={loading} className="btn-glow" style={{ width: '100%', padding: '14px' }}>
                    {loading ? 'Verifying…' : 'Verify & Sign In ✓'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[['50+', 'Users'], ['99%', 'Uptime'], ['∞', 'Messages']].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255,255,255,.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc', marginBottom: 2 }}>{v}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
