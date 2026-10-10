import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function StepNode({ data, selected }: any) {
  return (
    <div
      style={{
        position: 'relative',
        width: 120,
        height: 50,
        background: '#fff',
        border: selected ? '2px solid #3b82f6' : '1px solid #333',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'move',
        userSelect: 'none',
        boxShadow: selected ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        transform: 'skewX(-10deg)',
        transition: 'border 0.15s, box-shadow 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} id="target" style={{ top: 4 }} />
      <Handle type="source" position={Position.Bottom} id="source" style={{ bottom: 4 }} />
      <span style={{ color: '#333', fontSize: 13, fontWeight: 500, textAlign: 'center', transform: 'skewX(10deg)', padding: '0 12px', lineHeight: 1.3 }}>
        {data?.name}
      </span>
    </div>
  );
}

export default memo(StepNode);