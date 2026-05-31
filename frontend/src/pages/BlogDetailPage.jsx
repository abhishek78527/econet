import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiArrowLeft, FiCalendar } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function BlogDetailPage() {
  const { id } = useParams()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/blogs/${id}`).then(({ data }) => setBlog(data.blog))
      .catch(() => toast.error('Blog not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  )

  if (!blog) return (
    <div className="text-center py-16">
      <p className="text-gray-400">Blog not found</p>
      <Link to="/blogs" className="btn-primary mt-4 inline-block text-sm">Back to blogs</Link>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <Link to="/blogs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <FiArrowLeft className="w-4 h-4" /> Back to blogs
      </Link>

      {blog.cover_image && (
        <img src={blog.cover_image} alt={blog.title} className="w-full h-56 object-cover rounded-xl mb-6" />
      )}

      <h1 className="text-3xl font-bold text-gray-900 leading-tight">{blog.title}</h1>

      <div className="flex items-center gap-4 mt-3 mb-8 text-sm text-gray-400">
        {blog.author?.name && <span className="font-medium text-gray-600">{blog.author.name}</span>}
        <span className="flex items-center gap-1">
          <FiCalendar className="w-3.5 h-3.5" />
          {formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })}
        </span>
        {blog.tags?.map(tag => (
          <span key={tag} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs">#{tag}</span>
        ))}
      </div>

      <div className="prose prose-gray max-w-none">
        <ReactMarkdown>{blog.content}</ReactMarkdown>
      </div>
    </div>
  )
}
