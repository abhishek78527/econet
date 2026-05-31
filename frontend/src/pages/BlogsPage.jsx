import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiBookOpen, FiClock, FiTrendingUp } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'

const COLORS=['#0a66c2','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
function Av({name,size=40}){const c=COLORS[(name?.charCodeAt(0)||0)%COLORS.length];return<div style={{width:size,height:size,borderRadius:'50%',background:c,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:size*.38,flexShrink:0}}>{name?.[0]?.toUpperCase()||'?'}</div>}

export default function BlogsPage() {
  const [blogs,setBlogs]=useState([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{api.get('/blogs').then(({data})=>setBlogs(data.blogs||[])).catch(()=>toast.error('Could not load')).finally(()=>setLoading(false))},[])

  return (
    <div style={{maxWidth:1128,margin:'0 auto',padding:'20px 16px',display:'grid',gridTemplateColumns:'1fr 300px',gap:18,alignItems:'start'}}>
      <main>
        <div className="card au" style={{padding:'14px 20px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:20,marginBottom:2}}>Blogs & Articles</h1>
            <p style={{fontSize:13,color:'var(--t2)'}}>Marketplace insights & industry updates</p>
          </div>
          <Link to="/blogs/new" className="btn-blue" style={{fontSize:14,padding:'8px 18px'}}>
            <FiPlus size={15}/> Write article
          </Link>
        </div>

        {loading?[1,2,3].map(i=>(
          <div key={i} className="card" style={{marginBottom:8,padding:20}}>
            <div className="skeleton" style={{height:16,width:'55%',marginBottom:10}}/>
            <div className="skeleton" style={{height:13,width:'90%',marginBottom:6}}/>
            <div className="skeleton" style={{height:13,width:'70%'}}/>
          </div>
        )):blogs.length===0?(
          <div className="card au" style={{padding:'56px 24px',textAlign:'center'}}>
            <FiBookOpen size={40} style={{color:'var(--t3)',marginBottom:12}}/>
            <p style={{fontWeight:700,fontSize:16,marginBottom:4}}>No articles yet</p>
            <p style={{fontSize:13,color:'var(--t2)',marginBottom:16}}>Share your expertise with the community</p>
            <Link to="/blogs/new" className="btn-blue" style={{display:'inline-flex',fontSize:14}}><FiPlus size={14}/>Write first article</Link>
          </div>
        ):blogs.map((b,i)=>(
          <Link key={b.id} to={`/blogs/${b.id}`} style={{textDecoration:'none'}}>
            <div className="card lift au" style={{marginBottom:8,padding:20,animationDelay:`${i*.06}s`}}>
              <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                <Av name={b.author?.name} size={44}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:'var(--t2)',marginBottom:4}}>{b.author?.name||'Unknown'} · <span style={{fontWeight:400}}>{formatDistanceToNow(new Date(b.created_at),{addSuffix:true})}</span></p>
                  <h2 style={{fontSize:16,fontWeight:700,color:'var(--t1)',marginBottom:6,lineHeight:1.4}}>{b.title}</h2>
                  {b.summary&&<p style={{fontSize:13,color:'var(--t2)',lineHeight:1.6,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{b.summary}</p>}
                  {b.tags?.length>0&&(
                    <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                      {b.tags.slice(0,4).map(t=><span key={t} style={{fontSize:12,background:'var(--surface)',color:'var(--t2)',padding:'2px 10px',borderRadius:999,fontWeight:500}}>#{t}</span>)}
                    </div>
                  )}
                </div>
                {b.cover_image&&<img src={b.cover_image} alt="" style={{width:100,height:70,objectFit:'cover',borderRadius:4,flexShrink:0}}/>}
              </div>
            </div>
          </Link>
        ))}
      </main>

      <aside className="ar" style={{position:'sticky',top:60,display:'flex',flexDirection:'column',gap:8}}>
        <div className="card" style={{padding:'14px 0'}}>
          <h3 style={{fontWeight:700,fontSize:15,padding:'0 16px 12px',display:'flex',alignItems:'center',gap:8}}><FiTrendingUp size={15}/> Writing on EcoNet</h3>
          {['Share marketplace insights','Build your professional brand','Connect with industry peers','Publish or save as draft'].map((t,i)=>(
            <div key={i} style={{display:'flex',gap:8,padding:'6px 16px'}}>
              <span style={{color:'var(--accent)',fontWeight:700,flexShrink:0}}>✓</span>
              <span style={{fontSize:13,color:'var(--t2)',lineHeight:1.5}}>{t}</span>
            </div>
          ))}
          <div style={{padding:'12px 16px 0',borderTop:'1px solid var(--border)',marginTop:10}}>
            <Link to="/blogs/new" className="btn-out" style={{width:'100%',justifyContent:'center',fontSize:14}}>Start writing</Link>
          </div>
        </div>
      </aside>
    </div>
  )
}
