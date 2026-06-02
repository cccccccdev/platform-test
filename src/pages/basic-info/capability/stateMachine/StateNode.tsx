import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

// Using any to bypass complex React Flow type constraints
function StateNode({ data, selected }: any) {
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