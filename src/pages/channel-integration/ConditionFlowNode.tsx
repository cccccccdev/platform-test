import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { conditionHandleId } from './conditionFlowModel';

/**
 * 画布上的 condition 节点形态。
 *
 * 与普通组件节点的差别：
 * ① 卡片内含匹配策略（First Matched）与说明文案；
 * ② 每个分支一个底部 source handle（`branch-{index}`），边按分支顺序绑定 handle；
 * ③ 分支未配置 / 目标组件未配置 → 右上角 Issues 徽标 + 卡片内红框告警。
 *
 * 分支名称与目标组件名挂在每条出边的 data.condition / target 节点上，
 * 由 FlowEditorPage 在渲染前注入到 data.branches，节点本身不持有状态。
 */

export type ConditionBranchView = {
  /** 出边 id，点击分支时用它定位。 */
  id: string;
  name: string;
  target: string;
  /** 条件是否已配置完整。 */
  configured: boolean;
  /** 分支目标组件是否已配置。 */
  targetConfigured: boolean;
};

export default function ConditionFlowNode({ data }: { data: Record<string, any> }) {
  const [hovered, setHovered] = useState(false);
  const branches = (data.branches ?? []) as ConditionBranchView[];
  // 一个分支算一项问题：条件没配完，或它指向的组件没配完。
  const issues = branches.filter((branch) => !branch.configured || !branch.targetConfigured).length;
  const hasIssues = issues > 0;
  const slotCount = branches.length;

  return <div
    style={{ position: 'relative', width: 248 }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onClick={() => data.onConfig?.()}
  >
    <Handle type="target" position={Position.Top} style={{ background: '#8c8c8c' }} />

    {hasIssues && <span style={{
      position: 'absolute',
      top: -11,
      right: -2,
      zIndex: 3,
      background: '#ff4d4f',
      color: '#fff',
      borderRadius: 10,
      padding: '0 8px',
      height: 20,
      lineHeight: '20px',
      fontSize: 10.5,
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>{issues} {issues > 1 ? 'Issues' : 'Issue'}</span>}

    <div style={{
      border: `1.5px solid ${hasIssues ? '#ffa39e' : '#d9d9d9'}`,
      borderRadius: 8,
      background: '#fff',
      padding: '9px 12px 10px',
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(0,0,0,.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: '#1f2a3d' }}>Condition</span>
        <span style={{ fontSize: 10.5, color: '#d48806' }}>First Matched</span>
        {hovered && data.onDelete && <Button
          type="text"
          size="small"
          aria-label="Delete condition"
          icon={<DeleteOutlined style={{ fontSize: 12 }} />}
          style={{ color: '#ff4d4f', marginRight: -6 }}
          onClick={(event) => { event.stopPropagation(); data.onDelete(); }}
        />}
      </div>
      <div style={{ color: '#8c8c8c', fontSize: 10.5, marginTop: 3, lineHeight: 1.45 }}>Evaluates branches in configured order</div>
      {hasIssues && <div style={{
        marginTop: 7,
        border: '1px solid #ffccc7',
        background: '#fff2f0',
        color: '#cf1322',
        borderRadius: 4,
        padding: '4px 6px',
        fontSize: 10,
        lineHeight: 1.4,
      }}>[condition] isolated components are not permitted.</div>}
    </div>

    {slotCount === 0
      ? <Handle type="source" position={Position.Bottom} style={{ background: '#8c8c8c' }} />
      : branches.map((branch, index) => <Handle
        key={branch.id}
        id={conditionHandleId(index)}
        type="source"
        position={Position.Bottom}
        style={{ left: `${((index + 1) / (slotCount + 1)) * 100}%`, background: '#8c8c8c' }}
      />)}
  </div>;
}
