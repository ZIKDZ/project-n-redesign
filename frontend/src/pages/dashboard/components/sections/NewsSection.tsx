import { useState, useEffect, useRef } from 'react'
import { news } from '../../../../utils/api'
import { Badge, SectionHeader, ActionButton, getCsrfToken } from '../DashboardShared'

export default function NewsSection() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    tag: 'announcement',
    description: '',
    published_at: '',
    is_published: true,
  })
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    ;(news.listAll() as Promise<any>).then(r => setData(r.news || [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setThumbnailFile(file)
    setThumbnailPreview(file ? URL.createObjectURL(file) : '')
  }

  const resetForm = () => {
    setForm({ title: '', tag: 'announcement', description: '', published_at: '', is_published: true })
    setThumbnailFile(null)
    setThumbnailPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const save = async () => {
    if (!form.title || !form.description || !form.published_at) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('tag', form.tag)
      fd.append('description', form.description)
      fd.append('published_at', form.published_at)
      fd.append('is_published', form.is_published ? 'true' : 'false')
      if (thumbnailFile) fd.append('thumbnail', thumbnailFile)

      await fetch('/api/news/create/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: fd,
      })
      setShowForm(false)
      resetForm()
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this post?')) return
    await news.delete(id)
    load()
  }

  const toggle = async (id: number, is_published: boolean) => {
    await news.update(id, { is_published: !is_published })
    load()
  }

  const inputClass =
    'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60 w-full'

  return (
    <div>
      <SectionHeader
        title="News"
        action={
          <ActionButton
            onClick={() => {
              setShowForm(v => !v)
              if (showForm) resetForm()
            }}
          >
            {showForm ? 'Cancel' : '+ New Post'}
          </ActionButton>
        }
      />

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Title *</label>
              <input
                placeholder="Post title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Tag</label>
              <select
                value={form.tag}
                onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}
                className={inputClass + ' cursor-pointer'}
              >
                {['announcement', 'award', 'community', 'match', 'roster', 'update'].map(t => (
                  <option key={t} value={t} className="bg-[#1a0030]">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Publish Date *</label>
              <input
                type="date"
                value={form.published_at}
                max="2099-12-31"
                onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Description *</label>
              <textarea
                placeholder="Write the post content…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass + ' h-28 resize-none'}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/40 text-xs font-bold tracking-widest uppercase mb-2">Thumbnail Image</label>
              <div className="flex items-start gap-4">
                <div
                  className="w-32 h-20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {thumbnailPreview
                    ? <img src={thumbnailPreview} className="w-full h-full object-cover" alt="preview" />
                    : <span className="text-white/20 text-xs text-center px-2">Click to upload</span>}
                </div>
                <div className="flex-1">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/5 border border-white/10 hover:border-purple-500/40 text-white/60 hover:text-white text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-200"
                  >
                    {thumbnailFile ? 'Change Image' : 'Choose Image'}
                  </button>
                  {thumbnailFile && <p className="text-white/30 text-xs mt-2">{thumbnailFile.name}</p>}
                  {thumbnailFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null)
                        setThumbnailPreview('')
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="text-red-400/60 hover:text-red-400 text-xs mt-1 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, is_published: !p.is_published }))}
                className={`w-10 h-6 rounded-full transition-colors duration-200 relative ${form.is_published ? 'bg-purple-600' : 'bg-white/10'}`}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: form.is_published ? '18px' : '2px' }}
                />
              </button>
              <span className="text-white/50 text-xs font-bold tracking-widest uppercase">
                {form.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={save}
              disabled={saving || !form.title || !form.description || !form.published_at}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all duration-200"
            >
              {saving ? 'Saving…' : 'Save Post'}
            </button>
            <ActionButton variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>Cancel</ActionButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.length === 0 && <p className="text-white/30 text-sm">No news posts yet.</p>}
        {data.map((n: any) => (
          <div key={n.id} className="bg-white/5 border border-white/8 rounded-2xl px-6 py-4 flex items-center gap-4">
            {n.thumbnail && (
              <img src={n.thumbnail} className="w-16 h-12 object-cover rounded-lg opacity-70 shrink-0" alt="" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-white font-bold truncate">{n.title}</span>
                <Badge color="purple">{n.tag}</Badge>
                {!n.is_published && <Badge color="gray">Draft</Badge>}
              </div>
              <p className="text-white/40 text-xs truncate">
                {n.published_at} · {n.description.slice(0, 80)}…
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <ActionButton variant="ghost" onClick={() => toggle(n.id, n.is_published)}>
                {n.is_published ? 'Unpublish' : 'Publish'}
              </ActionButton>
              <ActionButton variant="danger" onClick={() => remove(n.id)}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
