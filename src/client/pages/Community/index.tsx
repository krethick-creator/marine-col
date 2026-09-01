import { useState, useEffect } from 'react'
import type { CommunityPost, PostType } from '../../types'
import { useTranslation } from '../../locales'
import { useAppStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { fetchCommunityPosts, createCommunityPost, reactToPost } from '../../services/api/communityService'
import { RefreshCw, Plus, MapPin, Search, MessageSquare, Filter, ShieldCheck, X } from 'lucide-react'

const postTypeLabels: Record<string, { icon: string; label: string; color: string }> = {
  CONDITION_REPORT: { icon: '🌊', label: 'Ocean Conditions', color: '#2d8bba' },
  ZONE_REPORT: { icon: '🎣', label: 'Fishing', color: '#4ade80' },
  DANGER_REPORT: { icon: '⚠️', label: 'Safety', color: '#f87171' },
  OBSERVATION: { icon: '👁', label: 'Weather', color: '#7ec8e3' },
  OTHER: { icon: '💬', label: 'Other', color: '#a78bfa' },
}

export default function CommunityPage() {
  const { t } = useTranslation()
  const { user } = useAppStore()
  const { isAuthenticated, user: authUser, token } = useAuthStore()

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters & Sorting state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [sortOption, setSortOption] = useState<'latest' | 'oldest' | 'popular'>('latest')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Post Modal / Form State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formType, setFormType] = useState<PostType>('CONDITION_REPORT')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formLocation, setFormLocation] = useState(user?.locationName || 'Coastal Sector')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadPosts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const res = await fetchCommunityPosts({
      category: selectedCategory,
      sort: sortOption,
      search: searchQuery,
    })

    if (res.ok && res.data) {
      setPosts(res.data)
    } else {
      setPosts([])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadPosts()
  }, [selectedCategory, sortOption, searchQuery])

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !token) {
      setFormError('Authentication required. Please log in to post to the community network.')
      return
    }
    if (!formTitle.trim() || formTitle.trim().length < 3) {
      setFormError('Title must be at least 3 characters.')
      return
    }
    if (!formContent.trim() || formContent.trim().length < 10) {
      setFormError('Content must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const res = await createCommunityPost({
      postType: formType,
      title: formTitle.trim(),
      content: formContent.trim(),
      locationName: formLocation.trim() || user?.locationName || 'Local Coastal Region',
      lat: user?.location?.lat || 13.0827,
      lon: user?.location?.lon || 80.2707,
      userName: authUser?.name || user?.name || 'Community Member',
      userRole: authUser?.role || user?.role || 'Fisherman',
    })

    if (res.ok && res.data) {
      setShowCreateModal(false)
      setFormTitle('')
      setFormContent('')
      loadPosts(true)
    } else {
      setFormError(res.error || 'Failed to submit community post.')
    }
    setSubmitting(false)
  }

  const handleReact = async (postId: string, type: 'like' | 'helpful' | 'verify') => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const r = p.reactions || { like: 0, helpful: 0, verify: 0 }
          return {
            ...p,
            reactions: { ...r, [type]: (r[type] || 0) + 1 },
          }
        }
        return p
      })
    )

    await reactToPost(postId, type)
  }

  const formatPostTime = (createdAt: Date | string) => {
    try {
      const dt = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
      const diffMs = Date.now() - dt.getTime()
      if (isNaN(diffMs)) return 'Just now'
      const mins = Math.floor(diffMs / 60000)
      if (mins < 1) return 'Just now'
      if (mins < 60) return `${mins}m ago`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    } catch {
      return 'Recent'
    }
  }

  return (
    <div className="page-shell">
      {/* Header & Main Action Bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('community.title')}</h1>
          <p className="page-subtitle">{t('community.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => loadPosts(true)}
            className="glass"
            style={{
              padding: '8px 14px',
              borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-card"
            style={{
              padding: '8px 18px',
              borderRadius: 99,
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Plus size={15} />
            {t('community.createPost')}
          </button>
        </div>
      </div>

      {/* Safety Disclaimer Banner */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: 12,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 12.5,
          color: 'rgba(251,191,36,0.85)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <ShieldCheck size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
        <span>{t('community.disclaimer')}</span>
      </div>

      {/* Filtering, Search & Sorting Controls */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className="glass"
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              border: selectedCategory === 'ALL' ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.08)',
              background: selectedCategory === 'ALL' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
              color: selectedCategory === 'ALL' ? '#ffffff' : 'var(--text-light)',
              cursor: 'pointer',
            }}
          >
            {t('community.filterAll')}
          </button>
          {Object.entries(postTypeLabels).map(([typeKey, cfg]) => (
            <button
              key={typeKey}
              onClick={() => setSelectedCategory(typeKey)}
              className="glass"
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                border: selectedCategory === typeKey ? `1px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.08)',
                background: selectedCategory === typeKey ? `${cfg.color}26` : 'rgba(255,255,255,0.03)',
                color: selectedCategory === typeKey ? '#ffffff' : 'var(--text-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={14} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search posts or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: 12.5,
                width: 160,
              }}
            />
            {searchQuery && (
              <X size={12} style={{ cursor: 'pointer', color: 'var(--text-light)' }} onClick={() => setSearchQuery('')} />
            )}
          </div>

          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Filter size={13} color="var(--text-light)" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="latest" style={{ background: '#0f172a', color: '#ffffff' }}>{t('community.sortLatest')}</option>
              <option value="oldest" style={{ background: '#0f172a', color: '#ffffff' }}>{t('community.sortOldest')}</option>
              <option value="popular" style={{ background: '#0f172a', color: '#ffffff' }}>{t('community.sortPopular')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-light)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--accent-blue)' }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Loading community posts...</div>
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>💬</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
            {t('community.noPosts')}
          </h3>
          <p style={{ fontSize: 13.5, color: 'rgba(184,223,240,0.65)', maxWidth: 460, margin: '0 auto 20px auto', lineHeight: 1.6 }}>
            {t('community.noPostsDesc')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-card"
            style={{
              padding: '10px 22px',
              borderRadius: 99,
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              fontWeight: 700,
              border: 'none',
            }}
          >
            <Plus size={16} />
            {t('community.createPost')}
          </button>
        </div>
      ) : (
        /* Posts List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map((post) => {
            const typeInfo = postTypeLabels[post.postType] || postTypeLabels.OTHER
            const reactions = post.reactions || { like: 0, helpful: 0, verify: 0 }
            return (
              <div key={post.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    className="avatar"
                    style={{
                      width: 40,
                      height: 40,
                      fontSize: 15,
                      fontWeight: 700,
                      flexShrink: 0,
                      background: 'var(--accent-blue)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                    }}
                  >
                    {post.userName ? post.userName.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Author & Header Meta Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{post.userName}</span>
                      {post.userRole && (
                        <span style={{ fontSize: 10.5, textTransform: 'capitalize', color: 'var(--text-light)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                          {post.userRole}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: typeInfo.color, padding: '2px 9px', borderRadius: 99, background: `${typeInfo.color}1e`, border: `1px solid ${typeInfo.color}33`, fontWeight: 600 }}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      {post.locationName && (
                        <span style={{ fontSize: 11, color: 'rgba(184,223,240,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {post.locationName}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'rgba(126,200,227,0.4)', marginLeft: 'auto' }}>
                        {formatPostTime(post.createdAt)}
                      </span>
                    </div>

                    {/* Post Title & Content */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>{post.title}</div>
                    <div style={{ fontSize: 13.5, color: 'rgba(226, 232, 240, 0.85)', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-line' }}>
                      {post.content}
                    </div>

                    {/* Reactions & Source Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
                        <button
                          onClick={() => handleReact(post.id, 'like')}
                          className="glass"
                          style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          👍 <span>{reactions.like}</span>
                        </button>
                        <button
                          onClick={() => handleReact(post.id, 'helpful')}
                          className="glass"
                          style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          🙏 <span>{reactions.helpful}</span>
                        </button>
                        <button
                          onClick={() => handleReact(post.id, 'verify')}
                          className="glass"
                          style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          ✅ <span>{reactions.verify}</span>
                        </button>
                      </div>

                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageSquare size={12} />
                        <span>Source: {post.isOfficial ? 'Official Advisory' : 'ORCA Mariner Network'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 520,
              padding: 24,
              borderRadius: 20,
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#ffffff' }}>Create Community Post</div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12.5, marginBottom: 14 }}>
                ⚠ {formError}
              </div>
            )}

            <form onSubmit={handleCreatePostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as PostType)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  <option value="CONDITION_REPORT" style={{ background: '#0f172a' }}>🌊 Ocean Conditions</option>
                  <option value="ZONE_REPORT" style={{ background: '#0f172a' }}>🎣 Fishing Observation</option>
                  <option value="DANGER_REPORT" style={{ background: '#0f172a' }}>⚠️ Safety / Hazard Warning</option>
                  <option value="OBSERVATION" style={{ background: '#0f172a' }}>👁 Weather Observation</option>
                  <option value="OTHER" style={{ background: '#0f172a' }}>💬 Other Marine Information</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>Title / Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Calm morning sea near Puducherry Port"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>Location Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai Harbour Coast"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-light)', marginBottom: 6, display: 'block' }}>Post Details / Observation</label>
                <textarea
                  rows={4}
                  placeholder="Describe sea conditions, wave heights, wind, catch details, or safety hazards observed..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-light)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
