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
  if (data?.viewMode === 'detail') {
    const status = data?.businessStatus || '-';
    const colors = statusColor[status] || { color: '#595959', background: '#fafafa', border: '#d9d9d9' };

    return (
      <div
        style={{
          width: 190,
          minHeight: 92,
          borderRadius: 8,
          background: selected ? '#f6ffed' : '#fff',
          border: selected ? '2px solid #52c41a' : '1px solid #91caff',
          boxShadow: selected ? '0 0 0 3px rgba(82,196,26,.16)' : '0 2px 8px rgba(0,0,0,0.08)',
          padding: '12px 14px',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <Handle type="target" position={Position.Top} id="target" style={{ top: -5 }} />
        <Handle type="source" position={Position.Bottom} id="source" style={{ bottom: -5 }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ color: '#262626', fontSize: 14, fontWeight: 700, lineHeight: 1.25, wordBreak: 'break-word' }}>
            {data?.name}
          </div>
          <span
            style={{
              flexShrink: 0,
              color: colors.color,
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              lineHeight: '18px',
              padding: '0 6px',
            }}
          >
            {status}
          </span>
        </div>
        <div style={{ color: '#8c8c8c', fontSize: 11, lineHeight: 1.45, marginTop: 8 }}>
          {data?.description || 'No description'}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: selected ? '#16a34a' : '#22c55e',
        border: selected ? '3px solid #3b82f6' : 'none',
        boxShadow: selected ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'move',
        userSelect: 'none',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} id="target" style={{ top: 8 }} />
      <Handle type="source" position={Position.Bottom} id="source" style={{ bottom: 8 }} />
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 8, wordBreak: 'break-word', lineHeight: 1.3 }}>
        {data?.name}
      </span>
    </div>
  );
}

export default memo(StateNode);
