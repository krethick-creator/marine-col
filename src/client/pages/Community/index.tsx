import { mockCommunityPosts } from '../../services/mockProviders/mockData'

const postTypeLabels: Record<string, { icon: string; color: string }> = {
  OBSERVATION:    { icon: '👁', color: '#7ec8e3' },
  CONDITION_REPORT: { icon: '🌊', color: '#2d8bba' },
  ZONE_REPORT:    { icon: '🎣', color: '#4ade80' },
  DANGER_REPORT:  { icon: '⚠️', color: '#f87171' },
}

export default function CommunityPage() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Community</h1>
          <p className="page-subtitle">Real fishermen reports — not official data</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12.5, color: 'rgba(251,191,36,0.8)' }}>
        ⚠️ Community reports are shared by fishermen. They are NOT official government or ISRO data. Always verify with official sources before making safety decisions.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mockCommunityPosts.map((post) => {
          const typeInfo = postTypeLabels[post.postType] ?? { icon: '💬', color: '#7ec8e3' }
          return (
            <div key={post.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>
                  {post.userName.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{post.userName}</span>
                    <span style={{ fontSize: 11, color: typeInfo.color, padding: '2px 8px', borderRadius: 99, background: `${typeInfo.color}1a`, border: `1px solid ${typeInfo.color}33` }}>
                      {typeInfo.icon} {post.postType.replace('_', ' ')}
                    </span>
                    {post.isVerified && (
                      <span style={{ fontSize: 10, color: '#4ade80', padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        ✓ Verified report
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'rgba(126,200,227,0.3)', marginLeft: 'auto' }}>
                      {Math.round((Date.now() - post.createdAt.getTime()) / 3600000)}h ago
                    </span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#e8f4fb', marginBottom: 6 }}>{post.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(184,223,240,0.7)', lineHeight: 1.6, marginBottom: 10 }}>{post.content}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(126,200,227,0.4)' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', gap: 4 }}>👍 {post.reactions.like}</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', gap: 4 }}>🙏 {post.reactions.helpful}</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', gap: 4 }}>✅ {post.reactions.verify}</button>
                    <span style={{ marginLeft: 'auto' }}>💬 {post.commentsCount} comments</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
