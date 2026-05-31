import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiPackage, FiTruck, FiCheck, FiX, FiClock, FiRefreshCw, FiDownload, FiMapPin } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'

const STATUS_CFG = {
  pending:   { color:'#f59e0b', bg:'rgba(245,158,11,.15)',  icon:FiClock,   label:'Pending'   },
  confirmed: { color:'#6366f1', bg:'rgba(99,102,241,.15)',  icon:FiCheck,   label:'Confirmed' },
  shipped:   { color:'#06b6d4', bg:'rgba(6,182,212,.15)',   icon:FiTruck,   label:'Shipped'   },
  delivered: { color:'#34d399', bg:'rgba(52,211,153,.15)',  icon:FiCheck,   label:'Delivered' },
  cancelled: { color:'#f87171', bg:'rgba(248,113,113,.15)', icon:FiX,       label:'Cancelled' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [stats,  setStats]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(null)
  const [searchParams] = useSearchParams()
  const success = searchParams.get('success')

  useEffect(() => {
    Promise.all([api.get('/orders'), api.get('/orders/stats')])
      .then(([o, s]) => { setOrders(o.data.orders||[]); setStats(s.data.stats) })
      .catch(() => toast.error('Could not load orders'))
      .finally(() => setLoading(false))
  }, [])

  async function reorder(orderId) {
    setReordering(orderId)
    try { await api.post(`/orders/${orderId}/reorder`); toast.success('Items added to cart!') }
    catch { toast.error('Could not reorder') }
    finally { setReordering(null) }
  }

  if (loading) return <div style={{ maxWidth:900,margin:'80px auto',padding:'0 20px',color:'var(--t3)',textAlign:'center' }}>Loading orders…</div>

  return (
    <div style={{ maxWidth:900,margin:'0 auto',padding:'72px 20px 40px',position:'relative',zIndex:1 }}>
      {success && (
        <div className="card au" style={{ padding:'18px 20px',marginBottom:20,border:'1px solid rgba(52,211,153,.3)',background:'rgba(52,211,153,.06)',display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#34d399)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🎉</div>
          <div>
            <p style={{ fontWeight:700,fontSize:15,color:'#34d399',marginBottom:2 }}>Order placed successfully!</p>
            <p style={{ fontSize:13,color:'var(--t2)' }}>You'll receive a confirmation email. Track your order below.</p>
          </div>
        </div>
      )}

      <div className="au" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <h1 style={{ fontSize:22,fontWeight:800,color:'var(--t1)' }}>📦 My Orders</h1>
        <Link to="/marketplace" className="btn-ghost" style={{ textDecoration:'none',border:'1px solid var(--border)',borderRadius:10,padding:'7px 14px',fontSize:13 }}>Continue Shopping</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="au1" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20 }}>
          {[['💰',`₹${(stats.total_spent||0).toFixed(0)}`,'Total Spent'],['🛒',stats.total_orders||0,'Orders Placed'],['📊',`₹${(stats.avg_order_value||0).toFixed(0)}`,'Avg Order']].map(([emoji,val,label],i) => (
            <div key={i} className="card" style={{ padding:'14px 16px',textAlign:'center' }}>
              <p style={{ fontSize:22,marginBottom:4 }}>{emoji}</p>
              <p style={{ fontSize:20,fontWeight:800,color:'#34d399',fontFamily:'DM Mono',marginBottom:2 }}>{val}</p>
              <p style={{ fontSize:11,color:'var(--t3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card" style={{ padding:'60px 24px',textAlign:'center' }}>
          <div style={{ fontSize:52,marginBottom:14 }}>📦</div>
          <p style={{ fontWeight:700,fontSize:16,color:'var(--t2)',marginBottom:6 }}>No orders yet</p>
          <p style={{ fontSize:13,color:'var(--t3)',marginBottom:16 }}>Start shopping to see your orders here</p>
          <Link to="/marketplace" className="btn-primary" style={{ textDecoration:'none',padding:'10px 20px',fontSize:13 }}>Browse Marketplace</Link>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {orders.map((order, i) => {
            const sc = STATUS_CFG[order.status] || STATUS_CFG.pending
            const Icon = sc.icon
            return (
              <div key={order.id} className="card au" style={{ padding:'18px 20px',animationDelay:`${i*.04}s` }}>
                {/* Header */}
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,flexWrap:'wrap',gap:10 }}>
                  <div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4 }}>
                      <span style={{ fontWeight:700,fontSize:13,color:'var(--t1)',fontFamily:'DM Mono' }}>#{order.id?.slice(-8).toUpperCase()}</span>
                      <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:sc.bg,color:sc.color,display:'flex',alignItems:'center',gap:4 }}>
                        <Icon size={10}/> {sc.label}
                      </span>
                      <span style={{ fontSize:11,padding:'2px 8px',borderRadius:999,background:order.payment_mode==='cod'?'rgba(245,158,11,.15)':'rgba(52,211,153,.15)',color:order.payment_mode==='cod'?'#fbbf24':'#34d399',fontWeight:600 }}>
                        {order.payment_mode==='cod'?'💵 COD':'💳 Paid'}
                      </span>
                    </div>
                    <p style={{ fontSize:12,color:'var(--t3)' }}>{formatDistanceToNow(new Date(order.created_at),{addSuffix:true})} · {order.items?.length} item(s)</p>
                  </div>
                  <p style={{ fontSize:20,fontWeight:800,color:'#34d399',fontFamily:'DM Mono' }}>₹{order.total?.toFixed(0)}</p>
                </div>

                {/* Order tracking stepper */}
                <div style={{ display:'flex',alignItems:'center',marginBottom:14,gap:0 }}>
                  {['pending','confirmed','shipped','delivered'].map((step, idx) => {
                    const steps = ['pending','confirmed','shipped','delivered']
                    const currentIdx = steps.indexOf(order.status)
                    const done  = idx <= currentIdx && order.status !== 'cancelled'
                    const emojis = ['⏳','✓','🚚','✅']
                    return (
                      <div key={step} style={{ display:'flex',alignItems:'center',flex:idx<3?1:'none' }}>
                        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}>
                          <div style={{ width:28,height:28,borderRadius:'50%',background:done?'linear-gradient(135deg,#6366f1,#8b5cf6)':order.status==='cancelled'?'rgba(248,113,113,.2)':'rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:done?'#fff':'var(--t3)',fontWeight:700,boxShadow:done?'0 0 12px rgba(99,102,241,.4)':'none',transition:'all .3s' }}>
                            {order.status==='cancelled'?'×':emojis[idx]}
                          </div>
                          <span style={{ fontSize:9,color:done?'#a5b4fc':'var(--t4)',fontWeight:600,textTransform:'uppercase',whiteSpace:'nowrap' }}>{step}</span>
                        </div>
                        {idx < 3 && <div style={{ flex:1,height:2,background:done&&idx<currentIdx?'linear-gradient(90deg,#6366f1,#8b5cf6)':'rgba(255,255,255,.08)',margin:'0 4px 16px' }}/>}
                      </div>
                    )
                  })}
                </div>

                {/* Items */}
                <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:12 }}>
                  {order.items?.map((item,j) => (
                    <div key={j} style={{ display:'flex',gap:10,alignItems:'center' }}>
                      <div style={{ width:44,height:44,borderRadius:8,background:'rgba(255,255,255,.06)',overflow:'hidden',flexShrink:0 }}>
                        {item.image?<img src={item.image} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>📦</div>}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13,fontWeight:500,color:'var(--t1)' }}>{item.product_name}</p>
                        <p style={{ fontSize:11,color:'var(--t3)' }}>Qty: {item.qty} × ₹{item.price?.toFixed(0)}</p>
                      </div>
                      <p style={{ fontSize:13,fontWeight:700,color:'#34d399',fontFamily:'DM Mono' }}>₹{(item.price*item.qty).toFixed(0)}</p>
                    </div>
                  ))}
                </div>

                {/* Address */}
                {order.address && (
                  <div style={{ display:'flex',alignItems:'flex-start',gap:6,padding:'8px 10px',background:'rgba(255,255,255,.03)',borderRadius:8,marginBottom:12 }}>
                    <FiMapPin size={12} style={{ color:'#a5b4fc',marginTop:2,flexShrink:0 }}/>
                    <p style={{ fontSize:12,color:'var(--t2)',lineHeight:1.5 }}>
                      {typeof order.address==='string' ? order.address : `${order.address.house}, ${order.address.street}, ${order.address.city}, ${order.address.state} ${order.address.pincode}`}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display:'flex',gap:8,paddingTop:10,borderTop:'1px solid var(--border)',flexWrap:'wrap' }}>
                  <button onClick={() => reorder(order.id)} disabled={reordering===order.id} className="btn-ghost" style={{ border:'1px solid var(--border)',borderRadius:10,fontSize:12,display:'flex',alignItems:'center',gap:5,padding:'6px 12px' }}>
                    <FiRefreshCw size={12}/> {reordering===order.id?'Adding…':'Reorder'}
                  </button>
                  {order.invoice_no && (
                    <button className="btn-ghost" style={{ border:'1px solid var(--border)',borderRadius:10,fontSize:12,display:'flex',alignItems:'center',gap:5,padding:'6px 12px' }}>
                      <FiDownload size={12}/> Invoice {order.invoice_no}
                    </button>
                  )}
                  {!['delivered','cancelled'].includes(order.status) && (
                    <span style={{ fontSize:11,color:'var(--t3)',display:'flex',alignItems:'center',gap:4,marginLeft:'auto' }}>
                      <FiClock size={11}/> Est. delivery 3-5 days
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
