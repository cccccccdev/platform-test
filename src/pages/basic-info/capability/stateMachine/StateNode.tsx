import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const statusColor: Record<string, { color: string; background: string; border: string }> = {
  INIT: { color: '#0958d9', background: '#e6f4ff', border: '#91caff' },
  PENDING: { color: '#d46b08', background: '#fff7e6', border: '#ffd591' },
  SUCCESS: { color: '#237804', background: '#f6ffed', border: '#b7eb8f' },
  FAIL: { color: '#cf1322', background: '#fff1f0', border: '#ffa39e' },
};

// Using any to bypass complex React Flow type constraints
function StateNode({ data, selected }: any) {
  const status = data?.businessStatus || '-';
  const colors = statusColor[status] || { color: '#595959', background: '#fafafa', border: '#d9d9d9' };

  return (
    <div
      style={{
        width: 190,
        minHeight: 96,
        borderRadius: 9,
        background: '#fff',
        border: selected ? '2px solid #6366f1' : `1.5px solid ${colors.border}`,
        boxShadow: selected ? '0 0 0 3px rgba(99,102,241,.13)' : '0 2px 8px rgba(15,23,42,.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: data?.viewMode === 'detail' ? 'default' : 'move',
        userSelect: 'none',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} id="target" style={{ top: -5, background: '#1e293b' }} />
      <Handle type="source" position={Position.Bottom} id="source" style={{ bottom: -5, background: '#1e293b' }} />
      <span style={{ position: 'absolute', top: 7, right: 7, color: colors.color, background: colors.background, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{status}</span>
      <div style={{ textAlign: 'center', padding: '26px 14px 12px' }}>
        <div style={{ color: '#262626', fontSize: 14, fontWeight: 700, wordBreak: 'break-word' }}>{data?.name || '-'}</div>
        <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>{data?.description || data?.name || '-'}</div>
      </div>
    </div>
  );
}

export default memo(StateNode);
