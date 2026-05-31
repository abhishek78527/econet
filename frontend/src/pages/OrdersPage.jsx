import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPackage, FiTruck, FiCheck, FiX, FiClock } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import api from '../lib/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,.15)', icon: FiClock,   label: 'Pending'   },
  confirmed: { color: '#6366f1', bg: 'rgba(99,102,241,.15)', icon: FiCheck,   label: 'Confirmed' },
  shipped:   { color: '#06b6d4', bg: 'rgba(6,182,212,.15)',  icon: FiTruck,   label: 'Shipped'   },
  delivered: { color: '#34d399', bg: 'rgba(52,211,153,.15)', icon: FiCheck,   label: 'Delivered' },
  cancelled: { color: '#f87171', bg: 'rgba(248,113,113,.15)',icon: FiX,       label: 'Cancelled' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/orders'), api.get('/orders/stats')])
      .then(([o, s]) => { setOrders(o.data.orders || []); setStats(s.data.stats) })
      .catch(() => toast.error('Could not load orders'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ maxWidth: 900, margin: '80px auto', padding: '0 20px', color: 'var(--t3)', textAlign: 'center' }}>Loading orders…</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '72px 20px 40px', position: 'relative', zIndex: 1 }}>
      <div className="au" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>📦 My Orders</h1>
        <Link to="/marketplace" className="btn-ghost" style={{ textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>Continue Shopping</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="au1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {[['💰', `₹${stats.total_spent?.toFixed(0)}`, 'Total Spent'],['🛒', stats.total_orders, 'Orders Placed'],['📊', `₹${stats.avg_order_value?.toFixed(0)}`, 'Avg Order Value']].map(([emoji, val, label], i) => (
            <div key={i} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono', marginBottom: 2 }}>{val}</p>
              <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📦</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--t2)', marginBottom: 6 }}>No orders yet</p>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16 }}>Start shopping to see your orders here</p>
          <Link to="/marketplace" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 13 }}>Browse Marketplace</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((order, i) => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const Icon = sc.icon
            return (
              <div key={order.id} className="card au" style={{ padding: '18px 20px', animationDelay: `${i*.04}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)', marginBottom: 2 }}>Order #{order.id?.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize: 12, color: 'var(--t3)' }}>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })} · {order.payment_mode || 'COD'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                    <Icon size={12}/> {sc.label}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {order.items?.map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,.06)', overflow: 'hidden', flexShrink: 0 }}>
                        {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{item.product_name}</p>
                        <p style={{ fontSize: 12, color: 'var(--t3)' }}>Qty: {item.qty} × ₹{item.price?.toFixed(0)}</p>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', fontFamily: 'DM Mono' }}>₹{(item.price * item.qty).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>📍 {order.address}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#34d399', fontFamily: 'DM Mono' }}>Total: ₹{order.total?.toFixed(0)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
