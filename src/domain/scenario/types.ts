// Scenario Domain Types - 业务场景核心类型

export type BusinessType = 'DEPOSIT' | 'WITHDRAWAL' | 'REFUND' | 'TRANSFER' | 'QUERY';

export interface ScenarioChannel {
  channelId: string;
  channelName: string;
  abilities: string[];  // ['wallet', 'card']
  status: 'active' | 'inactive';
}

export interface Scenario {
  scenarioId: string;
  name: string;
  businessType: BusinessType;
  description?: string;
  // 该场景支持的渠道列表
  channels: ScenarioChannel[];
  // 该场景对应的L4模板
  l4TemplateId: string;
  // 该场景支持的L3组合节点
  supportedL3Nodes: string[];
  // 状态
  status: 'active' | 'inactive';
  // 优先级（用于路由顺序）
  priority?: number;
}

export interface ScenarioFlowBinding {
  scenarioId: string;
  flowId: string;
  channelId: string;
  ability: string;
  action: string;
  status: 'active' | 'inactive';
}

// 业务类型标签
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  DEPOSIT: '入金',
  WITHDRAWAL: '出金',
  REFUND: '退款',
  TRANSFER: '转账',
  QUERY: '查询',
};

// 业务类型图标
export const BUSINESS_TYPE_ICONS: Record<BusinessType, string> = {
  DEPOSIT: '💰',
  WITHDRAWAL: '💸',
  REFUND: '↩️',
  TRANSFER: '🔄',
  QUERY: '🔍',
};
