import { useEffect, useState } from 'react'

type CommunityPost = {
  id: string
  userId: string
  userName: string
  postType: 'OBSERVATION' | 'CONDITION_REPORT' | 'ZONE_REPORT' | 'DANGER_REPORT'
  title: string
  content: string
  locationName?: string
  reactions: {
    like: number
    helpful: number
    verify: number
  }
  commentsCount: number
  createdAt: string
  isOfficial: boolean
  isVerified: boolean
}

type Community = {
  id: string
  name: string
  description: string
  locationName: string
  createdBy: string
  members: string[]
  createdAt: string
  membersCount: number
}

const postTypeLabels: Record<string, { icon: string; color: string }> = {
  OBSERVATION: { icon: '👁', color: '#7ec8e3' },
  CONDITION_REPORT: { icon: '🌊', color: '#2d8bba' },
  ZONE_REPORT: { icon: '🎣', color: '#4ade80' },
  DANGER_REPORT: { icon: '⚠️', color: '#f87171' },
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [communities, setCommunities] = useState<Community[]>([])
  const [showCreateCommunity, setShowCreateCommunity] = useState(false)
  const [intelligence, setIntelligence] = useState<any>(null)
  const [intelligenceLoading, setIntelligenceLoading] = useState(false)
  const [intelligenceError, setIntelligenceError] = useState('')
  const [communityName, setCommunityName] = useState('')
  const [communityDescription, setCommunityDescription] = useState('')
  const [communityLocation, setCommunityLocation] = useState('')
  const [creatingCommunity, setCreatingCommunity] = useState(false)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] =
    useState<CommunityPost['postType']>('CONDITION_REPORT')
  const [locationName, setLocationName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load real community posts
  const loadPosts = async () => {
    try {
      const response = await fetch('/api/community')

      if (!response.ok) {
        throw new Error('Failed to load community reports')
      }

      const result = await response.json()

      setPosts(result.data ?? [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('Unable to connect to Community server')
    } finally {
      setLoading(false)
    }
  }
  const loadCommunities = async () => {
  try {
    const response = await fetch('/api/communities')

    if (!response.ok) {
      throw new Error('Failed to load communities')
    }

    const result = await response.json()

    setCommunities(result.data ?? [])
  } catch (err) {
    console.error('Failed to load communities:', err)
  }
}
const loadCommunityIntelligence = async (communityId: string) => {
  try {
    setIntelligenceLoading(true)
    setIntelligenceError('')

    const response = await fetch('/api/communities/intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        communityId,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate community intelligence')
    }

    const result = await response.json()

    setIntelligence(result.data ?? null)
  } catch (err) {
    console.error('Community intelligence error:', err)
    setIntelligenceError(
      'Unable to generate community intelligence',
    )
  } finally {
    setIntelligenceLoading(false)
  }
}
const createCommunity = async () => {
  if (
    !communityName.trim() ||
    !communityDescription.trim() ||
    !communityLocation.trim()
  ) {
    alert('Please fill in all community details.')
    return
  }

  setCreatingCommunity(true)

  try {
    const response = await fetch('/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: communityName.trim(),
        description: communityDescription.trim(),
        locationName: communityLocation.trim(),
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create community')
    }

    setCommunities((current) => [result.data, ...current])

    setCommunityName('')
    setCommunityDescription('')
    setCommunityLocation('')
    setShowCreateCommunity(false)

    alert('Community created successfully!')
  } catch (err) {
    console.error('Create community error:', err)
    alert(
      err instanceof Error
        ? err.message
        : 'Failed to create community'
    )
  } finally {
    setCreatingCommunity(false)
  }
}

 useEffect(() => {
  loadPosts()
  loadCommunities()
}, [])


  // Create a real community report
  const submitPost = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please enter a title and report description.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postType,
          title,
          content,
          locationName: locationName || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create report')
      }

      const result = await response.json()

      // Immediately add the new post to the top
      setPosts((current) => [result.data, ...current])

      // Clear form
      setTitle('')
      setContent('')
      setLocationName('')

      alert('Community report shared successfully!')
    } catch (err) {
      console.error(err)
      alert('Failed to share community report.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()

    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)

    if (hours < 24) return `${hours}h ago`

    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="page-shell">

      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1 className="page-title">Community</h1>

          <p className="page-subtitle">
            Real fishermen reports — shared live with the ORCA community
          </p>
        </div>

        <div
          style={{
            padding: '6px 12px',
            borderRadius: 20,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#4ade80',
            fontSize: 12,
          }}
        >
          ● LIVE COMMUNITY
        </div>
      </div>

      {/* DISCLAIMER */}

      <div
        style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 12.5,
          color: 'rgba(251,191,36,0.8)',
          marginBottom: 16,
        }}
      >
        ⚠️ Community reports are shared by fishermen. They are NOT official
        government or ISRO data. Always verify with official sources before
        making safety decisions.
      </div>
      {/* COMMUNITIES */}

<div
  className="glass-card"
  style={{
    padding: 20,
    marginBottom: 16,
  }}
>
  <h3 style={{ marginTop: 0, color: '#e8f4fb' }}>
    👥 Marine Communities
  </h3>

  {communities.map((community) => (
    <div
      key={community.id}
      style={{
        padding: 14,
        marginTop: 10,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: '#e8f4fb',
        }}
      >
        {community.name}
      </div>

      <div
        style={{
          fontSize: 13,
          marginTop: 5,
          color: 'rgba(184,223,240,0.7)',
        }}
      >
        {community.description}
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 8,
          color: 'rgba(126,200,227,0.7)',
        }}
      >
        📍 {community.locationName} · 👥 {community.membersCount} members
      </div>
    </div>
  ))}
</div>

      {/* CREATE REPORT */}

      <div
        className="glass-card"
        style={{
          padding: 20,
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: 14,
            color: '#e8f4fb',
          }}
        >
          📢 Share a Marine Report
        </h3>

        <div
          style={{
            display: 'grid',
            gap: 10,
          }}
        >

          <select
            value={postType}
            onChange={(e) =>
              setPostType(e.target.value as CommunityPost['postType'])
            }
            style={{
              padding: 10,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: '#e8f4fb',
              border: '1px solid rgba(126,200,227,0.2)',
            }}
          >
            <option value="OBSERVATION">👁 Observation</option>
            <option value="CONDITION_REPORT">🌊 Sea Condition</option>
            <option value="ZONE_REPORT">🎣 Fishing Zone</option>
            <option value="DANGER_REPORT">⚠️ Danger Report</option>
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report title..."
            style={{
              padding: 10,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: '#e8f4fb',
              border: '1px solid rgba(126,200,227,0.2)',
            }}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe what you observed..."
            rows={4}
            style={{
              padding: 10,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: '#e8f4fb',
              border: '1px solid rgba(126,200,227,0.2)',
              resize: 'vertical',
            }}
          />

          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Location (optional)"
            style={{
              padding: 10,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: '#e8f4fb',
              border: '1px solid rgba(126,200,227,0.2)',
            }}
          />

          <button
            onClick={submitPost}
            disabled={submitting}
            style={{
              padding: '11px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: '#2d8bba',
              color: 'white',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Sharing...' : '🚀 Share Report'}
          </button>

        </div>
      </div>
      {/* COMMUNITY NETWORK */}

<div style={{ marginBottom: 20 }}>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    }}
  >
    <div>
      <h3
        style={{
          margin: 0,
          color: '#e8f4fb',
          fontSize: 18,
        }}
      >
        🌊 Community Network
      </h3>

      <p
        style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'rgba(184,223,240,0.55)',
        }}
      >
        Connect with local fishermen and share marine intelligence
      </p>
    </div>

    <button
      onClick={() => setShowCreateCommunity(true)}
      style={{
        padding: '9px 14px',
        borderRadius: 9,
        border: '1px solid rgba(126,200,227,0.25)',
        background: 'rgba(126,200,227,0.08)',
        color: '#7ec8e3',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      + Create Community
    </button>
  </div>

  {communities.length === 0 ? (
    <div
      className="glass-card"
      style={{
        padding: 20,
        textAlign: 'center',
        color: 'rgba(184,223,240,0.5)',
        fontSize: 13,
      }}
    >
      No communities available yet.
    </div>
  ) : (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}
    >
      {communities.map((community) => (
        <div
          key={community.id}
          className="glass-card"
          style={{
            padding: 18,
            border:
              '1px solid rgba(126,200,227,0.15)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 25 }}>
              🌊
            </div>

            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#e8f4fb',
                }}
              >
                {community.name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color:
                    'rgba(126,200,227,0.55)',
                  marginTop: 3,
                }}
              >
                📍 {community.locationName}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              color:
                'rgba(184,223,240,0.7)',
              marginBottom: 14,
            }}
          >
            {community.description}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
            }}
          >
            <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}
>
  <span
    style={{
      fontSize: 11,
      color: 'rgba(126,200,227,0.55)',
    }}
  >
    👥 {community.membersCount} members
  </span>
</div>

<div
  style={{
    display: 'flex',
    gap: 8,
  }}
>
  <button
    onClick={() => loadCommunityIntelligence(community.id)}
    disabled={intelligenceLoading}
    style={{
      padding: '7px 12px',
      borderRadius: 8,
      border: '1px solid rgba(126,200,227,0.25)',
      background: 'rgba(126,200,227,0.08)',
      color: '#7ec8e3',
      cursor: intelligenceLoading
        ? 'not-allowed'
        : 'pointer',
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    🧠 {intelligenceLoading
      ? 'Analyzing...'
      : 'Analyze Intelligence'}
  </button>

  <button
    style={{
      padding: '7px 12px',
      borderRadius: 8,
      border: '1px solid rgba(74,222,128,0.25)',
      background: 'rgba(74,222,128,0.08)',
      color: '#4ade80',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    Join Community
  </button>
</div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
{/* COMMUNITY INTELLIGENCE */}

{intelligenceError && (
  <div
    style={{
      padding: 12,
      marginBottom: 16,
      borderRadius: 10,
      background: 'rgba(248,113,113,0.08)',
      border: '1px solid rgba(248,113,113,0.2)',
      color: '#f87171',
      fontSize: 12,
    }}
  >
    ⚠️ {intelligenceError}
  </div>
)}

{intelligence && (
  <div
    className="glass-card"
    style={{
      padding: 20,
      marginBottom: 20,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            color: '#e8f4fb',
            fontSize: 18,
          }}
        >
          🧠 Community Intelligence
        </h3>

        <p
          style={{
            margin: '4px 0 0',
            fontSize: 12,
            color: 'rgba(184,223,240,0.55)',
          }}
        >
          AI analysis of recent fisherman reports
        </p>
      </div>

      <div
        style={{
          padding: '5px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          color:
            intelligence.intelligence.riskLevel === 'HIGH'
              ? '#f87171'
              : intelligence.intelligence.riskLevel === 'MODERATE'
              ? '#fbbf24'
              : '#4ade80',
          background:
            intelligence.intelligence.riskLevel === 'HIGH'
              ? 'rgba(248,113,113,0.1)'
              : intelligence.intelligence.riskLevel === 'MODERATE'
              ? 'rgba(251,191,36,0.1)'
              : 'rgba(74,222,128,0.1)',
        }}
      >
        🚦 {intelligence.intelligence.riskLevel} RISK
      </div>
    </div>

    {/* SUMMARY */}

    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: 'rgba(126,200,227,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#7ec8e3',
          marginBottom: 5,
          fontWeight: 600,
        }}
      >
        Community Summary
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'rgba(232,244,251,0.8)',
        }}
      >
        {intelligence.intelligence.summary}
      </div>
    </div>

    {/* INTELLIGENCE GRID */}

    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}
    >

      {/* CONDITIONS */}

      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#7ec8e3',
            marginBottom: 8,
          }}
        >
          🌊 Conditions
        </div>

        {intelligence.intelligence.conditions?.length > 0 ? (
          intelligence.intelligence.conditions.map(
            (condition: string, index: number) => (
              <div
                key={index}
                style={{
                  fontSize: 12,
                  color: 'rgba(184,223,240,0.7)',
                  marginBottom: 5,
                }}
              >
                • {condition}
              </div>
            ),
          )
        ) : (
          <div style={{ fontSize: 12 }}>
            No conditions identified.
          </div>
        )}
      </div>

      {/* HOTSPOTS */}

      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#f87171',
            marginBottom: 8,
          }}
        >
          📍 Hotspots
        </div>

        {intelligence.intelligence.hotspots?.length > 0 ? (
          intelligence.intelligence.hotspots.map(
            (hotspot: string, index: number) => (
              <div
                key={index}
                style={{
                  fontSize: 12,
                  color: 'rgba(184,223,240,0.7)',
                  marginBottom: 5,
                }}
              >
                • {hotspot}
              </div>
            ),
          )
        ) : (
          <div style={{ fontSize: 12 }}>
            No hotspots identified.
          </div>
        )}
      </div>

      {/* FISHING ACTIVITY */}

      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#4ade80',
            marginBottom: 8,
          }}
        >
          🎣 Fishing Activity
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#e8f4fb',
          }}
        >
          {intelligence.intelligence.fishingActivity}
        </div>
      </div>
    </div>

    {/* RECOMMENDATION */}

    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 10,
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.15)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#fbbf24',
          marginBottom: 5,
        }}
      >
        ⚠️ Recommendation
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'rgba(232,244,251,0.8)',
        }}
      >
        {intelligence.intelligence.recommendation}
      </div>
    </div>

    <div
      style={{
        marginTop: 12,
        fontSize: 10,
        color: 'rgba(184,223,240,0.4)',
      }}
    >
      ⚠️ Based only on community-submitted reports. Not official
      government or ISRO data.
    </div>
  </div>
)}
      {/* STATUS */}

      {loading && (
        <div style={{ padding: 20 }}>
          Loading live community reports...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            color: '#f87171',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* POSTS */}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >

        {posts.map((post) => {

          const typeInfo =
            postTypeLabels[post.postType] ?? {
              icon: '💬',
              color: '#7ec8e3',
            }

          return (
            <div
              key={post.id}
              className="glass-card"
              style={{ padding: 20 }}
            >

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >

                <div
                  className="avatar"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {post.userName.charAt(0)}
                </div>

                <div style={{ flex: 1 }}>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >

                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: 'var(--text-main)',
                      }}
                    >
                      {post.userName}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: typeInfo.color,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: `${typeInfo.color}1a`,
                        border: `1px solid ${typeInfo.color}33`,
                      }}
                    >
                      {typeInfo.icon}{' '}
                      {post.postType.replace('_', ' ')}
                    </span>

                    {post.isVerified && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#4ade80',
                          padding: '2px 7px',
                          borderRadius: 99,
                          background: 'rgba(34,197,94,0.1)',
                          border:
                            '1px solid rgba(34,197,94,0.25)',
                        }}
                      >
                        ✓ Verified report
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: 10,
                        color: 'rgba(126,200,227,0.5)',
                        marginLeft: 'auto',
                      }}
                    >
                      {formatTime(post.createdAt)}
                    </span>

                  </div>

                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: '#e8f4fb',
                      marginBottom: 6,
                    }}
                  >
                    {post.title}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(184,223,240,0.7)',
                      lineHeight: 1.6,
                      marginBottom: 10,
                    }}
                  >
                    {post.content}
                  </div>

                  {post.locationName && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(126,200,227,0.7)',
                        marginBottom: 10,
                      }}
                    >
                      📍 {post.locationName}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      fontSize: 12,
                      color: 'rgba(126,200,227,0.5)',
                    }}
                  >
                    <span>👍 {post.reactions.like}</span>
                    <span>🙏 {post.reactions.helpful}</span>
                    <span>✅ {post.reactions.verify}</span>

                    <span style={{ marginLeft: 'auto' }}>
                      💬 {post.commentsCount} comments
                    </span>
                  </div>

                </div>
              </div>

            </div>
          )
        })}

      </div>
      {/* CREATE COMMUNITY MODAL */}

      {showCreateCommunity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 24,
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowCreateCommunity(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 14,
                background: 'none',
                border: 'none',
                color: 'rgba(184,223,240,0.7)',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <h2
              style={{
                marginTop: 0,
                marginBottom: 6,
                color: '#e8f4fb',
              }}
            >
              🌊 Create Community
            </h2>

            <p
              style={{
                marginTop: 0,
                marginBottom: 20,
                fontSize: 12,
                color: 'rgba(184,223,240,0.55)',
              }}
            >
              Create a local space for fishermen to share marine intelligence.
            </p>

            <div
              style={{
                display: 'grid',
                gap: 12,
              }}
            >
              <input
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
                placeholder="Community name"
                style={{
                  padding: 11,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e8f4fb',
                  border: '1px solid rgba(126,200,227,0.2)',
                }}
              />

              <textarea
                value={communityDescription}
                onChange={(e) =>
                  setCommunityDescription(e.target.value)
                }
                placeholder="What is this community about?"
                rows={4}
                style={{
                  padding: 11,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e8f4fb',
                  border: '1px solid rgba(126,200,227,0.2)',
                  resize: 'vertical',
                }}
              />

              <input
                value={communityLocation}
                onChange={(e) =>
                  setCommunityLocation(e.target.value)
                }
                placeholder="Location / Coast"
                style={{
                  padding: 11,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e8f4fb',
                  border: '1px solid rgba(126,200,227,0.2)',
                }}
              />

              <button
                onClick={createCommunity}
                disabled={creatingCommunity}
                style={{
                  padding: '11px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2d8bba',
                  color: 'white',
                  cursor: creatingCommunity
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: 600,
                }}
              >
                {creatingCommunity
                  ? 'Creating...'
                  : '🚀 Create Community'}
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}