import { useAppStore } from '../../store';
import { formatTimeAgo } from '../../utils/timeUtils';

interface DataStatusBadgeProps {
  isCached?: boolean;
  fetchedAt?: string | Date;
}

export default function DataStatusBadge({ isCached, fetchedAt }: DataStatusBadgeProps) {
  const offlineMode = useAppStore(state => state.offlineMode);

  if (isCached && fetchedAt) {
    return (
      <div style={{ fontSize: 10, color: 'var(--status-caution)', padding: '2px 8px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
        USING CACHED DATA — {formatTimeAgo(fetchedAt)}
      </div>
    );
  }

  if (offlineMode) {
    return (
      <div style={{ fontSize: 10, color: 'var(--status-nogo)', padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
        NO DATA AVAILABLE
      </div>
    );
  }

  return (
    <div style={{ fontSize: 10, color: 'rgba(74,222,128,0.9)', padding: '2px 8px', borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
      LIVE DATA
    </div>
  );
}
