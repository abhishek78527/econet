import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiX, FiUpload } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const CATS = ['Electronics','Fashion','Books','Home & Garden','Beauty','Sports','Toys','Food','Automotive','Health','Other']
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:8080'

export default function SellProductPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [store, setStore] = useState(null)
  const [loadingStore, setLoadingStore] = useState(true)
  const [showCreateStore, setShowCreateStore] = useState(false)
  const [storeForm, setStoreForm] = useState({ name: '', description: '', category: '', location: '', phone: '' })
  const [form, setForm] = useState({ name: '', description: '', category: 'Electronics', brand: '', price: '', discount: '0', stock: '', shipping: '', images: [], specs: {} })
  const [specKey, setSpecKey] = useState(''); const [specVal, setSpecVal] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const imgRef = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/stores/me').then(({ data }) => setStore(data.store)).catch(() => setShowCreateStore(true)).finally(() => setLoadingStore(false))
  }, [])

  async function createStore(e) {
    e.preventDefault()
    try {
      const { data } = await api.post('/stores', storeForm)
      setStore(data.store); setShowCreateStore(false); toast.success('Store created! 🏪')
    } catch (err) { toast.error(err.response?.data?.error || 'Could not create store') }
  }

  async function uploadImage(file) {
    const fd = new FormData(); fd.append('image', file)
    setUploading(true)
    try {
      const token = localStorage.getItem('lu_token')
      const res = await fetch(`${API_BASE}/api/v1/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set('images', [...form.images, data.url]); toast.success('Image uploaded!')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  function addSpec() {
    if (!specKey.trim()) return
    set('specs', { ...form.specs, [specKey]: specVal })
    setSpecKey(''); setSpecVal('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!store) { toast.error('Create a store first'); return }
    setSubmitting(true)
    try {
      await api.post('/products', {
        store_id: store.id, name: form.name, description: form.description,
        category: form.category, brand: form.brand, images: form.images,
        price: parseFloat(form.price), discount: parseFloat(form.discount || 0),
        stock: parseInt(form.stock || 0), shipping: form.shipping, specs: form.specs,
        tags: [form.category.toLowerCase()],
      })
      toast.success('Product listed successfully! 🎉')
      navigate('/marketplace/store/me')
    } catch (err) { toast.error(err.response?.data?.error || 'Could not list product') }
    finally { setSubmitting(false) }
  }

  const inp = { className: 'input', style: { fontSize: 14 } }

  if (loadingStore) return <div style={{ maxWidth: 700, margin: '80px auto 0', padding: '0 20px', textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 20px 40px', position: 'relative', zIndex: 1 }}>
      <div className="au" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/marketplace" className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
          <FiArrowLeft size={13}/> Back
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>📦 List a Product</h1>
      </div>

      {/* Create Store Modal */}
      {showCreateStore && (
        <div className="card au" style={{ padding: 28, marginBottom: 20, border: '1px solid rgba(99,102,241,.3)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--t1)', marginBottom: 4 }}>🏪 Create Your Store First</h3>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 18 }}>You need a store to sell products on EcoNet</p>
          <form onSubmit={createStore} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['name','Store Name *','e.g. Arjun Electronics'],['description','Description','Tell customers about your store'],['location','Location','City, State'],['phone','Phone','Contact number']].map(([k,l,p])=>(
              <div key={k}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</label>
                <input {...inp} placeholder={p} value={storeForm[k]} onChange={e => setStoreForm(f => ({ ...f, [k]: e.target.value }))} required={k==='name'}/>
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Category</label>
              <select className="input" style={{ fontSize: 14 }} value={storeForm.category} onChange={e => setStoreForm(f => ({ ...f, category: e.target.value }))}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '11px', fontSize: 14 }}>Create Store 🚀</button>
          </form>
        </div>
      )}

      {/* Store badge */}
      {store && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(52,211,153,.2)' }}>
          <span style={{ fontSize: 20 }}>🏪</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{store.name}</p>
            <p style={{ fontSize: 12, color: 'var(--t3)' }}>Products will be listed under this store</p>
          </div>
          <Link to="/marketplace/store/me" style={{ marginLeft: 'auto', fontSize: 12, color: '#a5b4fc', textDecoration: 'none' }}>Manage Store →</Link>
        </div>
      )}

      {/* Product form */}
      <form onSubmit={handleSubmit} className="card au1" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 0 }}>Product Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Product Name *</label>
            <input {...inp} placeholder="e.g. Premium Wireless Earbuds" value={form.name} onChange={e => set('name', e.target.value)} required/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Category *</label>
            <select className="input" style={{ fontSize: 14 }} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Brand</label>
            <input {...inp} placeholder="e.g. Sony, Samsung" value={form.brand} onChange={e => set('brand', e.target.value)}/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Price (₹) *</label>
            <input {...inp} type="number" min="0" placeholder="999" value={form.price} onChange={e => set('price', e.target.value)} required/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Discount %</label>
            <input {...inp} type="number" min="0" max="90" placeholder="0" value={form.discount} onChange={e => set('discount', e.target.value)}/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Stock Qty *</label>
            <input {...inp} type="number" min="0" placeholder="100" value={form.stock} onChange={e => set('stock', e.target.value)} required/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Shipping Info</label>
            <input {...inp} placeholder="Ships in 2-3 days" value={form.shipping} onChange={e => set('shipping', e.target.value)}/>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Description</label>
          <textarea className="input" rows={4} placeholder="Describe your product in detail…" value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical', fontSize: 14 }}/>
        </div>

        {/* Images */}
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Product Images</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.images.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
            <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadImage(e.target.files[0])}/>
            <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} style={{ width: 72, height: 72, borderRadius: 8, border: '2px dashed rgba(255,255,255,.2)', background: 'transparent', cursor: 'pointer', color: 'var(--t3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'border-color .15s', fontSize: 11 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'}>
              <FiUpload size={16}/>{uploading ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Specs */}
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Specifications</label>
          {Object.entries(form.specs).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--t2)', flex: 1 }}><strong>{k}:</strong> {v}</span>
              <button type="button" onClick={() => { const s = { ...form.specs }; delete s[k]; set('specs', s) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}><FiX size={13}/></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1, fontSize: 13 }} placeholder="Key (e.g. Color)" value={specKey} onChange={e => setSpecKey(e.target.value)}/>
            <input className="input" style={{ flex: 2, fontSize: 13 }} placeholder="Value (e.g. Black)" value={specVal} onChange={e => setSpecVal(e.target.value)}/>
            <button type="button" onClick={addSpec} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: 13 }}>
              <FiPlus size={13}/> Add
            </button>
          </div>
        </div>

        {/* Price preview */}
        {form.price && (
          <div style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 20 }}>
            <div><p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>ORIGINAL</p><p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', fontFamily: 'DM Mono' }}>₹{parseFloat(form.price||0).toFixed(0)}</p></div>
            {parseFloat(form.discount) > 0 && <>
              <div><p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>DISCOUNTED</p><p style={{ fontSize: 18, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono' }}>₹{(parseFloat(form.price||0)*(1-parseFloat(form.discount||0)/100)).toFixed(0)}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>SAVINGS</p><p style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: 'DM Mono' }}>₹{(parseFloat(form.price||0)*parseFloat(form.discount||0)/100).toFixed(0)}</p></div>
            </>}
          </div>
        )}

        <button type="submit" disabled={submitting || !store} className="btn-primary" style={{ padding: '13px', fontSize: 15, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {submitting ? 'Listing…' : '🚀 List Product'}
        </button>
      </form>
    </div>
  )
}
