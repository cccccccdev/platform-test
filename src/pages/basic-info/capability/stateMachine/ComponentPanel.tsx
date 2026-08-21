export default function ComponentPanel({ disabled = false }: { disabled?: boolean }) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      style={{
        width: 240,
        background: '#fff',
        borderRight: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e5e5',
          fontWeight: 600,
          fontSize: 14,
          color: '#333',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', color: '#6366f1', display: 'grid', placeItems: 'center', fontSize: 17 }}>⊞</span>
          <span>
            <span style={{ display: 'block' }}>Components</span>
            <span style={{ display: 'block', marginTop: 2, color: '#94a3b8', fontSize: 12, fontWeight: 400 }}>{disabled ? 'View only' : 'Drag to canvas'}</span>
          </span>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* INIT State Card */}
        <div
          draggable={!disabled}
          onDragStart={e => onDragStart(e, 'init_state')}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '14px 12px',
            cursor: disabled ? 'not-allowed' : 'grab',
            opacity: disabled ? 0.48 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(24,144,255,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 5,
              background: '#f8fbff',
              border: '1px solid #93c5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <text x="12" y="15" textAnchor="middle" fontSize="7" fill="#64748b">INITIAL</text>
            </svg>
          </div>
          <span><span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155' }}>INITIAL State</span><span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>Default mapping: INITIAL</span></span>
        </div>

        {/* State Card */}
        <div
          draggable={!disabled}
          onDragStart={e => onDragStart(e, 'state')}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '14px 12px',
            cursor: disabled ? 'not-allowed' : 'grab',
            opacity: disabled ? 0.48 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 5,
              background: '#fbfff9',
              border: '1px solid #a7d99b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <text x="12" y="15" textAnchor="middle" fontSize="8" fill="#64748b">State</text>
            </svg>
          </div>
          <span><span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155' }}>State</span><span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>General state node</span></span>
        </div>
      </div>
    </div>
  );
}
