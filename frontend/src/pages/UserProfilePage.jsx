import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiMessageCircle, FiUserPlus, FiUserCheck, FiMapPin, FiBriefcase, FiMail, FiBookOpen, FiGrid } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useAuthStore from '../store/authStore'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
const RC = { retailer:{bg:'rgba(16,185,129,.15)',t:'#34d399'}, distributor:{bg:'rgba(245,158,11,.15)',t:'#fbbf24'}, user:{bg:'rgba(99,102,241,.15)',t:'#a5b4fc'} }

export default function UserProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/users/${username}`)
        setProfile(data.user)
        // Load their posts
        const postsRes = await api.get('/posts')
        const userPosts = (postsRes.data.posts || []).filter(p => p.author_id === data.user.id)
        setPosts(userPosts)
      } catch (err) {
        toast.error('User not found')
        navigate('/')
      } finally { setLoading(false) }
    }
    load()
  }, [username])

  async function toggleFollow() {
    try {
      const { data } = await api.post(`/users/${profile.id}/follow`)
      setFollowing(data.action === 'followed')
      toast.success(data.action === 'followed' ? `Following ${profile.name}` : `Unfollowed ${profile.name}`)
      setProfile(p => ({
        ...p,
        follower_count: data.action === 'followed' ? p.follower_count + 1 : p.follower_count - 1
      }))
    } catch { toast.error('Could not follow user') }
  }

  if (loading) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="skeleton" style={{ height: 180 }} />
        <div style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 90, height: 90, borderRadius: '50%', marginTop: -50, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 24, width: '30%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: '50%' }} />
        </div>
      </div>
    </div>
  )

  if (!profile) return null
  const ac = COLORS[(profile.name?.charCodeAt(0)||0) % COLORS.length]
  const rc = RC[profile.role] || RC.user
  const isMe = me?.id === profile.id

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '72px 24px 40px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FiArrowLeft size={15} /> Back
      </button>

      {/* Profile card */}
      <div className="card au" style={{ overflow: 'hidden', marginBottom: 12 }}>
        {/* Cover */}
        <div style={{ height: 180, background: profile.cover_image ? 'none' : `linear-gradient(120deg,rgba(99,102,241,.5),rgba(139,92,246,.4),rgba(236,72,153,.3))`, position: 'relative' }}>
          {profile.cover_image && <img src={profile.cover_image} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>}
        </div>

        <div style={{ padding: '0 28px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{ marginTop: -52, width: 100, height: 100, borderRadius: '50%', border: '4px solid rgba(13,21,53,1)', overflow: 'hidden', background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 38, boxShadow: `0 0 24px ${ac}66` }}>
              {profile.avatar ? <img src={profile.avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : profile.name?.[0]?.toUpperCase()}
            </div>

            {/* Action buttons */}
            {!isMe && (
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Link to={`/chat/dm/${profile.id}`} className="btn-ghost" style={{ border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiMessageCircle size={15} /> Message
                </Link>
                <button onClick={toggleFollow} className={following ? 'btn-ghost' : 'btn-primary'} style={{ borderRadius: 10, padding: '8px 18px', border: following ? '1px solid rgba(255,255,255,.15)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {following ? <><FiUserCheck size={15} /> Following</> : <><FiUserPlus size={15} /> Follow</>}
                </button>
              </div>
            )}
            {isMe && (
              <Link to="/profile" className="btn-outline" style={{ marginTop: 8, padding: '8px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                Edit Profile
              </Link>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{profile.name}</h1>
              {profile.username && <span style={{ fontSize: 14, color: 'var(--t3)' }}>@{profile.username}</span>}
              <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: rc.bg, color: rc.t, textTransform: 'capitalize' }}>{profile.role}</span>
            </div>
            {profile.bio && <p style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 10, maxWidth: 540 }}>{profile.bio}</p>}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              {profile.company && <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiBriefcase size={13}/>{profile.company}</span>}
              {profile.location && <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiMapPin size={13}/>{profile.location}</span>}
              <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}><FiMail size={13}/>{profile.email}</span>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <span style={{ fontSize: 14, color: 'var(--t2)' }}><strong style={{ color: 'var(--t1)' }}>{profile.follower_count || 0}</strong> followers</span>
              <span style={{ fontSize: 14, color: 'var(--t2)' }}><strong style={{ color: 'var(--t1)' }}>{profile.following_count || 0}</strong> following</span>
              <span style={{ fontSize: 14, color: 'var(--t2)' }}><strong style={{ color: 'var(--t1)' }}>{posts.length}</strong> posts</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', padding: '0 28px' }}>
          {[['posts', FiGrid, 'Posts'], ['about', FiBookOpen, 'About']].map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: tab === t ? '#a5b4fc' : 'var(--t3)', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent', marginBottom: -1, transition: 'color .15s' }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--t3)', fontSize: 15 }}>No posts yet</p>
            </div>
          ) : posts.map((post, i) => (
            <div key={post.id} className="card au" style={{ padding: '18px 20px', marginBottom: 10, animationDelay: `${i*.05}s` }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t1)', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{post.content}</p>
              {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }}/>}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>👍 {post.like_count || 0}</span>
                {post.tags?.map(t => <span key={t} style={{ fontSize: 12, color: '#a5b4fc' }}>#{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'about' && (
        <div className="card au" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 16 }}>About {profile.name}</h3>
          <p style={{ fontSize: 14, color: profile.bio ? 'var(--t2)' : 'var(--t3)', lineHeight: 1.7 }}>
            {profile.bio || 'No bio added yet.'}
          </p>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              [FiBriefcase, profile.company, 'Works at'],
              [FiMapPin,    profile.location, 'Lives in'],
              [FiMail,      profile.email, 'Email'],
            ].filter(([,val]) => val).map(([Icon, val, label], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon size={16} style={{ color: '#a5b4fc', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--t2)' }}><strong style={{ color: 'var(--t3)', marginRight: 6 }}>{label}</strong>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
