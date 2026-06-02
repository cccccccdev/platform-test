export default function ComponentPanel() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      style={{
        width: 200,
        background: '#fff',
        borderRight: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e5e5',
          fontWeight: 600,
          fontSize: 14,
          color: '#333',
        }}
      >
        Components
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* State Card */}
        <div
          draggable
          onDragStart={e => onDragStart(e, 'state')}
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '12px 16px',
            cursor: 'grab',
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
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>State</span>
        </div>

        {/* Step Card */}
        <div
          draggable
          onDragStart={e => onDragStart(e, 'step')}
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '12px 16px',
            cursor: 'grab',
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
              height: 28,
              background: '#fff',
              border: '1px solid #333',
              transform: 'skewX(-10deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Step</span>
        </div>

        {/* Result Card */}
        <div
          draggable
          onDragStart={e => onDragStart(e, 'result')}
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '12px 16px',
            cursor: 'grab',
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
              height: 28,
              background: '#fef9c3',
              border: '1px solid #ca8a04',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Result</span>
        </div>
      </div>
    </div>
  );
}