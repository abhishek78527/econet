import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPackage, FiDollarSign, FiTrendingUp, FiAlertTriangle, FiUsers, FiMapPin, FiCheck, FiX, FiTruck, FiClock, FiBarChart2 } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'

const STATUS_CFG = {
  pending:   { color:'#f59e0b', bg:'rgba(245,158,11,.15)',  label:'Pending',   icon:'⏳' },
  confirmed: { color:'#6366f1', bg:'rgba(99,102,241,.15)',  label:'Confirmed', icon:'✓'  },
  shipped:   { color:'#06b6d4', bg:'rgba(6,182,212,.15)',   label:'Shipped',   icon:'🚚' },
  delivered: { color:'#34d399', bg:'rgba(52,211,153,.15)',  label:'Delivered', icon:'✅' },
  cancelled: { color:'#f87171', bg:'rgba(248,113,113,.15)', label:'Cancelled', icon:'❌' },
}

export default function RetailerDashboard() {
  const [stats, setStats]   = useState(null)
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.get('/orders/seller/stats'),
          api.get('/orders/seller'),
        ])
        setStats(statsRes.data)
        setOrders(ordersRes.data.orders || [])
      } catch { toast.error('Could not load dashboard') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function updateStatus(orderId, status) {
    setUpdating(orderId)
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      toast.success(`Order marked as ${status}`)
    } catch { toast.error('Could not update status') }
    finally { setUpdating(null) }
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'cod')  return o.payment_mode === 'cod'
    if (filter === 'paid') return o.payment_mode !== 'cod'
    if (filter === 'pending')   return o.status === 'pending'
    if (filter === 'confirmed') return o.status === 'confirmed'
    if (filter === 'shipped')   return o.status === 'shipped'
    return true
  })

  if (loading) return <div style={{ maxWidth:1200,margin:'80px auto',padding:'0 20px',color:'var(--t3)',textAlign:'center' }}>Loading dashboard…</div>

  return (
    <div style={{ maxWidth:1200,margin:'0 auto',padding:'72px 20px 40px',position:'relative',zIndex:1 }}>
      <div className="au" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:24,fontWeight:800,color:'var(--t1)',letterSpacing:'-0.5px' }}>📊 Retailer Dashboard</h1>
          <p style={{ fontSize:13,color:'var(--t3)',marginTop:2 }}>Manage your orders, products, and analytics</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <Link to="/marketplace/store/me" className="btn-ghost" style={{ textDecoration:'none',border:'1px solid var(--border)',borderRadius:10,padding:'8px 14px',fontSize:13 }}>🏪 My Store</Link>
          <Link to="/marketplace/sell" className="btn-primary" style={{ textDecoration:'none',borderRadius:10,padding:'8px 16px',fontSize:13 }}>+ Add Product</Link>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="au1" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
          {[
            [FiDollarSign, `₹${(stats.revenue||0).toFixed(0)}`, 'Revenue',        '#34d399'],
            [FiPackage,    stats.total_orders||0,               'Total Orders',   '#6366f1'],
            [FiTrendingUp, stats.total_sold||0,                 'Units Sold',     '#ec4899'],
            [FiBarChart2,  stats.products_listed||0,            'Products Live',  '#f59e0b'],
          ].map(([Icon,val,label,color],i) => (
            <div key={i} className="card" style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                <div style={{ width:32,height:32,borderRadius:8,background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Icon size={15} style={{ color }}/>
                </div>
                <span style={{ fontSize:11,color:'var(--t3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px' }}>{label}</span>
              </div>
              <p style={{ fontSize:24,fontWeight:800,color,fontFamily:'DM Mono' }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* COD vs Paid */}
      {stats && (
        <div className="au2" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
          <div className="card" style={{ padding:'16px 18px',display:'flex',gap:14,alignItems:'center' }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'rgba(245,158,11,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>💵</div>
            <div>
              <p style={{ fontSize:20,fontWeight:800,color:'#fbbf24',fontFamily:'DM Mono' }}>{stats.cod_orders||0}</p>
              <p style={{ fontSize:12,color:'var(--t3)',fontWeight:600 }}>COD Orders</p>
            </div>
          </div>
          <div className="card" style={{ padding:'16px 18px',display:'flex',gap:14,alignItems:'center' }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'rgba(52,211,153,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>💳</div>
            <div>
              <p style={{ fontSize:20,fontWeight:800,color:'#34d399',fontFamily:'DM Mono' }}>{stats.paid_orders||0}</p>
              <p style={{ fontSize:12,color:'var(--t3)',fontWeight:600 }}>Online Paid Orders</p>
            </div>
          </div>
        </div>
      )}

      {/* Low stock alerts */}
      {stats?.low_stock_alerts?.length > 0 && (
        <div className="card au2" style={{ padding:'14px 18px',marginBottom:20,border:'1px solid rgba(245,158,11,.3)',background:'rgba(245,158,11,.04)' }}>
          <h3 style={{ fontWeight:700,fontSize:14,color:'#fbbf24',marginBottom:10,display:'flex',alignItems:'center',gap:6 }}>
            <FiAlertTriangle size={14}/> Low Stock Alerts ({stats.low_stock_alerts.length} products)
          </h3>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {stats.low_stock_alerts.map(p => (
              <Link key={p.id} to={`/marketplace/product/${p.id}`} style={{ textDecoration:'none',display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:'rgba(245,158,11,.12)',border:'1px solid rgba(245,158,11,.25)',borderRadius:999,fontSize:12,color:'#fbbf24',fontWeight:600 }}>
                {p.name} — {p.stock} left
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="card au3" style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <h3 style={{ fontWeight:700,fontSize:16,color:'var(--t1)' }}>Customer Orders ({filteredOrders.length})</h3>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            {[['all','All'],['pending','Pending'],['confirmed','Confirmed'],['shipped','Shipped'],['cod','COD'],['paid','Paid']].map(([val,label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'Inter',fontSize:11,fontWeight:600,background:filter===val?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(255,255,255,.07)',color:filter===val?'#fff':'var(--t3)',transition:'all .15s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div style={{ padding:'48px 24px',textAlign:'center',color:'var(--t3)' }}>
            <FiPackage size={32} style={{ marginBottom:12,opacity:.3 }}/>
            <p>No orders found</p>
          </div>
        ) : (
          filteredOrders.map((order, i) => {
            const sc = STATUS_CFG[order.status] || STATUS_CFG.pending
            // Parse address string or object
            const addr = typeof order.address === 'string' ? order.address : `${order.address?.house||''} ${order.address?.street||''} ${order.address?.city||''} ${order.address?.pincode||''}`
            const lat  = order.address?.lat
            const lng  = order.address?.lng

            return (
              <div key={order.id} className="au" style={{ animationDelay:`${i*.03}s`,padding:'16px 18px',borderBottom:'1px solid rgba(255,255,255,.04)',transition:'background .12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.03)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:16,alignItems:'start' }}>
                  <div>
                    {/* Order header */}
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8,flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700,fontSize:13,color:'var(--t1)',fontFamily:'DM Mono' }}>#{order.id?.slice(-8).toUpperCase()}</span>
                      <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:sc.bg,color:sc.color }}>{sc.icon} {sc.label}</span>
                      <span style={{ fontSize:11,padding:'2px 8px',borderRadius:999,background:order.payment_mode==='cod'?'rgba(245,158,11,.15)':'rgba(52,211,153,.15)',color:order.payment_mode==='cod'?'#fbbf24':'#34d399',fontWeight:600 }}>
                        {order.payment_mode==='cod'?'💵 COD':'💳 Paid'}
                      </span>
                      <span style={{ fontSize:11,color:'var(--t3)' }}>{formatDistanceToNow(new Date(order.created_at),{addSuffix:true})}</span>
                    </div>

                    {/* Items */}
                    <div style={{ display:'flex',gap:8,marginBottom:10,flexWrap:'wrap' }}>
                      {order.items?.map((item,j) => (
                        <div key={j} style={{ display:'flex',gap:8,alignItems:'center',padding:'6px 10px',background:'rgba(255,255,255,.04)',borderRadius:8 }}>
                          <div style={{ width:32,height:32,borderRadius:6,background:'rgba(255,255,255,.06)',overflow:'hidden',flexShrink:0 }}>
                            {item.image ? <img src={item.image} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>📦</div>}
                          </div>
                          <div>
                            <p style={{ fontSize:12,fontWeight:600,color:'var(--t1)' }}>{item.product_name}</p>
                            <p style={{ fontSize:11,color:'var(--t3)' }}>Qty: {item.qty} × ₹{item.price?.toFixed(0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Customer & address */}
                    <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
                      <div style={{ fontSize:12,color:'var(--t2)',display:'flex',alignItems:'flex-start',gap:5 }}>
                        <FiMapPin size={11} style={{ marginTop:2,flexShrink:0,color:'#a5b4fc' }}/> {addr}
                      </div>
                      {lat && lng && (
                        <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer" style={{ fontSize:11,color:'#a5b4fc',textDecoration:'none',display:'flex',alignItems:'center',gap:4,background:'rgba(99,102,241,.12)',padding:'2px 8px',borderRadius:999 }}>
                          🗺️ View on Map
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign:'right',minWidth:160 }}>
                    <p style={{ fontSize:18,fontWeight:800,color:'#34d399',fontFamily:'DM Mono',marginBottom:10 }}>₹{order.total?.toFixed(0)}</p>
                    {/* Status update buttons */}
                    <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                      {order.status==='pending' && (
                        <button onClick={() => updateStatus(order.id,'confirmed')} disabled={updating===order.id} style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:600,padding:'6px 12px',cursor:'pointer',fontFamily:'Inter',display:'flex',alignItems:'center',gap:5,justifyContent:'center' }}>
                          <FiCheck size={12}/> Confirm Order
                        </button>
                      )}
                      {order.status==='confirmed' && (
                        <button onClick={() => updateStatus(order.id,'shipped')} disabled={updating===order.id} style={{ background:'linear-gradient(135deg,#06b6d4,#6366f1)',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:600,padding:'6px 12px',cursor:'pointer',fontFamily:'Inter',display:'flex',alignItems:'center',gap:5,justifyContent:'center' }}>
                          <FiTruck size={12}/> Mark Shipped
                        </button>
                      )}
                      {order.status==='shipped' && (
                        <button onClick={() => updateStatus(order.id,'delivered')} disabled={updating===order.id} style={{ background:'linear-gradient(135deg,#10b981,#34d399)',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:600,padding:'6px 12px',cursor:'pointer',fontFamily:'Inter',display:'flex',alignItems:'center',gap:5,justifyContent:'center' }}>
                          <FiCheck size={12}/> Mark Delivered
                        </button>
                      )}
                      {!['delivered','cancelled'].includes(order.status) && (
                        <button onClick={() => updateStatus(order.id,'cancelled')} disabled={updating===order.id} style={{ background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.2)',borderRadius:8,color:'#f87171',fontSize:11,fontWeight:600,padding:'5px 12px',cursor:'pointer',fontFamily:'Inter' }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
