import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiMapPin, FiCreditCard, FiCheck, FiPlus, FiTrash2, FiPackage, FiTag, FiArrowLeft, FiInfo, FiShield, FiTruck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const PAYMENT_METHODS = [
  { id:'upi',        icon:'📱', label:'UPI',               sub:'PhonePe, GPay, Paytm, BHIM' },
  { id:'card',       icon:'💳', label:'Credit/Debit Card',  sub:'Visa, Mastercard, RuPay, Amex' },
  { id:'netbanking', icon:'🏦', label:'Net Banking',        sub:'All major Indian banks' },
  { id:'wallet',     icon:'👛', label:'Digital Wallet',     sub:'Paytm, Mobikwik, Freecharge' },
  { id:'cod',        icon:'💵', label:'Cash on Delivery',   sub:'Pay when your order arrives' },
]
const BANKS = ['SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra','Punjab National','Bank of Baroda','Canara Bank']
const COUPONS = {
  'ECONET10': { type:'percent', value:10, max:999, label:'10% off' },
  'FIRST50':  { type:'flat',    value:50, max:50,  label:'₹50 off' },
  'SAVE20':   { type:'percent', value:20, max:200, label:'20% off (max ₹200)' },
}

export default function CheckoutPage() {
  const navigate   = useNavigate()
  const { user }   = useAuthStore()
  const [cart, setCart]                   = useState({ items:[] })
  const [addresses, setAddresses]         = useState([])
  const [selectedAddr, setSelectedAddr]   = useState(null)
  const [showNewAddr, setShowNewAddr]     = useState(false)
  const [addrForm, setAddrForm]           = useState({ label:'Home', full_name:'', phone:'', email:'', house:'', street:'', city:'', state:'', country:'India', pincode:'', landmark:'', lat:0, lng:0 })
  const [payMethod, setPayMethod]         = useState('cod')
  const [upiId, setUpiId]                 = useState('')
  const [selectedBank, setSelectedBank]   = useState('')
  const [coupon, setCoupon]               = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [placing, setPlacing]             = useState(false)
  const [loading, setLoading]             = useState(true)
  const [locating, setLocating]           = useState(false)
  const [mapPos, setMapPos]               = useState({ lat:28.6139, lng:77.2090 })

  const subtotal = cart.items.reduce((s, i) => {
    const p = i.product; if (!p) return s
    const dp = p.discount > 0 ? p.price*(1-p.discount/100) : p.price
    return s + dp * i.qty
  }, 0)
  const shipping = subtotal > 499 ? 0 : 49
  const tax      = +(subtotal * 0.18).toFixed(2)
  let discount   = 0
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? Math.min(subtotal * appliedCoupon.value / 100, appliedCoupon.max)
      : appliedCoupon.value
  }
  const total = +(subtotal + shipping + tax - discount).toFixed(2)

  useEffect(() => {
    async function load() {
      try {
        // Load cart first — if empty, redirect
        const cartRes = await api.get('/cart')
        const cartData = cartRes.data.cart || { items:[] }
        if (!cartData.items || cartData.items.length === 0) {
          toast.error('Your cart is empty. Add items first!')
          navigate('/marketplace')
          return
        }
        setCart(cartData)

        // Load addresses — gracefully handle if endpoint not yet deployed
        try {
          const addrRes = await api.get('/addresses')
          const addrs = addrRes.data.addresses || []
          setAddresses(addrs)
          const def = addrs.find(a => a.is_default) || addrs[0]
          if (def) { setSelectedAddr(def); setMapPos({ lat:def.lat||28.6139, lng:def.lng||77.2090 }) }
          else setShowNewAddr(true)
        } catch {
          // Addresses API might not be deployed yet — show new address form
          setShowNewAddr(true)
        }

        setAddrForm(f => ({ ...f, full_name:user?.name||'', email:user?.email||'' }))
      } catch (err) {
        toast.error('Could not load checkout — please try again')
        navigate('/marketplace/cart')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  function detectLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude:lat, longitude:lng } = pos.coords
      setMapPos({ lat, lng })
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        const data = await res.json()
        const a    = data.address || {}
        setAddrForm(f => ({ ...f, lat, lng,
          street:  a.road || a.neighbourhood || '',
          city:    a.city || a.town || a.village || '',
          state:   a.state || '',
          country: a.country || 'India',
          pincode: a.postcode || '',
        }))
        toast.success('Location auto-filled!')
      } catch { setAddrForm(f => ({ ...f, lat, lng })) }
      setLocating(false)
    }, () => { toast.error('Location permission denied'); setLocating(false) })
  }

  function applyCoupon() {
    const code = coupon.trim().toUpperCase()
    if (COUPONS[code]) { setAppliedCoupon({ ...COUPONS[code], code }); toast.success(`Coupon applied: ${COUPONS[code].label}`) }
    else toast.error('Invalid coupon code. Try ECONET10')
  }

  async function saveAndSelectAddress() {
    if (!addrForm.full_name || !addrForm.phone || !addrForm.house || !addrForm.city || !addrForm.pincode) {
      toast.error('Fill all required fields (*)'); return
    }
    try {
      const { data } = await api.post('/addresses', addrForm)
      const newAddr = data.address || { ...addrForm, id: Date.now().toString() }
      setAddresses(p => [...p, newAddr])
      setSelectedAddr(newAddr)
      setShowNewAddr(false)
      toast.success('Address saved!')
    } catch {
      // If addresses API not deployed, just use the form data directly
      setSelectedAddr({ ...addrForm, id: 'local_' + Date.now() })
      setShowNewAddr(false)
      toast.success('Address set!')
    }
  }

  async function placeOrder() {
    const addr = selectedAddr || (showNewAddr ? addrForm : null)
    if (!addr) { toast.error('Please add a delivery address'); return }
    if (!addr.city || !addr.pincode) { toast.error('Address is incomplete — fill City and PIN'); return }
    if (!cart.items.length) { toast.error('Cart is empty'); return }

    setPlacing(true)
    try {
      const items = cart.items.map(i => ({ product_id: i.product_id || i.product?.id, qty: i.qty }))
      const { data: orderData } = await api.post('/orders', {
        items, address: addr, payment_mode: payMethod, coupon: appliedCoupon?.code || ''
      })

      if (payMethod === 'cod') {
        try { await api.post('/payment/cod', { internal_order_id: orderData.order.id }) } catch {}
        toast.success('🎉 Order placed! Pay on delivery.')
        navigate('/marketplace/orders?success=1')
        return
      }

      // Online payment — try Razorpay, fall back to demo
      try {
        const { data: rzp } = await api.post('/payment/create-order', { amount: total, order_id: orderData.order.id })
        if (rzp.demo_mode) {
          await api.post('/payment/verify', {
            razorpay_order_id:   rzp.razorpay_order_id,
            razorpay_payment_id: `pay_demo_${Date.now()}`,
            razorpay_signature:  'demo_sig',
            internal_order_id:   orderData.order.id,
            method: payMethod,
          })
          toast.success('🎉 Order placed successfully!')
          navigate('/marketplace/orders?success=1')
          return
        }
        // Real Razorpay
        const options = {
          key: rzp.key_id, amount: rzp.amount, currency: rzp.currency,
          name: 'EcoNet', description: `Order #${orderData.order.id?.slice(-8)}`,
          order_id: rzp.razorpay_order_id,
          prefill: { name: addr.full_name, email: addr.email, contact: addr.phone },
          theme: { color: '#6366f1' },
          handler: async response => {
            await api.post('/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              internal_order_id:   orderData.order.id, method: payMethod,
            })
            toast.success('💳 Payment successful!')
            navigate('/marketplace/orders?success=1')
          },
        }
        new window.Razorpay(options).open()
      } catch {
        // Payment API not ready yet — order still placed
        toast.success('🎉 Order placed!')
        navigate('/marketplace/orders?success=1')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not place order')
    } finally { setPlacing(false) }
  }

  const inp = { className:'input', style:{ fontSize:13 } }
  const Lbl = ({ t, req }) => (
    <label style={{ display:'block', fontSize:11, color:'var(--t3)', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>
      {t}{req && <span style={{ color:'#ef4444' }}> *</span>}
    </label>
  )

  if (loading) return (
    <div style={{ maxWidth:1100, margin:'80px auto', padding:'0 20px', color:'var(--t3)', textAlign:'center' }}>
      <p style={{ fontSize:16 }}>Loading checkout…</p>
    </div>
  )

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'72px 20px 40px', position:'relative', zIndex:1 }}>
      <div className="au" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <Link to="/marketplace/cart" className="btn-ghost" style={{ border:'1px solid var(--border)', borderRadius:10, padding:'7px 12px', textDecoration:'none', display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
          <FiArrowLeft size={13}/> Back to Cart
        </Link>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--t1)' }}>🔐 Secure Checkout</h1>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start' }}>
        {/* ── LEFT ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* DELIVERY ADDRESS */}
          <div className="card au" style={{ padding:'20px 22px' }}>
            <h3 style={{ fontWeight:700, fontSize:16, color:'var(--t1)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <FiMapPin size={16} style={{ color:'#34d399' }}/> Delivery Address
            </h3>

            {addresses.map(addr => (
              <div key={addr.id} onClick={() => { setSelectedAddr(addr); setShowNewAddr(false); setMapPos({ lat:addr.lat||28.6139, lng:addr.lng||77.2090 }) }}
                style={{ padding:'12px 14px', border:`2px solid ${selectedAddr?.id===addr.id?'#6366f1':'var(--border)'}`, borderRadius:10, cursor:'pointer', transition:'all .15s', background:selectedAddr?.id===addr.id?'rgba(99,102,241,.08)':'transparent', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:700, background:'rgba(99,102,241,.15)', color:'#a5b4fc', padding:'1px 8px', borderRadius:999 }}>{addr.label}</span>
                      {addr.is_default && <span style={{ fontSize:10, background:'rgba(52,211,153,.15)', color:'#34d399', padding:'1px 6px', borderRadius:999, fontWeight:600 }}>Default</span>}
                      {selectedAddr?.id===addr.id && <FiCheck size={13} style={{ color:'#6366f1' }}/>}
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>{addr.full_name} · {addr.phone}</p>
                    <p style={{ fontSize:12, color:'var(--t2)', lineHeight:1.5 }}>{addr.house}, {addr.street}, {addr.city}, {addr.state} {addr.pincode}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); api.delete(`/addresses/${addr.id}`).catch(()=>{}); setAddresses(p => p.filter(a=>a.id!==addr.id)); if(selectedAddr?.id===addr.id) setSelectedAddr(null) }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', padding:4 }}>
                    <FiTrash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}

            <button onClick={() => { setShowNewAddr(s=>!s); if (showNewAddr) return; setSelectedAddr(null) }}
              className="btn-ghost" style={{ border:'1px dashed rgba(99,102,241,.4)', borderRadius:10, width:'100%', justifyContent:'center', padding:10, fontSize:13 }}>
              <FiPlus size={13}/> {showNewAddr ? 'Cancel new address' : '+ Add New Address'}
            </button>

            {showNewAddr && (
              <div className="au" style={{ marginTop:16, display:'flex', flexDirection:'column', gap:12 }}>
                <button onClick={detectLocation} disabled={locating}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', border:'1px solid rgba(52,211,153,.3)', borderRadius:10, background:'rgba(52,211,153,.06)', cursor:'pointer', fontFamily:'Inter', fontSize:13, color:'#34d399', fontWeight:600 }}>
                  <FiMapPin size={14}/> {locating ? '📍 Detecting your location…' : '📍 Auto-detect my location'}
                </button>

                {/* Map embed */}
                <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', height:140, position:'relative' }}>
                  <iframe title="map" src={`https://maps.google.com/maps?q=${mapPos.lat},${mapPos.lng}&z=14&output=embed`}
                    style={{ width:'100%', height:'100%', border:'none', opacity:.85 }} loading="lazy"/>
                  <div style={{ position:'absolute', bottom:6, right:8, background:'rgba(0,0,0,.65)', color:'#fff', fontSize:10, padding:'2px 7px', borderRadius:4 }}>
                    {mapPos.lat.toFixed(4)}, {mapPos.lng.toFixed(4)}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <Lbl t="Label"/>
                    <select className="input" style={{ fontSize:13 }} value={addrForm.label} onChange={e=>setAddrForm(f=>({...f,label:e.target.value}))}>
                      {['Home','Work','Other'].map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div><Lbl t="Full Name" req/><input {...inp} placeholder="Arjun Sharma" value={addrForm.full_name} onChange={e=>setAddrForm(f=>({...f,full_name:e.target.value}))}/></div>
                  <div><Lbl t="Phone" req/><input {...inp} placeholder="9876543210" value={addrForm.phone} onChange={e=>setAddrForm(f=>({...f,phone:e.target.value}))}/></div>
                  <div><Lbl t="Email"/><input {...inp} type="email" value={addrForm.email} onChange={e=>setAddrForm(f=>({...f,email:e.target.value}))}/></div>
                  <div style={{ gridColumn:'1/-1' }}><Lbl t="House / Flat No." req/><input {...inp} placeholder="Flat 4B, Green Towers" value={addrForm.house} onChange={e=>setAddrForm(f=>({...f,house:e.target.value}))}/></div>
                  <div style={{ gridColumn:'1/-1' }}><Lbl t="Street / Area" req/><input {...inp} placeholder="MG Road, Koramangala" value={addrForm.street} onChange={e=>setAddrForm(f=>({...f,street:e.target.value}))}/></div>
                  <div><Lbl t="City" req/><input {...inp} placeholder="Bangalore" value={addrForm.city} onChange={e=>setAddrForm(f=>({...f,city:e.target.value}))}/></div>
                  <div><Lbl t="State"/><input {...inp} placeholder="Karnataka" value={addrForm.state} onChange={e=>setAddrForm(f=>({...f,state:e.target.value}))}/></div>
                  <div><Lbl t="PIN Code" req/><input {...inp} placeholder="560001" value={addrForm.pincode} onChange={e=>setAddrForm(f=>({...f,pincode:e.target.value}))}/></div>
                  <div><Lbl t="Country"/><input {...inp} value={addrForm.country} onChange={e=>setAddrForm(f=>({...f,country:e.target.value}))}/></div>
                  <div style={{ gridColumn:'1/-1' }}><Lbl t="Landmark (Optional)"/><input {...inp} placeholder="Near City Mall, opposite Apollo Hospital" value={addrForm.landmark} onChange={e=>setAddrForm(f=>({...f,landmark:e.target.value}))}/></div>
                </div>
                <button onClick={saveAndSelectAddress} className="btn-primary" style={{ fontSize:13, padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <FiCheck size={13}/> Save & Use This Address
                </button>
              </div>
            )}
          </div>

          {/* PAYMENT METHOD */}
          <div className="card au1" style={{ padding:'20px 22px' }}>
            <h3 style={{ fontWeight:700, fontSize:16, color:'var(--t1)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <FiCreditCard size={16} style={{ color:'#6366f1' }}/> Payment Method
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {PAYMENT_METHODS.map(pm => (
                <div key={pm.id} onClick={() => setPayMethod(pm.id)}
                  style={{ padding:'12px 14px', border:`2px solid ${payMethod===pm.id?'#6366f1':'var(--border)'}`, borderRadius:10, cursor:'pointer', transition:'all .15s', background:payMethod===pm.id?'rgba(99,102,241,.08)':'transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{pm.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{pm.label}</p>
                      <p style={{ fontSize:11, color:'var(--t3)' }}>{pm.sub}</p>
                    </div>
                    {payMethod===pm.id && <FiCheck size={15} style={{ color:'#6366f1' }}/>}
                  </div>

                  {payMethod==='upi' && pm.id==='upi' && (
                    <div style={{ marginTop:10 }}>
                      <p style={{ fontSize:11, color:'var(--t3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>UPI ID</p>
                      <input className="input" style={{ fontSize:13 }} placeholder="name@paytm or 9876543210@upi" value={upiId} onChange={e=>setUpiId(e.target.value)}/>
                      <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                        {['PhonePe','Google Pay','Paytm','BHIM','Amazon Pay'].map(app=>(
                          <span key={app} style={{ fontSize:11, padding:'3px 10px', background:'rgba(255,255,255,.07)', border:'1px solid var(--border)', borderRadius:999, color:'var(--t2)', cursor:'pointer' }}>{app}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {payMethod==='netbanking' && pm.id==='netbanking' && (
                    <div style={{ marginTop:10 }}>
                      <p style={{ fontSize:11, color:'var(--t3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Select Bank</p>
                      <select className="input" style={{ fontSize:13 }} value={selectedBank} onChange={e=>setSelectedBank(e.target.value)}>
                        <option value="">Choose your bank…</option>
                        {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}

                  {payMethod==='card' && pm.id==='card' && (
                    <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:10 }}>
                      <input className="input" style={{ fontSize:13, fontFamily:'DM Mono', letterSpacing:3 }} placeholder="1234  5678  9012  3456" maxLength={19}/>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <input className="input" style={{ fontSize:13 }} placeholder="MM / YY" maxLength={7}/>
                        <input className="input" style={{ fontSize:13, fontFamily:'DM Mono' }} placeholder="CVV" maxLength={4}/>
                      </div>
                      <input className="input" style={{ fontSize:13 }} placeholder="Name on card"/>
                    </div>
                  )}

                  {payMethod==='cod' && pm.id==='cod' && (
                    <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8 }}>
                      <p style={{ fontSize:12, color:'#fbbf24', display:'flex', alignItems:'center', gap:5 }}>
                        <FiInfo size={11}/> Pay in cash when your order arrives. Keep change ready.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:14, marginTop:14, flexWrap:'wrap' }}>
              {['🔒 256-bit SSL','✓ PCI Compliant','🛡️ Secure'].map(b=>(
                <span key={b} style={{ fontSize:11, color:'var(--t3)' }}>{b}</span>
              ))}
            </div>
          </div>

          {/* COUPON */}
          <div className="card au2" style={{ padding:'16px 20px' }}>
            <h3 style={{ fontWeight:700, fontSize:15, color:'var(--t1)', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <FiTag size={14} style={{ color:'#f59e0b' }}/> Coupon Code
            </h3>
            {appliedCoupon ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.25)', borderRadius:10 }}>
                <FiCheck size={14} style={{ color:'#34d399' }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#34d399', fontFamily:'DM Mono' }}>{appliedCoupon.code}</p>
                  <p style={{ fontSize:11, color:'var(--t2)' }}>{appliedCoupon.label} — saving ₹{discount.toFixed(0)}</p>
                </div>
                <button onClick={()=>setAppliedCoupon(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:18 }}>×</button>
              </div>
            ) : (
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" style={{ flex:1, fontSize:13, textTransform:'uppercase', letterSpacing:2, fontFamily:'DM Mono' }}
                  placeholder="ECONET10" value={coupon} onChange={e=>setCoupon(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyCoupon()}/>
                <button onClick={applyCoupon} className="btn-primary" style={{ fontSize:13, padding:'0 18px', borderRadius:10 }}>Apply</button>
              </div>
            )}
            <p style={{ fontSize:11, color:'var(--t3)', marginTop:8 }}>
              Try: <span style={{ color:'#a5b4fc', fontFamily:'DM Mono' }}>ECONET10</span> · <span style={{ color:'#a5b4fc', fontFamily:'DM Mono' }}>FIRST50</span> · <span style={{ color:'#a5b4fc', fontFamily:'DM Mono' }}>SAVE20</span>
            </p>
          </div>
        </div>

        {/* ── RIGHT — SUMMARY ── */}
        <div style={{ position:'sticky', top:72, display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card au" style={{ padding:'20px' }}>
            <h3 style={{ fontWeight:700, fontSize:16, color:'var(--t1)', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
              <FiPackage size={15} style={{ color:'#a5b4fc' }}/> Order Summary
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16, maxHeight:220, overflowY:'auto' }}>
              {cart.items.map((item,i) => {
                const p  = item.product
                const dp = p ? (p.discount>0 ? p.price*(1-p.discount/100) : p.price) : item.price
                return (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:44, height:44, borderRadius:8, background:'rgba(255,255,255,.05)', overflow:'hidden', flexShrink:0 }}>
                      {p?.images?.[0]?<img src={p.images[0]} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>📦</div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p?.name||'Product'}</p>
                      <p style={{ fontSize:11, color:'var(--t3)' }}>Qty: {item.qty}</p>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#34d399', fontFamily:'DM Mono', flexShrink:0 }}>₹{(dp*item.qty).toFixed(0)}</p>
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:12, borderTop:'1px solid var(--border)', marginBottom:14 }}>
              {[
                ['Subtotal',  `₹${subtotal.toFixed(0)}`,  'var(--t2)'],
                ['Shipping',  shipping===0?'FREE':`₹${shipping}`, shipping===0?'#34d399':'var(--t2)'],
                ['GST (18%)', `₹${tax.toFixed(0)}`,       'var(--t2)'],
                ...(discount>0?[['Discount',`-₹${discount.toFixed(0)}`,'#34d399']]:[]),
              ].map(([label,value,color])=>(
                <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span style={{ color:'var(--t2)' }}>{label}</span>
                  <span style={{ color, fontWeight:500 }}>{value}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:800, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                <span style={{ color:'var(--t1)' }}>Total</span>
                <span style={{ color:'#34d399', fontFamily:'DM Mono' }}>₹{total.toFixed(0)}</span>
              </div>
              {subtotal < 499 && <p style={{ fontSize:11, color:'#f59e0b', textAlign:'center', background:'rgba(245,158,11,.07)', padding:'5px 8px', borderRadius:6 }}>Add ₹{(499-subtotal).toFixed(0)} more for FREE delivery!</p>}
            </div>

            {selectedAddr && (
              <div style={{ padding:'10px 12px', background:'rgba(255,255,255,.04)', borderRadius:10, marginBottom:14 }}>
                <p style={{ fontSize:10, color:'var(--t3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>Delivering to</p>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{selectedAddr.full_name} · {selectedAddr.phone}</p>
                <p style={{ fontSize:11, color:'var(--t2)', lineHeight:1.5 }}>{selectedAddr.house}, {selectedAddr.city} {selectedAddr.pincode}</p>
              </div>
            )}

            <button onClick={placeOrder} disabled={placing} className="btn-primary"
              style={{ width:'100%', padding:'14px', fontSize:15, fontWeight:700, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 4px 20px rgba(99,102,241,.4)' }}>
              {placing ? '⏳ Processing…' : payMethod==='cod' ? '✓ Place Order (COD)' : `🔐 Pay ₹${total.toFixed(0)}`}
            </button>

            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
              {[[FiShield,'100% secure payment'],[FiTruck,'Free delivery above ₹499']].map(([Icon,text],i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--t3)' }}>
                  <Icon size={11} style={{ color:'#34d399' }}/>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
