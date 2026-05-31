import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiTrash2, FiShoppingBag, FiArrowLeft, FiShield, FiTruck, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function CartPage() {
  const [cart, setCart]   = useState({ items:[] })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function load() {
    try { const { data } = await api.get('/cart'); setCart(data.cart||{items:[]}); setTotal(data.total||0) }
    catch { toast.error('Could not load cart') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function updateQty(productId, qty) {
    try { await api.put('/cart/qty', { product_id:productId, qty }); load() }
    catch { toast.error('Could not update') }
  }

  async function removeItem(productId) {
    try { await api.delete(`/cart/${productId}`); toast.success('Removed'); load() }
    catch { toast.error('Could not remove') }
  }

  const shipping  = total > 499 ? 0 : 49
  const tax       = +(total * 0.18).toFixed(2)
  const grandTotal = +(total + shipping + tax).toFixed(2)

  if (loading) return (
    <div style={{ maxWidth:900,margin:'0 auto',padding:'80px 20px' }}>
      {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:90,borderRadius:12,marginBottom:10 }}/>)}
    </div>
  )

  return (
    <div style={{ maxWidth:900,margin:'0 auto',padding:'72px 20px 40px',position:'relative',zIndex:1 }}>
      <div className="au" style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
        <Link to="/marketplace" className="btn-ghost" style={{ border:'1px solid var(--border)',borderRadius:10,padding:'7px 14px',display:'flex',alignItems:'center',gap:6,textDecoration:'none',fontSize:13 }}>
          <FiArrowLeft size={14}/> Shop
        </Link>
        <h1 style={{ fontSize:22,fontWeight:800,color:'var(--t1)' }}>🛒 Shopping Cart</h1>
        <span style={{ fontSize:13,color:'var(--t3)' }}>({cart.items?.length||0} items)</span>
      </div>

      {!cart.items?.length ? (
        <div className="card" style={{ padding:'64px 24px',textAlign:'center' }}>
          <div style={{ fontSize:56,marginBottom:16 }}>🛒</div>
          <p style={{ fontWeight:700,fontSize:18,color:'var(--t2)',marginBottom:8 }}>Your cart is empty</p>
          <Link to="/marketplace" className="btn-primary" style={{ textDecoration:'none',padding:'10px 24px',display:'inline-flex',alignItems:'center',gap:6 }}>
            <FiShoppingBag size={15}/> Browse Products
          </Link>
        </div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 320px',gap:20,alignItems:'start' }}>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {cart.items.map((item,i) => {
              const p  = item.product
              const dp = p ? (p.discount>0 ? p.price*(1-p.discount/100) : p.price) : item.price
              return (
                <div key={i} className="card au" style={{ animationDelay:`${i*.05}s`,padding:'14px 18px',display:'flex',gap:14,alignItems:'center' }}>
                  <div style={{ width:72,height:72,borderRadius:10,overflow:'hidden',background:'rgba(255,255,255,.05)',flexShrink:0 }}>
                    {p?.images?.[0]?<img src={p.images[0]} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28 }}>📦</div>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontWeight:600,fontSize:14,color:'var(--t1)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p?.name||'Product'}</p>
                    <p style={{ fontSize:12,color:'var(--t3)',marginBottom:6 }}>{p?.category}{p?.store_name?` · by ${p.store_name}`:''}</p>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <div style={{ display:'flex',alignItems:'center',background:'rgba(255,255,255,.08)',borderRadius:8,overflow:'hidden' }}>
                        <button onClick={()=>updateQty(item.product_id,item.qty-1)} style={{ width:28,height:28,border:'none',background:'none',cursor:'pointer',color:'var(--t1)',fontSize:15 }}>−</button>
                        <span style={{ width:28,textAlign:'center',fontSize:13,fontWeight:700,color:'var(--t1)' }}>{item.qty}</span>
                        <button onClick={()=>updateQty(item.product_id,item.qty+1)} style={{ width:28,height:28,border:'none',background:'none',cursor:'pointer',color:'var(--t1)',fontSize:15 }}>+</button>
                      </div>
                      <span style={{ fontSize:14,fontWeight:800,color:'#34d399',fontFamily:'DM Mono' }}>₹{(dp*item.qty).toFixed(0)}</span>
                      {p?.discount>0&&<span style={{ fontSize:11,color:'var(--t3)',textDecoration:'line-through' }}>₹{(p.price*item.qty).toFixed(0)}</span>}
                    </div>
                  </div>
                  <button onClick={()=>removeItem(item.product_id)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--t3)',padding:8,borderRadius:8,transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.1)';e.currentTarget.style.color='#f87171'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='var(--t3)'}}>
                    <FiTrash2 size={15}/>
                  </button>
                </div>
              )
            })}
          </div>

          <div className="card au1" style={{ padding:22,position:'sticky',top:72 }}>
            <h3 style={{ fontWeight:700,fontSize:16,color:'var(--t1)',marginBottom:16 }}>Order Summary</h3>
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:16 }}>
              {[
                ['Subtotal',  `₹${total.toFixed(0)}`,        'var(--t2)'],
                ['Shipping',  shipping===0?'FREE':`₹${shipping}`, shipping===0?'#34d399':'var(--t2)'],
                ['GST (18%)', `₹${tax.toFixed(0)}`,          'var(--t2)'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ display:'flex',justifyContent:'space-between',fontSize:13 }}>
                  <span style={{ color:'var(--t2)' }}>{l}</span>
                  <span style={{ color:c }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop:'1px solid var(--border)',paddingTop:10,display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:800 }}>
                <span style={{ color:'var(--t1)' }}>Total</span>
                <span style={{ color:'#34d399',fontFamily:'DM Mono' }}>₹{grandTotal.toFixed(0)}</span>
              </div>
              {total < 499 && <p style={{ fontSize:11,color:'#f59e0b',textAlign:'center' }}>Add ₹{(499-total).toFixed(0)} more for FREE delivery!</p>}
            </div>
            <button onClick={()=>navigate('/marketplace/checkout')} className="btn-primary" style={{ width:'100%',padding:'13px',fontSize:15,fontWeight:700,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              Proceed to Checkout <FiArrowRight size={15}/>
            </button>
            <div style={{ marginTop:14,display:'flex',flexDirection:'column',gap:6 }}>
              {[[FiShield,'100% Secure Payments'],[FiTruck,'Free delivery above ₹499']].map(([Icon,text],i)=>(
                <div key={i} style={{ display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--t3)' }}>
                  <Icon size={12} style={{ color:'#34d399' }}/>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
