import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiSend, FiUser } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']

export default function DirectMessagePage() {
  const { userId } = useParams()
  const { user: me } = useAuthStore()
  const navigate = useNavigate()
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    async function init() {
      try {
        const [userRes, msgsRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/dm/${userId}`)
        ])
        setOtherUser(userRes.data.user)
        setMessages(msgsRes.data.messages || [])
        // Mark as read
        await api.put(`/dm/${userId}/read`)
      } catch (err) {
        toast.error('Could not load conversation')
        navigate('/chat')
      } finally { setLoading(false) }
    }
    init()

    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/dm/${userId}`)
        setMessages(data.messages || [])
      } catch {}
    }, 3000)

    return () => clearInterval(pollRef.current)
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await api.post('/dm/send', { to_id: userId, content: input.trim() })
      setInput('')
      const { data } = await api.get(`/dm/${userId}`)
      setMessages(data.messages || [])
    } catch { toast.error('Could not send message') }
    finally { setSending(false) }
  }

  const ac = COLORS[(otherUser?.name?.charCodeAt(0)||0) % COLORS.length]

  if (loading) return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--t3)', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 12px' }} />
        <p>Loading conversation…</p>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '72px 24px 24px', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div className="card au" style={{ padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/chat')} className="btn-ghost" style={{ padding: 8, borderRadius: '50%' }}>
          <FiArrowLeft size={16} />
        </button>
        <Link to={`/u/${otherUser?.username || userId}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: ac, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {otherUser?.avatar ? <img src={otherUser.avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : otherUser?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>{otherUser?.name}</p>
            <p style={{ fontSize: 12, color: 'var(--t3)' }}>@{otherUser?.username} · {otherUser?.role}</p>
          </div>
        </Link>
        <Link to={`/u/${otherUser?.username || userId}`} className="btn-ghost" style={{ padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <FiUser size={13} /> Profile
        </Link>
      </div>

      {/* Messages */}
      <div className="card" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, marginBottom: 14 }}>
              {otherUser?.name?.[0]?.toUpperCase()}
            </div>
            <p style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>Start a conversation</p>
            <p style={{ fontSize: 13 }}>Say hi to {otherUser?.name}!</p>
          </div>
        ) : messages.map((msg, i) => {
          const isMine = msg.from_id === me?.id
          return (
            <div key={msg.id || i} className="au" style={{ display: 'flex', gap: 8, flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {!isMine && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: ac, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {msg.from_avatar ? <img src={msg.from_avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : msg.from_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                <div style={{ padding: '10px 14px', borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isMine ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,.08)', color: '#fff', fontSize: 14, lineHeight: 1.5, boxShadow: isMine ? '0 2px 12px rgba(99,102,241,.35)' : 'none' }}>
                  {msg.content}
                </div>
                <p style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, textAlign: isMine ? 'right' : 'left' }}>
                  {msg.read && isMine && <span style={{ marginRight: 4 }}>✓✓</span>}
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="input" style={{ flex: 1, borderRadius: 999 }} placeholder={`Message ${otherUser?.name}…`} value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit" disabled={!input.trim() || sending} className="btn-primary" style={{ borderRadius: '50%', width: 42, height: 42, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiSend size={15} />
        </button>
      </form>
    </div>
  )
}
