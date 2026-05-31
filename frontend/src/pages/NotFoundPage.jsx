import { Link } from 'react-router-dom'
export default function NotFoundPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', background:'var(--bg)', position:'relative', zIndex:1 }}>
      <div>
        <h1 style={{ fontSize:80, fontWeight:800, color:'rgba(99,102,241,.3)', letterSpacing:-4 }}>404</h1>
        <p style={{ color:'var(--t2)', fontWeight:600, fontSize:18, marginBottom:6 }}>Page not found</p>
        <p style={{ color:'var(--t3)', fontSize:14, marginBottom:24 }}>The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary" style={{ textDecoration:'none', padding:'10px 24px' }}>Back to Feed</Link>
      </div>
    </div>
  )
}
