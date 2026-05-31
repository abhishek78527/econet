import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiSearch, FiFilter, FiStar, FiHeart, FiShoppingCart, FiTrendingUp, FiGrid, FiList, FiChevronDown, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const CATEGORIES = ['All','Electronics','Fashion','Books','Home & Garden','Beauty','Sports','Toys','Food','Automotive','Health','Other']
const SORTS = [['created_at_desc','Newest'],['price_asc','Price: Low to High'],['price_desc','Price: High to Low'],['rating','Top Rated'],['popular','Most Popular']]

function Stars({ rating, size = 13 }) {
  return (
    <span style={{ display:'inline-flex', gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:size, color: i <= Math.round(rating) ? '#fbbf24' : 'rgba(255,255,255,.2)' }}>★</span>
      ))}
    </span>
  )
}

function ProductCard({ product, onWishlist, wishlisted, onAddCart }) {
  const discountedPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price
  const inINR = product.category !== 'Exports'

  return (
    <Link to={`/marketplace/product/${product.id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-hover au" style={{ overflow: 'hidden', height: '100%' }}>
        {/* Image */}
        <div style={{ position: 'relative', paddingTop: '70%', background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover' }}/>
          ) : (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40 }}>📦</div>
          )}
          {product.discount > 0 && (
            <span style={{ position:'absolute',top:8,left:8,background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:999 }}>
              -{product.discount}%
            </span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span style={{ position:'absolute',top:8,right:8,background:'#f59e0b',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:999 }}>
              Only {product.stock} left!
            </span>
          )}
          {product.stock === 0 && (
            <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ color:'#f87171',fontWeight:700,fontSize:13 }}>Out of Stock</span>
            </div>
          )}
          {/* Wishlist btn */}
          <button onClick={e => { e.preventDefault(); onWishlist(product.id) }} style={{
            position:'absolute',top:8,right:8,background:'rgba(0,0,0,.5)',border:'none',borderRadius:'50%',
            width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .15s',
          }}>
            <FiHeart size={14} style={{ color: wishlisted ? '#ef4444' : '#fff', fill: wishlisted ? '#ef4444' : 'none' }}/>
          </button>
        </div>

        {/* Details */}
        <div style={{ padding: '12px 14px' }}>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{product.category}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.name}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <Stars rating={product.avg_rating || 0} />
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>({product.review_count || 0})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono' }}>
              ₹{discountedPrice.toFixed(0)}
            </span>
            {product.discount > 0 && (
              <span style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'line-through' }}>₹{product.price}</span>
            )}
          </div>

          {product.store_name && <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>by {product.store_name}</p>}

          <button onClick={e => { e.preventDefault(); onAddCart(product.id) }} disabled={product.stock === 0}
            className="btn-primary" style={{ width: '100%', padding: '7px', fontSize: 12, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <FiShoppingCart size={12} /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  )
}

export default function MarketplacePage() {
  const [products, setProducts] = useState([])
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('created_at_desc')
  const [searchQ, setSearchQ] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [wishlist, setWishlist] = useState([])
  const [cartCount, setCartCount] = useState(0)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchQ(q)
    loadProducts()
    loadFeatured()
    loadWishlist()
    loadCartCount()
  }, [])

  useEffect(() => { loadProducts() }, [category, sort, priceRange])

  async function loadProducts() {
    setLoading(true)
    try {
      let url = `/products?sort=${sort}`
      if (category !== 'All') url += `&category=${encodeURIComponent(category)}`
      if (priceRange.min) url += `&min_price=${priceRange.min}`
      if (priceRange.max) url += `&max_price=${priceRange.max}`
      const { data } = await api.get(url)
      setProducts(data.products || [])
    } catch { toast.error('Could not load products') }
    finally { setLoading(false) }
  }

  async function loadFeatured() {
    try { const { data } = await api.get('/products/trending'); setFeatured(data.products?.slice(0, 4) || []) } catch {}
  }
  async function loadWishlist() {
    try { const { data } = await api.get('/cart/wishlist'); setWishlist((data.products || []).map(p => p.id)) } catch {}
  }
  async function loadCartCount() {
    try { const { data } = await api.get('/cart'); setCartCount(data.count || 0) } catch {}
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQ.trim()) { loadProducts(); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/products/search?q=${encodeURIComponent(searchQ)}`)
      setProducts(data.products || [])
    } catch { toast.error('Search failed') }
    finally { setLoading(false) }
  }

  async function toggleWishlist(productId) {
    try {
      const { data } = await api.post(`/products/${productId}/wishlist`)
      if (data.action === 'added') { setWishlist(prev => [...prev, productId]); toast.success('Added to wishlist ❤️') }
      else { setWishlist(prev => prev.filter(id => id !== productId)); toast.success('Removed from wishlist') }
    } catch { toast.error('Could not update wishlist') }
  }

  async function addToCart(productId) {
    try {
      await api.post('/cart/add', { product_id: productId, qty: 1 })
      setCartCount(c => c + 1)
      toast.success('Added to cart 🛒')
    } catch { toast.error('Could not add to cart') }
  }

  const displayProducts = searchQ && !loading ? products : products

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '72px 20px 40px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div className="au" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>🛍️ Marketplace</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>Discover products from verified sellers</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/marketplace/cart" style={{ textDecoration: 'none', position: 'relative' }}>
            <button className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiShoppingCart size={15} /> Cart
              {cartCount > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 5px', marginLeft: 2 }}>{cartCount}</span>}
            </button>
          </Link>
          <Link to="/marketplace/sell" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>
            + Sell
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="au1" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}/>
          <input className="input" style={{ paddingLeft: 44, borderRadius: 12, fontSize: 14, padding: '12px 14px 12px 44px' }}
            placeholder="Search products, brands, categories…" value={searchQ} onChange={e => setSearchQ(e.target.value)}/>
          {searchQ && <button type="button" onClick={() => { setSearchQ(''); loadProducts() }} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--t3)' }}><FiX size={14}/></button>}
        </div>
        <button type="submit" className="btn-primary" style={{ borderRadius: 12, padding: '0 20px' }}>Search</button>
        <button type="button" onClick={() => setShowFilters(s => !s)} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiFilter size={14} /> Filters
        </button>
      </form>

      {/* Filters panel */}
      {showFilters && (
        <div className="card au" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Min Price ₹</label>
            <input className="input" style={{ width: 100 }} placeholder="0" value={priceRange.min} onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))}/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Max Price ₹</label>
            <input className="input" style={{ width: 100 }} placeholder="99999" value={priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))}/>
          </div>
          <button onClick={() => setPriceRange({ min: '', max: '' })} className="btn-ghost" style={{ fontSize: 12 }}>Reset</button>
        </div>
      )}

      {/* Category tabs */}
      <div className="au2" style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, flexWrap: 'nowrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'all .15s',
            background: category === cat ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,.07)',
            color: category === cat ? '#fff' : 'var(--t2)',
            boxShadow: category === cat ? '0 4px 12px rgba(99,102,241,.3)' : 'none',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Controls bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>{products.length} products found</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: 'rgba(255,255,255,.07)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontFamily: 'Inter', fontSize: 12, outline: 'none' }}>
            {SORTS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            {[['grid', FiGrid], ['list', FiList]].map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === mode ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.06)', color: viewMode === mode ? '#a5b4fc' : 'var(--t3)' }}>
                <Icon size={14}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(200px,1fr))' : '1fr', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: viewMode === 'grid' ? 320 : 100, borderRadius: 14 }}/>)}
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <p style={{ fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>No products found</p>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16 }}>Try a different category or search term</p>
          <Link to="/marketplace/sell" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            + List your first product
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(200px,1fr))' : '1fr', gap: 14 }}>
          {products.map((product, i) => (
            <div key={product.id} style={{ animationDelay: `${i * .03}s` }}>
              <ProductCard product={product} wishlisted={wishlist.includes(product.id)} onWishlist={toggleWishlist} onAddCart={addToCart}/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
