import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { FiSearch, FiUser, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
const RC = { retailer:{bg:'rgba(16,185,129,.15)',t:'#34d399'}, distributor:{bg:'rgba(245,158,11,.15)',t:'#fbbf24'}, user:{bg:'rgba(99,102,241,.15)',t:'#a5b4fc'} }

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
    if (query) doSearch(query)
  }, [])

  async function doSearch(q) {
    if (!q.trim()) return
    setLoading(true); setSearched(true)
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(data.users || [])
    } catch (err) {
      toast.error('Search failed. Please try again.')
      setResults([])
    } finally { setLoading(false) }
  }

  function handleSubmit(e) {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(query)}`)
    doSearch(query)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '72px 24px 40px', position: 'relative', zIndex: 1 }}>
      <h1 className="au" style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', marginBottom: 20 }}>Search</h1>

      <form onSubmit={handleSubmit} className="au1" style={{ marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          <FiSearch size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
          <input
            ref={inputRef}
            className="input"
            style={{ paddingLeft: 48, paddingRight: 48, borderRadius: 999, fontSize: 16, padding: '14px 48px' }}
            placeholder="Search by name, @username, company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus() }}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}>
              <FiX size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: 12, width: '100%', padding: '12px' }}>
          <FiSearch size={15} /> Search People
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '35%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '55%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <FiUser size={36} style={{ color: 'var(--t3)', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>No users found</p>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>Try searching by name, @username, or company</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="au" style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12, fontWeight: 500 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((user, i) => {
              const ac = COLORS[(user.name?.charCodeAt(0)||0) % COLORS.length]
              const rc = RC[user.role] || RC.user
              return (
                <Link key={user.id} to={`/u/${user.username || user.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover au" style={{ padding: '14px 18px', animationDelay: `${i*.04}s`, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: ac, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                      {user.avatar ? <img src={user.avatar} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : user.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>{user.name}</span>
                        {user.username && <span style={{ fontSize: 13, color: 'var(--t3)' }}>@{user.username}</span>}
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999, background: rc.bg, color: rc.t, textTransform: 'capitalize' }}>{user.role}</span>
                      </div>
                      {user.bio && <p style={{ fontSize: 13, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.bio}</p>}
                      {user.company && <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{user.company}</p>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
                      <p>{user.follower_count || 0} followers</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {!searched && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 4 }}>Suggested searches</p>
          {['retailer','distributor','developer','startup'].map(tag => (
            <button key={tag} onClick={() => { setQuery(tag); doSearch(tag) }} style={{ textAlign: 'left', background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', color: 'var(--t2)', fontSize: 14, fontFamily: 'Inter', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--t2)' }}>
              <FiSearch size={14} /> {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
