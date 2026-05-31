import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiEye } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../lib/api'

const inputStyle = {
  width: '100%', background: 'var(--surface)', border: '1.5px solid transparent',
  borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'DM Sans', transition: 'border-color 0.2s',
}

export default function CreateBlogPage() {
  const [form, setForm] = useState({ title: '', summary: '', content: '', cover_image: '', tags: '', published: true })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/blogs', { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
      toast.success('Blog published!')
      navigate('/blogs')
    } catch (err) { toast.error(err.response?.data?.error || 'Could not publish') }
    finally { setLoading(false) }
  }

  const onFocus = e => e.target.style.borderColor = 'var(--accent)'
  const onBlur  = e => e.target.style.borderColor = 'transparent'

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link to="/blogs" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, background: 'white', border: '1px solid var(--card-border)' }}>
          <FiArrowLeft size={14} /> Back
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Write a Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="card fade-up-1" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title *</label>
          <input style={{ ...inputStyle, fontSize: 18, fontWeight: 600 }} placeholder="Your compelling title..." value={form.title} onChange={e => set('title', e.target.value)} required onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Summary</label>
          <input style={inputStyle} placeholder="One-line description shown in listing..." value={form.summary} onChange={e => set('summary', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cover Image URL</label>
          <input style={inputStyle} placeholder="https://images.unsplash.com/..." value={form.cover_image} onChange={e => set('cover_image', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Content * <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-muted)' }}>(Markdown)</span></label>
            <span style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><FiEye size={11} /> Preview on detail page</span>
          </div>
          <textarea style={{ ...inputStyle, fontFamily: 'DM Mono', fontSize: 13, lineHeight: 1.7, minHeight: 280, resize: 'vertical' }}
            placeholder={`# Your heading\n\nWrite your **markdown** content here...\n\n- Bullet points work\n- So does *italic* text`}
            value={form.content} onChange={e => set('content', e.target.value)} required onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tags</label>
          <input style={inputStyle} placeholder="e.g. tech, startup, golang (comma separated)" value={form.tags} onChange={e => set('tags', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface)', borderRadius: 10 }}>
          <input type="checkbox" id="pub" checked={form.published} onChange={e => set('published', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
          <label htmlFor="pub" style={{ fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>Publish immediately (uncheck to save as draft)</label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Publishing...' : form.published ? '🚀 Publish Blog' : '💾 Save Draft'}
          </button>
          <Link to="/blogs" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
