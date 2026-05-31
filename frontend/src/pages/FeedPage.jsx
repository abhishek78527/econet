import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiHeart, FiMessageCircle, FiShare2, FiSend, FiMoreHorizontal, FiX, FiTrendingUp, FiBookOpen, FiUsers, FiImage } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444']
const RC = { retailer:{bg:'rgba(16,185,129,.15)',t:'#34d399'}, distributor:{bg:'rgba(245,158,11,.15)',t:'#fbbf24'}, user:{bg:'rgba(99,102,241,.15)',t:'#a5b4fc'} }
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:8080'

function Av({name,src,size=40,style={}}) {
  const c = COLORS[(name?.charCodeAt(0)||0)%COLORS.length]
  if (src) return <img src={src} alt={name} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0,...style}}/>
  return <div style={{width:size,height:size,borderRadius:'50%',background:c,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:size*.38,flexShrink:0,...style}}>{name?.[0]?.toUpperCase()||'?'}</div>
}

function Skel() {
  return (
    <div className="card" style={{marginBottom:10,padding:20}}>
      <div style={{display:'flex',gap:12}}>
        <div className="skeleton" style={{width:46,height:46,borderRadius:'50%',flexShrink:0}}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <div className="skeleton" style={{height:12,width:'35%'}}/>
          <div className="skeleton" style={{height:12,width:'22%'}}/>
          <div style={{marginTop:4,display:'flex',flexDirection:'column',gap:6}}>
            <div className="skeleton" style={{height:12,width:'95%'}}/>
            <div className="skeleton" style={{height:12,width:'78%'}}/>
            <div className="skeleton" style={{height:12,width:'55%'}}/>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImageUpload({onUploaded, onRemove, imageUrl}) {
  const ref = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)

  async function upload(file) {
    if (!file) return
    if (file.size > 5*1024*1024) { toast.error('Max 5MB'); return }
    const fd = new FormData(); fd.append('image', file)
    setUploading(true)
    try {
      const token = localStorage.getItem('lu_token')
      const res = await fetch(`${API_BASE}/api/v1/upload/image`, { method:'POST', headers:{Authorization:`Bearer ${token}`}, body:fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUploaded(data.url); toast.success('Image attached!')
    } catch(err){ toast.error(err.message||'Upload failed') }
    finally { setUploading(false); if(ref.current) ref.current.value='' }
  }

  if (imageUrl) return (
    <div style={{position:'relative',marginTop:10,borderRadius:12,overflow:'hidden',border:'1px solid var(--border)'}}>
      <img src={imageUrl} alt="" style={{width:'100%',maxHeight:260,objectFit:'cover',display:'block'}}/>
      <button onClick={onRemove} style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,.6)',border:'none',borderRadius:'50%',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff'}}>
        <FiX size={14}/>
      </button>
    </div>
  )

  return (
    <div onClick={()=>ref.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files[0])}}
      style={{marginTop:10,border:`2px dashed ${drag?'#6366f1':'rgba(255,255,255,.15)'}`,borderRadius:12,padding:'20px',textAlign:'center',cursor:'pointer',transition:'all .15s',background:drag?'rgba(99,102,241,.08)':'transparent'}}>
      <input ref={ref} type="file" accept="image/*" style={{display:'none'}} onChange={e=>upload(e.target.files?.[0])}/>
      {uploading ? <p style={{fontSize:13,color:'var(--t2)'}}>⏳ Uploading…</p> :
        <><FiImage size={24} style={{color:'var(--t3)',marginBottom:6}}/><p style={{fontSize:13,color:'var(--t2)',fontWeight:500}}>Drop image or click to browse</p><p style={{fontSize:11,color:'var(--t3)',marginTop:2}}>Max 5MB · JPG PNG GIF WEBP</p></>}
    </div>
  )
}

function PostCard({post,me,onLike,delay=0}) {
  const liked = post.likes?.includes(me)
  const [beat,setBeat] = useState(false)
  const [showCmt,setShowCmt] = useState(false)
  const [cmtText,setCmtText] = useState('')
  const [comments,setComments] = useState([])
  const rc = RC[post.author?.role]||RC.user

  function handleLike(){ setBeat(true); setTimeout(()=>setBeat(false),500); onLike(post.id) }
  function submitCmt(e){ e.preventDefault(); if(!cmtText.trim()) return; setComments(c=>[...c,{id:Date.now(),name:'You',text:cmtText}]); setCmtText(''); toast.success('Comment added!') }

  return (
    <div className="card card-hover au" style={{marginBottom:10,animationDelay:`${delay}s`,overflow:'visible'}}>
      <div style={{padding:'16px 18px 0',display:'flex',gap:10,alignItems:'flex-start'}}>
        <Av name={post.author?.name} src={post.author?.avatar} size={44}/>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:14,color:'var(--t1)'}}>{post.author?.name||'Unknown'}</span>
            <span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:999,background:rc.bg,color:rc.t}}>{post.author?.role||'user'}</span>
          </div>
          <p style={{fontSize:12,color:'var(--t3)',marginTop:2}}>{formatDistanceToNow(new Date(post.created_at),{addSuffix:true})} · 🌐</p>
        </div>
        <button className="btn-ghost" style={{padding:6,borderRadius:'50%'}}><FiMoreHorizontal size={16}/></button>
      </div>

      <div style={{padding:'10px 18px'}}><p style={{fontSize:14,lineHeight:1.7,color:'var(--t1)',whiteSpace:'pre-wrap'}}>{post.content}</p></div>

      {post.image_url&&<img src={post.image_url} alt="" style={{width:'100%',maxHeight:380,objectFit:'cover'}}/>}

      {post.tags?.length>0&&<div style={{padding:'0 18px 10px',display:'flex',gap:6,flexWrap:'wrap'}}>{post.tags.map(t=><span key={t} style={{fontSize:12,color:'#a5b4fc',fontWeight:500}}>#{t}</span>)}</div>}

      {post.like_count>0&&<div style={{padding:'2px 18px 8px',display:'flex',alignItems:'center',gap:4}}><span>👍</span><span style={{fontSize:13,color:'var(--t2)'}}>{post.like_count}</span>{comments.length>0&&<span style={{fontSize:13,color:'var(--t3)',marginLeft:'auto',cursor:'pointer'}} onClick={()=>setShowCmt(s=>!s)}>{comments.length} comments</span>}</div>}

      <div style={{borderTop:'1px solid var(--border)',margin:'0 2px'}}/>
      <div style={{display:'flex',padding:'2px 4px'}}>
        <button className="btn-act" onClick={handleLike} style={{color:liked?'#a5b4fc':'var(--t2)'}}>
          <FiHeart size={16} style={{fill:liked?'#a5b4fc':'none',transform:beat?'scale(1.5)':'scale(1)',transition:'transform .15s'}}/>Like
        </button>
        <button className="btn-act" onClick={()=>setShowCmt(s=>!s)}><FiMessageCircle size={16}/>Comment</button>
        <button className="btn-act"><FiShare2 size={16}/>Repost</button>
        <button className="btn-act"><FiSend size={16}/>Send</button>
      </div>

      {showCmt&&(
        <div className="au" style={{borderTop:'1px solid var(--border)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
          {comments.map((c,i)=>(
            <div key={c.id} style={{display:'flex',gap:8}}>
              <Av name={c.name} size={30}/>
              <div style={{background:'rgba(255,255,255,.06)',borderRadius:'0 10px 10px 10px',padding:'8px 12px',flex:1}}>
                <p style={{fontWeight:600,fontSize:13,marginBottom:2,color:'var(--t1)'}}>{c.name}</p>
                <p style={{fontSize:13,color:'var(--t2)'}}>{c.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitCmt} style={{display:'flex',gap:8,alignItems:'center'}}>
            <Av name="You" size={30}/>
            <div style={{flex:1,display:'flex',gap:6}}>
              <input className="input" style={{borderRadius:999,flex:1,fontSize:13}} placeholder="Add a comment…" value={cmtText} onChange={e=>setCmtText(e.target.value)}/>
              <button type="submit" disabled={!cmtText.trim()} className="btn-primary" style={{borderRadius:'50%',width:34,height:34,padding:0,flexShrink:0}}><FiSend size={13}/></button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const [posts,setPosts] = useState([])
  const [loading,setLoading] = useState(true)
  const [content,setContent] = useState('')
  const [imgUrl,setImgUrl] = useState('')
  const [tags,setTags] = useState('')
  const [open,setOpen] = useState(false)
  const [showImg,setShowImg] = useState(false)
  const [posting,setPosting] = useState(false)
  const {user} = useAuthStore()
  const txtRef = useRef(null)

  async function load(){ try{const {data}=await api.get('/posts');setPosts(data.posts||[])}catch{toast.error('Could not load posts')}finally{setLoading(false)} }
  useEffect(()=>{load()},[])

  async function submit(e){
    e.preventDefault(); if(!content.trim()) return; setPosting(true)
    try{ await api.post('/posts',{content:content.trim(),image_url:imgUrl,tags:tags.split(',').map(t=>t.trim()).filter(Boolean)}); setContent('');setImgUrl('');setTags('');setOpen(false);setShowImg(false); toast.success('Posted!'); load() }
    catch(err){toast.error(err.response?.data?.error||'Failed')} finally{setPosting(false)}
  }

  const NEWS=[{t:'Go 1.22 — major perf gains',time:'2h ago',r:'1.2k'},{t:'React 19 is now stable',time:'5h ago',r:'4.8k'},{t:'MongoDB Atlas free tier expanded',time:'1d ago',r:'890'},{t:'WebSocket best practices 2025',time:'2d ago',r:'3.1k'},{t:'JWT auth patterns for production',time:'3d ago',r:'2.4k'}]

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px 40px',display:'grid',gridTemplateColumns:'220px 1fr 280px',gap:18,alignItems:'start',position:'relative',zIndex:1}}>

      {/* RIGHT ambient glow */}
      <div style={{position:'fixed',bottom:'10%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(236,72,153,.08) 0%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>

      {/* LEFT */}
      <aside className="al" style={{position:'sticky',top:72,display:'flex',flexDirection:'column',gap:10}}>
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{height:56,background:user?.cover_image?'none':'linear-gradient(120deg,rgba(99,102,241,.6),rgba(139,92,246,.6))',position:'relative'}}>
            {user?.cover_image&&<img src={user.cover_image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
          </div>
          <div style={{padding:'0 16px 14px'}}>
            <div style={{marginTop:-22,marginBottom:8}}>
              <Av name={user?.name} src={user?.avatar} size={48} style={{border:'3px solid rgba(13,21,53,1)',boxShadow:'0 0 16px rgba(99,102,241,.4)'}}/>
            </div>
            <h3 style={{fontWeight:700,fontSize:14,color:'var(--t1)',marginBottom:2}}>{user?.name}</h3>
            <p style={{fontSize:12,color:'var(--t2)',marginBottom:user?.company?2:0,lineHeight:1.4}}>{user?.bio||'Professional on EcoNet'}</p>
            {user?.company&&<p style={{fontSize:12,color:'var(--t3)'}}>{user.company}</p>}
          </div>
          <div style={{borderTop:'1px solid var(--border)',padding:'10px 16px'}}>
            {[['Profile views',Math.floor(Math.random()*80+20)],['Impressions',Math.floor(Math.random()*400+50)]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                <span style={{color:'var(--t2)'}}>{l}</span>
                <span style={{fontWeight:700,color:'#a5b4fc'}}>{v}</span>
              </div>
            ))}
          </div>
          <Link to="/profile" style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',textDecoration:'none',fontSize:12,color:'var(--t2)',fontWeight:600,borderTop:'1px solid var(--border)',transition:'background .12s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <FiUsers size={13}/> View full profile
          </Link>
        </div>
        <div className="card" style={{padding:'6px 0'}}>
          {[{icon:FiBookOpen,l:'My Blogs',to:'/blogs'},{icon:FiMessageCircle,l:'Messages',to:'/chat'},{icon:FiTrendingUp,l:'Analytics',to:'/profile'}].map(({icon:I,l,to})=>(
            <Link key={l} to={to} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px',textDecoration:'none',color:'var(--t2)',fontSize:13,fontWeight:500,transition:'all .12s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='var(--t1)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--t2)'}}>
              <I size={14}/>{l}
            </Link>
          ))}
        </div>
      </aside>

      {/* CENTER */}
      <main>
        {/* Composer */}
        <div className="card au" style={{padding:14,marginBottom:10}}>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Av name={user?.name} src={user?.avatar} size={42}/>
            <button onClick={()=>{setOpen(true);setTimeout(()=>txtRef.current?.focus(),50)}} style={{
              flex:1,textAlign:'left',padding:'10px 16px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:999,
              fontSize:14,color:'var(--t2)',background:'rgba(255,255,255,.05)',cursor:'text',fontFamily:'Inter',fontWeight:500,transition:'all .15s',
            }}
            onMouseEnter={e=>{e.target.style.borderColor='rgba(99,102,241,.4)';e.target.style.background='rgba(99,102,241,.08)'}}
            onMouseLeave={e=>{e.target.style.borderColor='rgba(255,255,255,.1)';e.target.style.background='rgba(255,255,255,.05)'}}>
              Start a post, write an article…
            </button>
          </div>

          {open&&(
            <form onSubmit={submit} className="au" style={{marginTop:12}}>
              <textarea ref={txtRef} rows={4} placeholder="What do you want to talk about?" value={content} onChange={e=>setContent(e.target.value)}
                style={{width:'100%',border:'none',outline:'none',resize:'none',fontSize:15,fontFamily:'Inter',lineHeight:1.7,background:'transparent',color:'var(--t1)',padding:'4px 0 8px'}}/>
              {showImg&&<ImageUpload imageUrl={imgUrl} onUploaded={setImgUrl} onRemove={()=>{setImgUrl('');setShowImg(false)}}/>}
              <input className="input" style={{marginTop:8,fontSize:13}} placeholder="Tags: react, golang (comma-separated)" value={tags} onChange={e=>setTags(e.target.value)}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
                <button type="button" onClick={()=>setShowImg(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px',borderRadius:8,color:showImg?'#a5b4fc':'var(--t2)',display:'flex',alignItems:'center',gap:5,fontSize:13,fontWeight:500,fontFamily:'Inter',transition:'all .12s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <FiImage size={16}/> Photo
                </button>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button type="button" onClick={()=>{setOpen(false);setShowImg(false);setImgUrl('')}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--t3)',padding:4}}><FiX size={18}/></button>
                  <button type="submit" disabled={posting||!content.trim()} className="btn-primary" style={{padding:'8px 20px',fontSize:14}}>
                    {posting?'Posting…':'Post'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {!open&&(
            <div style={{display:'flex',gap:2,marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
              {[{i:'📷',l:'Photo',a:()=>{setOpen(true);setShowImg(true)}},{i:'🎬',l:'Video',a:()=>setOpen(true)},{i:'✍️',l:'Article',a:()=>setOpen(true)}].map(({i,l,a})=>(
                <button key={l} onClick={a} className="btn-act" style={{borderRadius:8,flex:1,fontSize:13}}>
                  <span style={{fontSize:15}}>{i}</span>{l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0',padding:'0 2px'}}>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
          <span style={{fontSize:12,color:'var(--t3)',fontWeight:500}}>Sort by: Top ▾</span>
        </div>

        {loading?[1,2,3].map(i=><Skel key={i}/>)
          :posts.length===0?<div className="card au" style={{padding:'52px 24px',textAlign:'center'}}><div style={{fontSize:44,marginBottom:10}}>📝</div><p style={{fontWeight:700,fontSize:16,color:'var(--t1)',marginBottom:4}}>No posts yet</p><p style={{fontSize:13,color:'var(--t2)'}}>Be the first to share something!</p></div>
          :posts.map((p,i)=><PostCard key={p.id} post={p} me={user?.id} onLike={async id=>{try{await api.post(`/posts/${id}/like`);load()}catch{}}} delay={i*.05}/>)
        }
      </main>

      {/* RIGHT */}
      <aside className="ar" style={{position:'sticky',top:72,display:'flex',flexDirection:'column',gap:10}}>
        <div className="card" style={{padding:'14px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:'0 16px 6px'}}><h3 style={{fontWeight:700,fontSize:15,color:'var(--t1)'}}>EcoNet News</h3><span style={{fontSize:11,color:'var(--t3)'}}>ℹ</span></div>
          <p style={{fontSize:11,color:'var(--t3)',padding:'0 16px 8px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>Top stories</p>
          {NEWS.map((n,i)=>(
            <div key={i} className="au" style={{animationDelay:`${i*.06}s`,padding:'6px 16px',cursor:'pointer',transition:'background .12s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{display:'flex',gap:8}}>
                <span style={{color:'#a5b4fc',fontWeight:700,flexShrink:0}}>·</span>
                <div><p style={{fontSize:13,fontWeight:600,lineHeight:1.4,marginBottom:2,color:'var(--t1)'}}>{n.t}</p><p style={{fontSize:11,color:'var(--t3)'}}>{n.time} · {n.r} readers</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{padding:'12px 0'}}>
          <h3 style={{fontWeight:700,fontSize:15,padding:'0 16px 10px',color:'var(--t1)'}}>People you may know</h3>
          {['Retailer Network','Distributor Hub','Go Developers','Tech Builders'].map((name,i)=>(
            <div key={i} className="au" style={{animationDelay:`${i*.06}s`,display:'flex',alignItems:'center',gap:10,padding:'8px 16px'}}>
              <Av name={name} size={34}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</p>
                <p style={{fontSize:11,color:'var(--t3)'}}>Professional Group</p>
              </div>
              <button className="btn-outline" style={{fontSize:11,padding:'4px 10px',flexShrink:0}}>+Follow</button>
            </div>
          ))}
        </div>

        <div style={{padding:'0 4px'}}>
          <p style={{fontSize:11,color:'var(--t3)',lineHeight:2}}>{['About','Privacy','Terms','Help'].map((l,i)=><span key={l}><a href="#" style={{color:'var(--t3)',textDecoration:'none'}}>{l}</a>{i<3?' · ':''}</span>)}</p>
          <p style={{fontSize:11,color:'var(--t4)',marginTop:2}}>EcoNet © 2025</p>
        </div>
      </aside>
    </div>
  )
}
