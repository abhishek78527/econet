import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiStar, FiHeart, FiShoppingCart, FiShare2, FiMessageCircle, FiChevronLeft, FiChevronRight, FiPackage, FiTruck, FiShield } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

function Stars({ rating, size = 14, interactive = false, onRate }) {
  const [hover, setHover] = useState(0)
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          style={{ fontSize: size, color: i <= (hover || Math.round(rating)) ? '#fbbf24' : 'rgba(255,255,255,.2)', cursor: interactive ? 'pointer' : 'default', transition: 'color .1s' }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(i)}>★</span>
      ))}
    </span>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [store, setStore] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' })
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, revRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/products/${id}/reviews`)
        ])
        setProduct(prodRes.data.product)
        setRelated(prodRes.data.related || [])
        setStore(prodRes.data.store)
        setReviews(revRes.data.reviews || [])
      } catch { toast.error('Product not found'); navigate('/marketplace') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  async function addToCart() {
    try { await api.post('/cart/add', { product_id: id, qty }); setInCart(true); toast.success(`${qty} item(s) added to cart 🛒`) }
    catch { toast.error('Could not add to cart') }
  }

  async function buyNow() {
    await addToCart()
    navigate('/marketplace/cart')
  }

  async function toggleWishlist() {
    try {
      const { data } = await api.post(`/products/${id}/wishlist`)
      setWishlisted(data.action === 'added')
      toast.success(data.action === 'added' ? 'Added to wishlist ❤️' : 'Removed from wishlist')
    } catch { toast.error('Could not update wishlist') }
  }

  async function submitReview(e) {
    e.preventDefault()
    setSubmittingReview(true)
    try {
      const { data } = await api.post(`/products/${id}/review`, reviewForm)
      setReviews(prev => [data.review, ...prev])
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', body: '' })
      toast.success('Review submitted!')
      // Refresh product rating
      const { data: pd } = await api.get(`/products/${id}`)
      setProduct(pd.product)
    } catch { toast.error('Could not submit review') }
    finally { setSubmittingReview(false) }
  }

  if (loading) return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <div className="skeleton" style={{ paddingTop: '100%', borderRadius: 16 }}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 20, width: `${60+i*8}%` }}/>)}
        </div>
      </div>
    </div>
  )

  if (!product) return null
  const discounted = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price
  const savings = product.price - discounted
  const images = product.images?.length > 0 ? product.images : ['']

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 20px 40px', position: 'relative', zIndex: 1 }}>
      {/* Breadcrumb */}
      <div className="au" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'var(--t3)' }}>
        <Link to="/marketplace" style={{ color: 'var(--t3)', textDecoration: 'none' }}>Marketplace</Link>
        <span>/</span>
        <span style={{ color: 'var(--t3)' }}>{product.category}</span>
        <span>/</span>
        <span style={{ color: 'var(--t1)' }}>{product.name}</span>
      </div>

      {/* Main product section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
        {/* Images */}
        <div className="au">
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,.05)', marginBottom: 10 }}>
            {images[imgIdx] ? (
              <img src={images[imgIdx]} alt={product.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}/>
            ) : (
              <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>📦</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,.5)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff' }}><FiChevronLeft size={18}/></button>
                <button onClick={() => setImgIdx(i => (i + 1) % images.length)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,.5)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff' }}><FiChevronRight size={18}/></button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => setImgIdx(i)} style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${imgIdx === i ? '#6366f1' : 'transparent'}`, flexShrink: 0, background: 'rgba(255,255,255,.05)' }}>
                  {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center' }}>📦</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="au1">
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: 'rgba(99,102,241,.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{product.category}</span>
            {product.brand && <span style={{ fontSize: 11, background: 'rgba(255,255,255,.08)', color: 'var(--t2)', padding: '2px 8px', borderRadius: 999 }}>{product.brand}</span>}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.3, marginBottom: 12 }}>{product.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Stars rating={product.avg_rating || 0} size={16}/>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>{(product.avg_rating || 0).toFixed(1)}</span>
            <span style={{ fontSize: 13, color: 'var(--t3)' }}>({product.review_count || 0} reviews)</span>
            <span style={{ fontSize: 13, color: 'var(--t3)' }}>· {product.sold_count || 0} sold</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono' }}>₹{discounted.toFixed(0)}</span>
              {product.discount > 0 && (
                <>
                  <span style={{ fontSize: 16, color: 'var(--t3)', textDecoration: 'line-through' }}>₹{product.price}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{product.discount}% off</span>
                </>
              )}
            </div>
            {savings > 0 && <p style={{ fontSize: 13, color: '#34d399' }}>You save ₹{savings.toFixed(0)}</p>}
          </div>

          {/* Stock */}
          <div style={{ marginBottom: 16 }}>
            {product.stock === 0 ? (
              <span style={{ color: '#f87171', fontWeight: 600 }}>❌ Out of Stock</span>
            ) : product.stock <= 10 ? (
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚡ Only {product.stock} left in stock!</span>
            ) : (
              <span style={{ color: '#34d399', fontWeight: 600 }}>✓ In Stock ({product.stock} available)</span>
            )}
          </div>

          {/* Qty selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>Qty:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,.08)', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--t1)', fontSize: 16 }}>−</button>
              <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--t1)', fontSize: 16 }}>+</button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={addToCart} disabled={product.stock === 0} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <FiShoppingCart size={16} /> Add to Cart
            </button>
            <button onClick={buyNow} disabled={product.stock === 0} style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: 12, color: '#fff', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,.3)', transition: 'all .2s' }}>
              ⚡ Buy Now
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleWishlist} className="btn-ghost" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <FiHeart size={14} style={{ fill: wishlisted ? '#ef4444' : 'none', color: wishlisted ? '#ef4444' : 'var(--t2)' }}/> {wishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>
            <button className="btn-ghost" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <FiShare2 size={14}/> Share
            </button>
          </div>

          {/* Delivery info */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              [FiTruck, 'Free delivery on orders above ₹499', '#34d399'],
              [FiShield, '7-day easy returns', '#6366f1'],
              [FiPackage, product.shipping || 'Usually ships in 2-3 business days', '#f59e0b'],
            ].map(([Icon, text, color], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 8 }}>
                <Icon size={14} style={{ color, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: 'var(--t2)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Seller info */}
          {store && (
            <Link to={`/marketplace/store/${store.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, flexShrink: 0 }}>
                  {store.logo ? <img src={store.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}/> : '🏪'}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)' }}>{store.name || product.store_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>Visit store → {store.total_sales || 0} sales · {(store.followers?.length || 0)} followers</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Description + Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 40 }}>
        <div className="card au" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 14 }}>Product Description</h3>
          <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{product.description || 'No description provided.'}</p>
        </div>
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="card au1" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 14 }}>Specifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="card au" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--t1)', marginBottom: 6 }}>Customer Reviews</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#fbbf24' }}>{(product.avg_rating || 0).toFixed(1)}</span>
              <div>
                <Stars rating={product.avg_rating || 0} size={18}/>
                <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{product.review_count || 0} reviews</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowReviewForm(s => !s)} className="btn-primary" style={{ fontSize: 13 }}>
            ✍️ Write Review
          </button>
        </div>

        {showReviewForm && (
          <form onSubmit={submitReview} className="au" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Your Rating</label>
              <Stars rating={reviewForm.rating} size={24} interactive onRate={r => setReviewForm(f => ({ ...f, rating: r }))}/>
            </div>
            <input className="input" placeholder="Review title" value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}/>
            <textarea className="input" rows={4} placeholder="Share your experience with this product…" value={reviewForm.body} onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))} style={{ resize: 'vertical' }}/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submittingReview} className="btn-primary" style={{ fontSize: 13 }}>
                {submittingReview ? 'Submitting…' : 'Submit Review'}
              </button>
              <button type="button" onClick={() => setShowReviewForm(false)} className="btn-ghost" style={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '24px 0', fontSize: 14 }}>No reviews yet. Be the first to review!</p>
          ) : reviews.map((rev, i) => (
            <div key={rev.id} className="au" style={{ animationDelay: `${i*.04}s`, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {rev.user_avatar ? <img src={rev.user_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : rev.user_name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{rev.user_name}</span>
                    <Stars rating={rev.rating} size={12}/>
                    {rev.verified && <span style={{ fontSize: 10, background: 'rgba(52,211,153,.15)', color: '#34d399', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>✓ Verified</span>}
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>{formatDistanceToNow(new Date(rev.created_at), { addSuffix: true })}</span>
                  </div>
                  {rev.title && <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)', marginBottom: 4 }}>{rev.title}</p>}
                  <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>{rev.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="au">
          <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--t1)', marginBottom: 14 }}>Similar Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            {related.map(rp => {
              const dp = rp.discount > 0 ? rp.price * (1 - rp.discount / 100) : rp.price
              return (
                <Link key={rp.id} to={`/marketplace/product/${rp.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover" style={{ overflow: 'hidden' }}>
                    <div style={{ paddingTop: '75%', position: 'relative', background: 'rgba(255,255,255,.05)' }}>
                      {rp.images?.[0] ? <img src={rp.images[0]} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }}/> : <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28 }}>📦</div>}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rp.name}</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>₹{dp.toFixed(0)}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
