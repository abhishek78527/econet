import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { FiHome, FiBookOpen, FiMessageCircle, FiUser, FiSearch, FiBell, FiX, FiCheck, FiTrendingUp, FiShoppingBag } from 'react-icons/fi'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const NAV = [
  { to:'/',        icon:FiHome,          label:'Home',    end:true },
  { to:'/market',  icon:FiTrendingUp,    label:'Market'        },
  { to:'/marketplace', icon:FiShoppingBag, label:'Shop' },
  { to:'/blogs',   icon:FiBookOpen,      label:'Blogs'         },
  { to:'/chat',    icon:FiMessageCircle, label:'Chat'          },
  { to:'/profile', icon:FiUser,          label:'Profile'       },
]
const NOTIFS_DEFAULT = [
  { id:1, icon:'👍', text:'Rahul liked your post', time:'2m ago', read:false },
  { id:2, icon:'💬', text:'Priya commented on your post', time:'15m ago', read:false },
  { id:3, icon:'📈', text:'RELIANCE is up 2.3% today', time:'1h ago', read:false },
  { id:4, icon:'🤝', text:'3 new people followed you', time:'2h ago', read:true },
]

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showMe, setShowMe] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchRes, setSearchRes] = useState([])
  const [searching, setSearching] = useState(false)
  const [notifs, setNotifs] = useState(NOTIFS_DEFAULT)
  const [unreadDMs, setUnreadDMs] = useState(0)
  const meRef = useRef(null); const notifRef = useRef(null); const searchRef = useRef(null)
  const unread = notifs.filter(n => !n.read).length
  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']

  useEffect(() => {
    function h(e) {
      if (meRef.current && !meRef.current.contains(e.target)) setShowMe(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    async function checkDMs() {
      try { const { data } = await api.get('/dm/conversations'); setUnreadDMs((data.conversations||[]).reduce((s,c)=>s+(c.unread_count||0),0)) } catch {}
    }
    checkDMs(); const t = setInterval(checkDMs, 10000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try { const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQ)}`); setSearchRes((data.users||[]).slice(0,5)) }
      catch { setSearchRes([]) } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQ])

  return (
    <nav style={{ position:'fixed',top:0,left:0,right:0,zIndex:200,background:'rgba(10,15,30,.92)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,.07)',height:'var(--nav-h)',display:'flex',alignItems:'center',padding:'0 20px' }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(99,102,241,.6),rgba(16,185,129,.4),transparent)' }}/>

      <div style={{ maxWidth:1300,margin:'0 auto',width:'100%',display:'flex',alignItems:'center',gap:8,position:'relative',zIndex:1 }}>
        {/* EcoNet Logo */}
        <Link to="/" style={{ display:'flex',alignItems:'center',gap:8,textDecoration:'none',marginRight:8,flexShrink:0 }}>
          <div style={{ width:32,height:32,background:'linear-gradient(135deg,#10b981,#6366f1)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(16,185,129,.4)' }}>
            <span style={{ fontSize:17 }}>🌿</span>
          </div>
          <span style={{ fontSize:17,fontWeight:800,color:'#fff',letterSpacing:'-0.3px' }}>
            Eco<span style={{ color:'#34d399' }}>Net</span>
          </span>
        </Link>

        {/* Search */}
        <div ref={searchRef} style={{ position:'relative',flex:'0 0 200px' }}>
          <FiSearch size={13} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--t3)',zIndex:1 }}/>
          <input placeholder="Search people…" value={searchQ} onChange={e=>{setSearchQ(e.target.value);setShowSearch(true)}} onFocus={()=>setShowSearch(true)}
            style={{ width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'7px 10px 7px 30px',fontSize:13,fontFamily:'Inter',color:'var(--t1)',outline:'none',transition:'all .2s' }}
            onFocus2={e=>{e.target.style.borderColor='rgba(99,102,241,.4)'}}/>
          {showSearch && searchQ && (
            <div className="pop" style={{ position:'absolute',top:'calc(100% + 6px)',left:0,width:300,background:'rgba(13,21,53,.97)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,boxShadow:'0 16px 48px rgba(0,0,0,.6)',zIndex:300,overflow:'hidden' }}>
              {searching ? <div style={{ padding:'14px 16px',color:'var(--t3)',fontSize:13 }}>Searching…</div>
              : searchRes.length===0 ? (
                <div style={{ padding:'12px 14px' }}>
                  <p style={{ color:'var(--t3)',fontSize:13,marginBottom:6 }}>No users found</p>
                  <button onClick={()=>{navigate(`/search?q=${encodeURIComponent(searchQ)}`);setShowSearch(false)}} style={{ fontSize:12,color:'#a5b4fc',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter' }}>View all results →</button>
                </div>
              ) : searchRes.map(u=>{
                const ac=COLORS[(u.name?.charCodeAt(0)||0)%COLORS.length]
                return (
                  <Link key={u.id} to={`/u/${u.username||u.id}`} onClick={()=>{setShowSearch(false);setSearchQ('')}} style={{ display:'flex',gap:10,padding:'10px 14px',textDecoration:'none',transition:'background .12s',alignItems:'center' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{ width:32,height:32,borderRadius:'50%',background:ac,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0 }}>
                      {u.avatar?<img src={u.avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:u.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:600,color:'var(--t1)' }}>{u.name}</p>
                      <p style={{ fontSize:11,color:'var(--t3)' }}>@{u.username} · {u.role}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ display:'flex',alignItems:'stretch',marginLeft:'auto',height:'var(--nav-h)' }}>
          {NAV.map(({ to, icon:Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:3,padding:'0 12px',textDecoration:'none',minWidth:50,position:'relative',
              borderBottom:isActive?'2px solid #34d399':'2px solid transparent',
              color:isActive?'#34d399':'var(--t2)',transition:'color .12s',
            })}>
              <div style={{ position:'relative' }}>
                <Icon size={18}/>
                {to==='/chat' && unreadDMs>0 && <span style={{ position:'absolute',top:-5,right:-7,background:'#ef4444',color:'#fff',borderRadius:999,fontSize:9,fontWeight:700,padding:'1px 4px',minWidth:14,textAlign:'center' }}>{unreadDMs}</span>}
              </div>
              <span style={{ fontSize:11,fontWeight:500,whiteSpace:'nowrap' }}>{label}</span>
            </NavLink>
          ))}

          {/* Notifs */}
          <div ref={notifRef} style={{ position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 12px',cursor:'pointer',minWidth:50 }}>
            <div style={{ position:'relative' }} onClick={()=>{setShowNotif(s=>!s);setShowMe(false)}}>
              <FiBell size={18} style={{ color:showNotif?'#34d399':'var(--t2)' }}/>
              {unread>0 && <span className="pop" style={{ position:'absolute',top:-5,right:-7,background:'#ef4444',color:'#fff',borderRadius:999,fontSize:9,fontWeight:700,padding:'1px 4px',minWidth:14,textAlign:'center' }}>{unread}</span>}
            </div>
            <span style={{ fontSize:11,fontWeight:500,color:'var(--t2)' }}>Notifs</span>
            {showNotif && (
              <div className="pop" style={{ position:'absolute',top:'calc(100% + 6px)',right:-60,width:340,background:'rgba(13,21,53,.97)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,boxShadow:'0 16px 48px rgba(0,0,0,.6)',zIndex:300,overflow:'hidden' }}>
                <div style={{ padding:'12px 16px 8px',display:'flex',justifyContent:'space-between',borderBottom:'1px solid var(--border)' }}>
                  <h3 style={{ fontWeight:700,fontSize:15,color:'var(--t1)' }}>Notifications</h3>
                  {unread>0 && <button onClick={()=>setNotifs(n=>n.map(x=>({...x,read:true})))} style={{ fontSize:12,fontWeight:600,color:'#34d399',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter',display:'flex',alignItems:'center',gap:3 }}>
                    <FiCheck size={12}/> Mark all read
                  </button>}
                </div>
                <div style={{ maxHeight:320,overflowY:'auto' }}>
                  {notifs.map((n,i)=>(
                    <div key={n.id} className="au" style={{ animationDelay:`${i*.04}s`,display:'flex',gap:10,padding:'10px 14px',background:n.read?'transparent':'rgba(99,102,241,.07)',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background .12s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
                      onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(99,102,241,.07)'}>
                      <div style={{ width:34,height:34,borderRadius:'50%',background:n.read?'rgba(255,255,255,.05)':'rgba(99,102,241,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}>{n.icon}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:13,lineHeight:1.5,color:'var(--t1)',fontWeight:n.read?400:500 }}>{n.text}</p>
                        <p style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>{n.time}</p>
                      </div>
                      <button onClick={e=>{e.stopPropagation();setNotifs(prev=>prev.filter(x=>x.id!==n.id))}} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--t3)',padding:2,display:'flex' }}><FiX size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Me */}
          <div ref={meRef} style={{ position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 10px',cursor:'pointer',minWidth:46 }}>
            <div style={{ width:26,height:26,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#10b981,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,boxShadow:'0 0 10px rgba(16,185,129,.4)' }}
              onClick={()=>{setShowMe(s=>!s);setShowNotif(false)}}>
              {user?.avatar?<img src={user.avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:user?.name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize:11,fontWeight:500,color:'var(--t2)' }} onClick={()=>{setShowMe(s=>!s);setShowNotif(false)}}>Me ▾</span>
            {showMe && (
              <div className="pop" style={{ position:'absolute',top:'calc(100% + 6px)',right:0,background:'rgba(13,21,53,.97)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,boxShadow:'0 16px 48px rgba(0,0,0,.6)',minWidth:200,zIndex:300,overflow:'hidden' }}>
                <div style={{ padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'center' }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#10b981,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:14,flexShrink:0 }}>
                    {user?.avatar?<img src={user.avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight:700,fontSize:13,color:'var(--t1)' }}>{user?.name}</p>
                    <p style={{ fontSize:11,color:'var(--t3)' }}>@{user?.username||'user'}</p>
                  </div>
                </div>
                {[{l:'View Profile',to:'/profile'},{l:'Messages',to:'/chat'},{l:'Market',to:'/market'},{l:'Search',to:'/search'}].map(({l,to})=>(
                  <Link key={to} to={to} onClick={()=>setShowMe(false)} style={{ display:'block',padding:'9px 14px',textDecoration:'none',fontSize:13,color:'var(--t1)',fontWeight:500,transition:'background .12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{l}</Link>
                ))}
                <div style={{ borderTop:'1px solid var(--border)' }}>
                  <button onClick={()=>{logout();toast.success('Signed out');navigate('/login')}} style={{ width:'100%',textAlign:'left',padding:'9px 14px',border:'none',background:'none',fontSize:13,fontWeight:500,color:'#f87171',cursor:'pointer',fontFamily:'Inter',transition:'background .12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.1)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
