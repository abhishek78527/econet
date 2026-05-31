import { useState, useEffect, useRef, useCallback } from 'react'
import { FiSend, FiHash, FiUsers, FiSearch, FiPhone, FiVideo, FiMessageCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import api from '../lib/api'

const ROOMS=[{id:'general',l:'General',d:'Open to all'},{id:'marketplace',l:'Marketplace',d:'Deals & offers'},{id:'retailers',l:'Retailers',d:'Retailer net'},{id:'tech',l:'Tech Talk',d:'Dev discussion'}]
const WS_BASE=import.meta.env.VITE_WS_URL||((window.location.protocol==='https:'?'wss://':'ws://')+window.location.host)
const COLORS=['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
const gc=n=>COLORS[(n?.charCodeAt(0)||0)%COLORS.length]

export default function ChatPage() {
  const {token,user}=useAuthStore()
  const [room,setRoom]=useState('general')
  const [msgs,setMsgs]=useState([])
  const [input,setInput]=useState('')
  const [online,setOnline]=useState(false)
  const [conversations,setConversations]=useState([])
  const [tab,setTab]=useState('rooms') // 'rooms' | 'dms'
  const ws=useRef(null); const bottom=useRef(null)

  // Load DM conversations
  useEffect(()=>{
    api.get('/dm/conversations').then(({data})=>setConversations(data.conversations||[])).catch(()=>{})
  },[])

  const connect=useCallback(rid=>{
    ws.current?.close()
    const w=new WebSocket(`${WS_BASE}/ws/chat?room=${rid}&token=${token}`)
    ws.current=w
    w.onopen=()=>{setOnline(true);setMsgs([])}
    w.onmessage=e=>{try{setMsgs(p=>[...p,JSON.parse(e.data)])}catch{}}
    w.onerror=()=>toast.error('Connection error')
    w.onclose=()=>setOnline(false)
  },[token])

  useEffect(()=>{connect(room);return()=>ws.current?.close()},[room,connect])
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  function send(e){e.preventDefault();if(!input.trim()||!online)return;ws.current?.send(JSON.stringify({type:'message',content:input.trim(),room_id:room}));setInput('')}
  const cur=ROOMS.find(r=>r.id===room)

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'72px 24px 24px',display:'grid',gridTemplateColumns:'280px 1fr',gap:12,height:'100vh',position:'relative',zIndex:1}}>
      {/* Left sidebar */}
      <div className="card al" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
          <h2 style={{fontWeight:800,fontSize:18,color:'var(--t1)',marginBottom:12}}>Messaging</h2>
          <div style={{position:'relative',marginBottom:12}}>
            <FiSearch size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--t3)'}}/>
            <input placeholder="Search" style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 10px 7px 30px',fontSize:13,fontFamily:'Inter',color:'var(--t1)',outline:'none'}}
              onFocus={e=>{e.target.style.borderColor='rgba(99,102,241,.4)';e.target.style.background='rgba(99,102,241,.08)'}}
              onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.background='rgba(255,255,255,.06)'}}/>
          </div>
          {/* Tabs */}
          <div style={{display:'flex',background:'rgba(255,255,255,.05)',borderRadius:8,padding:3}}>
            {[['rooms','# Rooms'],['dms','💬 Direct']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'6px',borderRadius:6,border:'none',cursor:'pointer',fontFamily:'Inter',fontSize:12,fontWeight:600,transition:'all .15s',background:tab===t?'rgba(99,102,241,.3)':'transparent',color:tab===t?'#a5b4fc':'var(--t3)'}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto'}}>
          {tab==='rooms' && ROOMS.map((r,i)=>(
            <button key={r.id} onClick={()=>setRoom(r.id)} className="au" style={{animationDelay:`${i*.07}s`,width:'100%',textAlign:'left',padding:'12px 16px',border:'none',cursor:'pointer',fontFamily:'Inter',transition:'background .12s',background:room===r.id&&tab==='rooms'?'rgba(99,102,241,.15)':'transparent',borderLeft:room===r.id&&tab==='rooms'?'3px solid #6366f1':'3px solid transparent'}}
              onMouseEnter={e=>{if(!(room===r.id&&tab==='rooms'))e.currentTarget.style.background='rgba(255,255,255,.05)'}}
              onMouseLeave={e=>{if(!(room===r.id&&tab==='rooms'))e.currentTarget.style.background='transparent'}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:42,height:42,borderRadius:'50%',background:gc(r.l),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',flexShrink:0}}><FiHash size={16}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,fontSize:13,color:room===r.id&&tab==='rooms'?'#a5b4fc':'var(--t1)'}}>{r.l}</p>
                  <p style={{fontSize:11,color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.d}</p>
                </div>
                {room===r.id&&tab==='rooms'&&online&&<span style={{width:7,height:7,borderRadius:'50%',background:'#34d399'}}/>}
              </div>
            </button>
          ))}

          {tab==='dms' && (
            conversations.length===0 ? (
              <div style={{padding:'32px 16px',textAlign:'center',color:'var(--t3)'}}>
                <FiMessageCircle size={32} style={{marginBottom:10,opacity:.3}}/>
                <p style={{fontSize:13,fontWeight:600,color:'var(--t2)',marginBottom:4}}>No direct messages yet</p>
                <p style={{fontSize:12}}>Search for people to start chatting</p>
                <Link to="/search" style={{display:'inline-block',marginTop:12,fontSize:12,color:'#a5b4fc',textDecoration:'none',fontWeight:600}}>Find people →</Link>
              </div>
            ) : conversations.map((conv,i)=>(
              <Link key={conv.user_id} to={`/chat/dm/${conv.user_id}`} style={{textDecoration:'none'}}>
                <div className="au" style={{animationDelay:`${i*.06}s`,display:'flex',gap:10,padding:'12px 16px',transition:'background .12s',alignItems:'center',borderLeft:'3px solid transparent'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{position:'relative'}}>
                    <div style={{width:42,height:42,borderRadius:'50%',background:gc(conv.name),overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:16,flexShrink:0}}>
                      {conv.avatar?<img src={conv.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:conv.name?.[0]?.toUpperCase()}
                    </div>
                    {conv.unread_count>0&&<span style={{position:'absolute',top:-2,right:-2,background:'#ef4444',color:'#fff',borderRadius:999,fontSize:9,fontWeight:700,padding:'1px 4px',minWidth:14,textAlign:'center'}}>{conv.unread_count}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <p style={{fontWeight:700,fontSize:13,color:'var(--t1)'}}>{conv.name}</p>
                      {conv.last_time&&<p style={{fontSize:10,color:'var(--t3)'}}>{formatDistanceToNow(new Date(conv.last_time),{addSuffix:false})}</p>}
                    </div>
                    <p style={{fontSize:12,color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{conv.last_message}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="card ar" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:42,height:42,borderRadius:'50%',background:gc(cur?.l),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}><FiHash size={18}/></div>
          <div style={{flex:1}}>
            <p style={{fontWeight:700,fontSize:15,color:'var(--t1)'}}>{cur?.l}</p>
            <p style={{fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:5,color:online?'#34d399':'#f87171'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:online?'#34d399':'#f87171',display:'inline-block'}}/>
              {online?'Active now':'Connecting…'}
            </p>
          </div>
          <div style={{display:'flex',gap:4}}>
            {[FiPhone,FiVideo].map((I,idx)=>(
              <button key={idx} className="btn-ghost" style={{borderRadius:'50%',width:34,height:34,padding:0,display:'flex',alignItems:'center',justifyContent:'center'}}><I size={15}/></button>
            ))}
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:8}}>
          {msgs.length===0&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--t3)',paddingBottom:40}}>
            <FiUsers size={36} style={{marginBottom:12,opacity:.2}}/>
            <p style={{fontSize:14,fontWeight:600,color:'var(--t2)'}}>No messages yet</p>
            <p style={{fontSize:12,marginTop:3}}>Say hello in #{cur?.l}!</p>
          </div>}
          {msgs.map((m,i)=>{
            if(m.type==='join'||m.type==='leave') return <div key={i} style={{textAlign:'center'}}><span style={{fontSize:11,color:'var(--t3)',background:'rgba(255,255,255,.05)',padding:'3px 12px',borderRadius:999}}>{m.sender} {m.type==='join'?'joined':'left'}</span></div>
            const mine=m.sender_id===user?.id
            return (
              <div key={i} className="au" style={{display:'flex',gap:8,flexDirection:mine?'row-reverse':'row',alignItems:'flex-end'}}>
                {!mine&&<div style={{width:28,height:28,borderRadius:'50%',background:gc(m.sender),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,flexShrink:0}}>{m.sender?.[0]?.toUpperCase()}</div>}
                <div style={{maxWidth:'65%'}}>
                  {!mine&&<p style={{fontSize:11,fontWeight:700,color:'var(--t2)',marginBottom:3}}>{m.sender}</p>}
                  <div style={{padding:'10px 14px',borderRadius:mine?'16px 4px 16px 16px':'4px 16px 16px 16px',background:mine?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(255,255,255,.08)',color:'#fff',fontSize:14,lineHeight:1.5,boxShadow:mine?'0 2px 12px rgba(99,102,241,.35)':'none'}}>{m.content}</div>
                  <p style={{fontSize:10,color:'var(--t3)',marginTop:3,textAlign:mine?'right':'left'}}>{m.timestamp?formatDistanceToNow(new Date(m.timestamp),{addSuffix:true}):''}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottom}/>
        </div>

        <form onSubmit={send} style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center'}}>
          <input className="input" style={{flex:1,borderRadius:999}} placeholder={online?`Message #${cur?.l}…`:'Connecting…'} value={input} onChange={e=>setInput(e.target.value)} disabled={!online}/>
          <button type="submit" disabled={!input.trim()||!online} className="btn-primary" style={{borderRadius:'50%',width:40,height:40,padding:0,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><FiSend size={15}/></button>
        </form>
      </div>
    </div>
  )
}
