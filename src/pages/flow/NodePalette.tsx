import { Tooltip } from 'antd';

interface NodeType {
  type: string;
  label: string;
  color: string;
  icon: string;
}

interface NodePaletteProps {
  nodeTypes: NodeType[];
}

export function NodePalette({ nodeTypes }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div>
      <p style={{ fontWeight: 500, marginBottom: 8, fontSize: 12 }}>节点组件库</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nodeTypes.map((nt) => (
          <Tooltip key={nt.type} title={`拖拽到画布添加${nt.label}`}>
            <div
              draggable
              onDragStart={(e) => onDragStart(e, nt.type)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${nt.color}`,
                borderRadius: 6,
                background: '#fff',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = nt.color + '10';
                e.currentTarget.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ fontSize: 14 }}>{nt.icon}</span>
              <span>{nt.label}</span>
            </div>
          </Tooltip>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 10, color: '#666' }}>
        <p style={{ marginBottom: 4 }}>💡 提示</p>
        <p>1. 从左侧拖拽节点到画布</p>
        <p>2. 节点之间拖拽连线</p>
        <p>3. 点击节点查看配置</p>
      </div>
    </div>
  );
}
