import { useState, useEffect, useRef } from 'react'
import { FiEdit2, FiCheck, FiX, FiMail, FiBriefcase, FiMapPin, FiCamera, FiBarChart2, FiShoppingCart, FiDollarSign, FiPackage, FiTrendingUp, FiLink, FiBook } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:8080'

function StatCard({ icon: Icon, label, value, sub, color = '#34d399' }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }}/>
        </div>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'DM Mono', marginBottom: 2 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--t3)' }}>{sub}</p>}
    </div>
  )
}

function PhotoBtn({ onUploaded, children, style = {} }) {
  const ref = useRef(null)
  const [uploading, setUploading] = useState(false)
  async function handle(e) {
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('image', file)
    setUploading(true)
    try {
      const token = localStorage.getItem('lu_token')
      const res = await fetch(`${API_BASE}/api/v1/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUploaded(data.url); toast.success('Photo updated!')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); if (ref.current) ref.current.value = '' }
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle}/>
      <button onClick={() => ref.current?.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', cursor: uploading ? 'wait' : 'pointer', ...style }}>
        {uploading ? <span style={{ fontSize: 10 }}>…</span> : children}
      </button>
    </>
  )
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', company: '', role: '', location: '', pronouns: '', college: '', website: '', social_twitter: '', social_linkedin: '' })
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [store, setStore] = useState(null)
  const [orders, setOrders] = useState([])
  const ac = COLORS[(user?.name?.charCodeAt(0) || 0) % COLORS.length]

  useEffect(() => {
    if (user) setForm({ name: user.name || '', bio: user.bio || '', company: user.company || '', role: user.role || 'user', location: user.location || '', pronouns: user.pronouns || '', college: user.college || '', website: user.website || '', social_twitter: user.social_twitter || '', social_linkedin: user.social_linkedin || '' })
    // Load financial stats
    api.get('/orders/stats').then(({ data }) => setStats(data.stats)).catch(() => {})
    api.get('/stores/me').then(({ data }) => setStore(data.store)).catch(() => {})
    api.get('/orders').then(({ data }) => setOrders(data.orders?.slice(0, 3) || [])).catch(() => {})
  }, [user])

  async function save() {
    setLoading(true)
    try {
      const { data } = await api.put('/users/me', form)
      setUser({ ...user, ...form })
      setEditing(false); toast.success('Profile updated!')
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed') }
    finally { setLoading(false) }
  }

  async function updateAvatar(url) {
    try { await api.put('/users/me', { ...form, avatar: url }); setUser({ ...user, avatar: url }) }
    catch { toast.error('Could not update avatar') }
  }
  async function updateCover(url) {
    try { await api.put('/users/me', { ...form, cover_image: url }); setUser({ ...user, cover_image: url }) }
    catch { toast.error('Could not update cover') }
  }

  const inp = { className: 'input', style: { fontSize: 14 } }
  const strength = [!!user?.name, !!user?.bio, !!user?.company, !!user?.avatar, !!user?.location, !!user?.college].filter(Boolean).length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 40px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start', position: 'relative', zIndex: 1 }}>
      <main style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Main profile card */}
        <div className="card au" style={{ overflow: 'hidden' }}>
          <div style={{ height: 180, background: user?.cover_image ? 'none' : 'linear-gradient(120deg,rgba(16,185,129,.5),rgba(99,102,241,.5))', position: 'relative' }}>
            {user?.cover_image && <img src={user.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
            <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
              <PhotoBtn onUploaded={updateCover} style={{ background: 'rgba(0,0,0,.45)', borderRadius: '50%', width: 34, height: 34, color: '#fff', backdropFilter: 'blur(4px)' }}>
                <FiCamera size={14}/>
              </PhotoBtn>
            </div>
          </div>
          <div style={{ padding: '0 24px 24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ marginTop: -48, position: 'relative', display: 'inline-block' }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', border: '4px solid rgba(10,15,30,1)', overflow: 'hidden', background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 36, boxShadow: `0 0 24px ${ac}66` }}>
                  {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : user?.name?.[0]?.toUpperCase()}
                </div>
                <PhotoBtn onUploaded={updateAvatar} style={{ position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  <FiCamera size={12}/>
                </PhotoBtn>
              </div>
              {!editing && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setEditing(true)} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FiEdit2 size={13}/> Edit Profile
                  </button>
                  {store && <Link to="/marketplace/store/me" className="btn-primary" style={{ textDecoration: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13 }}>🏪 My Store</Link>}
                </div>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{user?.name}</h2>
                {user?.username && <span style={{ fontSize: 14, color: 'var(--t3)' }}>@{user.username}</span>}
                {user?.pronouns && <span style={{ fontSize: 12, color: 'var(--t3)' }}>· {user.pronouns}</span>}
              </div>
              {user?.bio && <p style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 8, maxWidth: 500 }}>{user.bio}</p>}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                {user?.company && <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiBriefcase size={13}/>{user.company}</span>}
                {user?.college && <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiBook size={13}/>{user.college}</span>}
                {user?.location && <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiMapPin size={13}/>{user.location}</span>}
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiMail size={13}/>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 14, color: 'var(--t2)' }}><strong style={{ color: 'var(--t1)' }}>{user?.follower_count || 0}</strong> followers</span>
                <span style={{ fontSize: 14, color: 'var(--t2)' }}><strong style={{ color: 'var(--t1)' }}>{user?.following_count || 0}</strong> following</span>
              </div>
            </div>
          </div>

          {editing && (
            <div className="au" style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)' }}>Edit Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['name','Full Name'],['pronouns','Pronouns'],['company','Company'],['college','College/University'],['location','Location'],['website','Website']].map(([k,l])=>(
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</label>
                    <input {...inp} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}/>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Bio / Headline</label>
                <textarea {...inp} rows={3} style={{ ...inp.style, resize: 'vertical' }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell your network about yourself…"/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Role</label>
                <select className="input" style={{ fontSize: 14 }} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {['user','retailer','distributor'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} disabled={loading} className="btn-primary" style={{ fontSize: 13 }}><FiCheck size={13}/>{loading ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}><FiX size={13}/>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Financial Dashboard */}
        <div className="card au1" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FiBarChart2 size={16} style={{ color: '#34d399' }}/>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)' }}>Financial Dashboard</h3>
          </div>

          {/* Spending */}
          <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>📊 Spending Summary</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
            <StatCard icon={FiDollarSign} label="Total Spent" value={`₹${(stats?.total_spent || 0).toFixed(0)}`} sub="All time" color="#f59e0b"/>
            <StatCard icon={FiShoppingCart} label="Orders Placed" value={stats?.total_orders || 0} sub="Purchases" color="#6366f1"/>
            <StatCard icon={FiTrendingUp} label="Avg Order" value={`₹${(stats?.avg_order_value || 0).toFixed(0)}`} sub="Per order" color="#06b6d4"/>
          </div>

          {/* Earnings */}
          <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>💰 Earnings Summary</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            <StatCard icon={FiDollarSign} label="Total Earned" value={`₹${(stats?.total_earned || 0).toFixed(0)}`} sub="From sales" color="#34d399"/>
            <StatCard icon={FiPackage} label="Items Sold" value={stats?.total_sold || 0} sub="Units" color="#ec4899"/>
            <StatCard icon={FiBarChart2} label="Products Listed" value={stats?.products_listed || 0} sub="Active" color="#8b5cf6"/>
          </div>

          {stats?.total_orders === 0 && stats?.total_sold === 0 && (
            <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--t3)', fontSize: 13 }}>
              No transactions yet. <Link to="/marketplace" style={{ color: '#a5b4fc', textDecoration: 'none' }}>Browse marketplace</Link> or <Link to="/marketplace/sell" style={{ color: '#a5b4fc', textDecoration: 'none' }}>start selling</Link>.
            </div>
          )}
        </div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <div className="card au2" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <FiShoppingCart size={14} style={{ color: '#6366f1' }}/> Recent Orders
              </h3>
              <Link to="/marketplace/orders" style={{ fontSize: 12, color: '#a5b4fc', textDecoration: 'none' }}>View all →</Link>
            </div>
            {orders.map((order, i) => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>#{order.id?.slice(-6).toUpperCase()}</p>
                  <p style={{ fontSize: 11, color: 'var(--t3)' }}>{order.items?.length} item(s)</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', fontFamily: 'DM Mono' }}>₹{order.total?.toFixed(0)}</p>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'rgba(99,102,241,.15)', color: '#a5b4fc', fontWeight: 600, textTransform: 'capitalize' }}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Right sidebar */}
      <aside style={{ position: 'sticky', top: 60, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Profile strength */}
        <div className="card au" style={{ padding: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)', marginBottom: 12 }}>Profile Strength</h3>
          {[['Photo', !!user?.avatar],['Name', !!user?.name],['Headline', !!user?.bio],['Company', !!user?.company],['Location', !!user?.location],['College', !!user?.college]].map(([l,d])=>(
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 13, color: 'var(--t2)' }}>{l}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: d ? '#34d399' : '#a5b4fc' }}>{d ? '✓ Done' : '+ Add'}</span>
            </div>
          ))}
          <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ height: '100%', width: `${strength/6*100}%`, background: 'linear-gradient(90deg,#10b981,#6366f1)', borderRadius: 3, transition: 'width 1s ease' }}/>
          </div>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 5, textAlign: 'right' }}>{strength}/6 complete</p>
        </div>

        {/* Store quick link */}
        {store ? (
          <Link to="/marketplace/store/me" style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 24 }}>🏪</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{store.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>{store.total_sales || 0} sales · ₹{(store.revenue || 0).toFixed(0)} revenue</p>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/marketplace/sell" style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: 16, textAlign: 'center', border: '1px dashed rgba(99,102,241,.3)' }}>
              <p style={{ fontSize: 22, marginBottom: 6 }}>🏪</p>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)', marginBottom: 3 }}>Start Selling</p>
              <p style={{ fontSize: 12, color: 'var(--t3)' }}>Create your store on EcoNet</p>
            </div>
          </Link>
        )}

        {/* Account info */}
        <div className="card" style={{ padding: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', marginBottom: 10 }}>Account Details</h3>
          <p style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono', wordBreak: 'break-all', background: 'rgba(255,255,255,.04)', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>{user?.id}</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['JWT','Bcrypt','MongoDB','Go+Gin'].map(t => (
              <span key={t} style={{ fontSize: 10, background: 'rgba(16,185,129,.12)', color: '#34d399', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
