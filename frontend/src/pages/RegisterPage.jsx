import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiZap, FiArrowRight, FiMail, FiLock, FiUser, FiCheck, FiCopy } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const BG = `
  @keyframes blobFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-28px) scale(1.04)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes otpPop { 0%{transform:scale(.88);opacity:0} 70%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  .inp-dark{width:100%;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);border-radius:10px;padding:13px 16px;font-size:15px;color:#fff;font-family:Inter,sans-serif;outline:none;transition:all .2s;}
  .inp-dark:focus{border-color:#6366f1;background:rgba(99,102,241,.12);box-shadow:0 0 0 3px rgba(99,102,241,.15);}
  .inp-dark::placeholder{color:rgba(255,255,255,.3);}
  .btn-glow{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:16px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 4px 24px rgba(99,102,241,.4);}
  .btn-glow:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(99,102,241,.6);}
  .btn-glow:disabled{opacity:.5;cursor:not-allowed;}
  .glass{background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);}
`

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleRegister(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      // Send OTP
      const otpRes = await api.post('/auth/otp/send', { email: form.email })
      if (otpRes.data.demo_otp) {
        setDemoOtp(otpRes.data.demo_otp)
        toast.success('Account created! OTP shown below ↓', { duration: 5000 })
      } else {
        toast.success('Account created! Check your email for OTP.')
      }
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  async function handleVerify(e) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/auth/otp/verify', { email: form.email, otp })
      toast.success('✅ Email verified! Welcome to EcoNet!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP — check the code shown below')
    } finally { setLoading(false) }
  }

  async function resendOTP() {
    try {
      const { data } = await api.post('/auth/otp/send', { email: form.email })
      if (data.demo_otp) {
        setDemoOtp(data.demo_otp)
        toast.success('New OTP generated — shown below ↓')
      } else {
        toast.success('OTP resent to your email!')
      }
    } catch { toast.error('Could not resend OTP') }
  }

  function copyOtp() {
    navigator.clipboard.writeText(demoOtp)
    toast.success('OTP copied!')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg,#0a0f1e 0%,#0d1535 40%,#0a0f1e 100%)', fontFamily: 'Inter,sans-serif', overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <style>{BG}</style>

      {/* Blobs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.28) 0%,transparent 70%)', animation: 'blobFloat 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.18) 0%,transparent 70%)', animation: 'blobFloat 11s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div style={{ display: 'flex', width: '100%', maxWidth: 1100, padding: '40px 24px', gap: 64, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        {/* LEFT branding — hidden on small screens via inline but visible on wide */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, animation: 'fadeUp .6s ease both' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(99,102,241,.6)' }}>
              <FiZap size={22} color="#fff" />
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>EcoNet</span>
          </div>
          <div style={{ animation: 'fadeUp .6s ease .1s both' }}>
            <h2 style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px' }}>
              Join thousands of<br />
              <span style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>professionals</span>
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', lineHeight: 1.7, marginBottom: 40, maxWidth: 380 }}>
              The platform built for retailers and distributors to connect, share insights, and collaborate in real-time.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp .6s ease .2s both' }}>
            {['Create & share posts with your network', 'Publish blogs with Markdown support', 'Real-time group & direct chat rooms', 'Secure JWT + bcrypt + OTP auth'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,.25)', border: '1px solid rgba(99,102,241,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiCheck size={11} color="#a5b4fc" />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,.55)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT form */}
        <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
          {step === 1 ? (
            <div className="glass" style={{ borderRadius: 24, padding: '40px 36px', animation: 'fadeUp .6s ease both' }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Create your account</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 28 }}>
                Already a member? <Link to="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600 }}>Sign in →</Link>
              </p>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <FiUser size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)' }} />
                    <input className="inp-dark" style={{ paddingLeft: 40 }} placeholder="Arjun Sharma" value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <FiMail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)' }} />
                    <input type="email" className="inp-dark" style={{ paddingLeft: 40 }} placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <FiLock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)' }} />
                    <input type="password" className="inp-dark" style={{ paddingLeft: 40 }} placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Your Role</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['user','👤','User'], ['retailer','🏪','Retailer'], ['distributor','🏭','Distributor']].map(([r, emoji, label]) => (
                      <button key={r} type="button" onClick={() => set('role', r)} style={{
                        flex: 1, padding: '10px 4px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                        border: `1.5px solid ${form.role === r ? '#6366f1' : 'rgba(255,255,255,.1)'}`,
                        background: form.role === r ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.04)',
                        color: form.role === r ? '#a5b4fc' : 'rgba(255,255,255,.4)',
                        fontSize: 12, fontWeight: 600, transition: 'all .15s',
                      }}>
                        <div>{emoji}</div><div style={{ marginTop: 4 }}>{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-glow" style={{ width: '100%', padding: '14px', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? 'Creating account…' : <><span>Create Account</span><FiArrowRight size={16} /></>}
                </button>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', textAlign: 'center' }}>
                  Your email will be verified via OTP after signup.
                </p>
              </form>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: 24, padding: '44px 36px', animation: 'otpPop .4s ease both', textAlign: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.25))', border: '2px solid rgba(99,102,241,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 30 }}>
                📧
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Verify your email</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 6 }}>We sent a 6-digit code to</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc', marginBottom: 24 }}>{form.email}</p>

              {/* Demo OTP box — shown when no SMTP configured */}
              {demoOtp && (
                <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2))', border: '1.5px solid rgba(99,102,241,.4)', borderRadius: 14, padding: '14px 20px', marginBottom: 24, animation: 'otpPop .4s ease both' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600, marginBottom: 10 }}>
                    📌 Dev Mode — Your OTP
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: '#a5b4fc', letterSpacing: 12, fontFamily: 'DM Mono,monospace' }}>{demoOtp}</span>
                    <button onClick={copyOtp} style={{ background: 'rgba(99,102,241,.3)', border: '1px solid rgba(99,102,241,.5)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
                      <FiCopy size={13} /> Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 8 }}>
                    No SMTP configured — set up Gmail in .env to send real emails
                  </p>
                </div>
              )}

              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  className="inp-dark"
                  style={{ textAlign: 'center', letterSpacing: 16, fontSize: 28, fontFamily: 'DM Mono,monospace', fontWeight: 700, padding: '16px' }}
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
                <button type="submit" disabled={loading || otp.length < 6} className="btn-glow" style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? 'Verifying…' : <><FiCheck size={16} /><span>Verify Email</span></>}
                </button>
              </form>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
                  Didn't get it?{' '}
                  <button onClick={resendOTP} style={{ background: 'none', border: 'none', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Generate new OTP
                  </button>
                </p>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  Skip for now →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
