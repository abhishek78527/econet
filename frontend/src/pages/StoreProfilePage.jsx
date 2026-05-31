import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiStar, FiUsers, FiPackage, FiDollarSign, FiEdit2, FiHeart, FiShoppingCart } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

export default function StoreProfilePage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const isMe = id === 'me'

  useEffect(() => {
    async function load() {
      try {
        const storeRes = isMe ? await api.get('/stores/me') : await api.get(`/stores/${id}`)
        const s = storeRes.data.store
        setStore(s)
        setProductCount(storeRes.data.product_count || 0)
        setEditForm({ name: s.name, description: s.description, category: s.category, location: s.location, phone: s.phone })
        setFollowing((s.followers || []).includes(user?.id))
        // Load store products
        const prodRes = await api.get(`/products?store_id=${s.id}`)
        setProducts(prodRes.data.products || [])
      } catch { toast.error('Store not found') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  async function toggleFollow() {
    try {
      const { data } = await api.post(`/stores/${store.id}/follow`)
      setFollowing(data.action === 'followed')
      toast.success(data.action === 'followed' ? `Following ${store.name}` : 'Unfollowed')
    } catch { toast.error('Could not follow') }
  }

  async function saveStore(e) {
    e.preventDefault()
    try { await api.put(`/stores/${store.id}`, editForm); setStore(s => ({ ...s, ...editForm })); setEditing(false); toast.success('Store updated!') }
    catch { toast.error('Could not update store') }
  }

  async function addToCart(productId) {
    try { await api.post('/cart/add', { product_id: productId, qty: 1 }); toast.success('Added to cart!') }
    catch { toast.error('Could not add to cart') }
  }

  if (loading) return <div style={{ maxWidth: 1100, margin: '80px auto', padding: '0 20px', color: 'var(--t3)', textAlign: 'center' }}>Loading store…</div>
  if (!store) return <div style={{ maxWidth: 1100, margin: '80px auto', padding: '0 20px', color: 'var(--t3)', textAlign: 'center' }}>Store not found</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 40px', position: 'relative', zIndex: 1 }}>
      {/* Store banner */}
      <div className="card au" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: 160, background: store.banner ? 'none' : 'linear-gradient(135deg,rgba(16,185,129,.4),rgba(99,102,241,.4))', position: 'relative' }}>
          {store.banner && <img src={store.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
          <div style={{ position: 'absolute', bottom: 16, left: 20, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, background: 'linear-gradient(135deg,#10b981,#6366f1)', border: '3px solid rgba(10,15,30,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 4px 16px rgba(0,0,0,.4)', overflow: 'hidden' }}>
              {store.logo ? <img src={store.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '🏪'}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{store.name}</h1>
              {store.verified && <span style={{ fontSize: 11, background: 'rgba(52,211,153,.15)', color: '#34d399', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>✓ Verified</span>}
              <span style={{ fontSize: 11, background: 'rgba(99,102,241,.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 999 }}>{store.category}</span>
            </div>
            {store.description && <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 8, maxWidth: 500, lineHeight: 1.6 }}>{store.description}</p>}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {store.location && <span style={{ fontSize: 12, color: 'var(--t3)' }}>📍 {store.location}</span>}
              {store.phone && <span style={{ fontSize: 12, color: 'var(--t3)' }}>📞 {store.phone}</span>}
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>👥 {store.followers?.length || 0} followers</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isMe ? (
              <button onClick={() => setEditing(s => !s)} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px' }}>
                <FiEdit2 size={13}/> Edit Store
              </button>
            ) : (
              <button onClick={toggleFollow} className={following ? 'btn-ghost' : 'btn-primary'} style={{ borderRadius: 10, padding: '8px 16px', border: following ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                {following ? '✓ Following' : '+ Follow Store'}
              </button>
            )}
            {isMe && <Link to="/marketplace/sell" className="btn-primary" style={{ textDecoration: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>+ Add Product</Link>}
          </div>
        </div>

        {/* Store stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderTop: '1px solid var(--border)' }}>
          {[
            [FiPackage, productCount, 'Products'],
            [FiShoppingCart, store.total_sales || 0, 'Sales'],
            [FiDollarSign, `₹${(store.revenue || 0).toFixed(0)}`, 'Revenue'],
            [FiStar, (store.rating || 0).toFixed(1), 'Avg Rating'],
          ].map(([Icon, val, label], i) => (
            <div key={i} style={{ padding: '14px 20px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono', marginBottom: 2 }}>{val}</p>
              <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon size={11}/>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card au" style={{ padding: 24, marginBottom: 16, border: '1px solid rgba(99,102,241,.3)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 14 }}>Edit Store</h3>
          <form onSubmit={saveStore} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['name','Store Name'],['description','Description'],['location','Location'],['phone','Phone']].map(([k,l])=>(
              <div key={k} style={{ gridColumn: k === 'description' ? '1/-1' : 'auto' }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</label>
                <input className="input" style={{ fontSize: 14 }} value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}/>
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ fontSize: 13 }}>Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Products grid */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 14 }}>
          Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
            <p style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>No products listed yet</p>
            {isMe && <Link to="/marketplace/sell" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8 }}>+ Add your first product</Link>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {products.map((p, i) => {
              const dp = p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price
              return (
                <Link key={p.id} to={`/marketplace/product/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover au" style={{ overflow: 'hidden', animationDelay: `${i*.04}s` }}>
                    <div style={{ paddingTop: '65%', position: 'relative', background: 'rgba(255,255,255,.05)' }}>
                      {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }}/> : <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32 }}>📦</div>}
                      {p.discount > 0 && <span style={{ position:'absolute',top:6,left:6,background:'#ef4444',color:'#fff',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:999 }}>-{p.discount}%</span>}
                      {p.stock === 0 && <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center' }}><span style={{ color:'#f87171',fontWeight:700,fontSize:12 }}>Out of Stock</span></div>}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 4, overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 10, color: s <= Math.round(p.avg_rating || 0) ? '#fbbf24' : 'rgba(255,255,255,.2)' }}>★</span>)}
                        <span style={{ fontSize: 10, color: 'var(--t3)' }}>({p.review_count || 0})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono' }}>₹{dp.toFixed(0)}</span>
                        {p.discount > 0 && <span style={{ fontSize: 11, color: 'var(--t3)', textDecoration: 'line-through' }}>₹{p.price}</span>}
                      </div>
                      <button onClick={e => { e.preventDefault(); addToCart(p.id) }} disabled={p.stock === 0} className="btn-primary" style={{ width: '100%', padding: '6px', fontSize: 11, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <FiShoppingCart size={11}/> {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
