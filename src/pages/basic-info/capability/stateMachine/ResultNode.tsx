import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ResultNode({ data, selected }: any) {
  return (
    <div
      style={{
        minWidth: 100,
        maxWidth: 160,
        minHeight: 40,
        background: selected ? '#fef3c7' : '#fef9c3',
        border: selected ? '2px solid #3b82f6' : '1px solid #ca8a04',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'move',
        userSelect: 'none',
        boxShadow: selected ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'border 0.15s, box-shadow 0.15s, background 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} id="target" style={{ top: 4 }} />
      <Handle type="source" position={Position.Bottom} id="source" style={{ bottom: 4 }} />
      <Handle type="source" position={Position.Left} id="source-left" style={{ left: 4 }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ right: 4 }} />
      <span style={{ color: '#92400e', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: '8px 12px', lineHeight: 1.3 }}>
        {data?.name}
      </span>
    </div>
  );
}

export default memo(ResultNode);