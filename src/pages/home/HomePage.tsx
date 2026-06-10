import { Card, Row, Col, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  ForkOutlined,
  ApiOutlined,
  ArrowRightOutlined,
  BankOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  CreditCardOutlined,
  UserSwitchOutlined,
  BuildOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  MessageOutlined,
  UserOutlined,
  ControlOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ModuleEntryProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  subItems?: { name: string; path: string; icon: React.ReactNode }[];
}

function ModuleEntry({ title, description, icon, color, path, subItems }: ModuleEntryProps) {
  const navigate = useNavigate();

  return (
    <Card
      style={{
        height: '100%',
        borderTop: `4px solid ${color}`,
        borderRadius: 12,
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{
          padding: '24px 24px 16px',
          cursor: 'pointer',
        }}
        onClick={() => navigate(path)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{title}</span>
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{description}</div>
          </div>
          <ArrowRightOutlined style={{ color: '#999', fontSize: 18 }} />
        </div>
      </div>

      {subItems && subItems.length > 0 && (
        <div
          style={{
            borderTop: '1px solid #f0f0f0',
            padding: '16px 24px',
            background: '#fafafa',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <Row gutter={[12, 12]}>
            {subItems.map((item) => (
              <Col key={item.path} xs={12} sm={8} md={6}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#fff',
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: '1px solid #e8e8e8',
                    transition: 'all 0.2s',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(item.path);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: 16, color }}>{item.icon}</span>
                  <Text style={{ fontSize: 13 }}>{item.name}</Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Card>
  );
}

export default function HomePage() {
  const modules = [
    {
      title: '基础信息',
      description: '管理国家、Party、卡Bin、业务类型、能力、机构类型、机构、段、响应码、应用、服务等基础配置',
      icon: <DashboardOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff',
      path: '/basic-info',
      subItems: [
        { name: 'Country', path: '/basic-info/country', icon: <GlobalOutlined /> },
        { name: 'Party', path: '/basic-info/party', icon: <UserSwitchOutlined /> },
        { name: 'Card Bin', path: '/basic-info/card-bin', icon: <CreditCardOutlined /> },
        { name: 'Party&Tenant', path: '/basic-info/party-tenant', icon: <ApartmentOutlined /> },
        { name: 'Business Type', path: '/basic-info/business-type', icon: <AppstoreOutlined /> },
        { name: 'Capability', path: '/basic-info/capability', icon: <BuildOutlined /> },
        { name: 'Institution Type', path: '/basic-info/institution-type', icon: <ApartmentOutlined /> },
        { name: 'Institution', path: '/basic-info/institution', icon: <BankOutlined /> },
        { name: 'Segment', path: '/basic-info/segment', icon: <FileTextOutlined /> },
        { name: 'Response Code', path: '/basic-info/response-code', icon: <MessageOutlined /> },
        { name: 'Application', path: '/basic-info/application', icon: <AppstoreOutlined /> },
        { name: 'Service', path: '/basic-info/service', icon: <ApiOutlined /> },
        { name: 'StateMachine', path: '/basic-info/stateMachine', icon: <ControlOutlined /> },
      ],
    },
    {
      title: 'Channel Integration',
      description: '渠道管理 → 场景配置 → 场景编辑/详情/流量控制/发布管理',
      icon: <ForkOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a',
      path: '/channel-integration',
      subItems: [
        { name: '渠道列表', path: '/channel-integration', icon: <BankOutlined /> },
      ],
    },
    {
      title: '流程编排',
      description: 'L2原子层 → L3组合层 → L4模板层，完整的三层架构编排能力',
      icon: <ApiOutlined style={{ color: '#fa8c16' }} />,
      color: '#fa8c16',
      path: '/process-orchestration/l2-dictionary',
      subItems: [
        { name: 'L2字典', path: '/process-orchestration/l2-dictionary', icon: <ApiOutlined /> },
        { name: 'L3组件库', path: '/process-orchestration/l3-library', icon: <AppstoreOutlined /> },
        { name: '公共模版库', path: '/process-orchestration/l4-library', icon: <ForkOutlined /> },
        { name: '个人模版库', path: '/process-orchestration/my-templates', icon: <UserOutlined /> },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
      {/* Welcome Section */}
      <Card
        style={{
          margin: '24px 0',
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          border: 'none',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: '32px 40px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ color: '#fff', marginBottom: 8, fontWeight: 600 }}>
              接入平台 2.0
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
              让接入像乐高积木一样简单
            </Text>
          </div>
          <Space>
            <Tag style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
              L2 原子层
            </Tag>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>→</span>
            <Tag style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
              L3 组合层
            </Tag>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>→</span>
            <Tag style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
              L4 模板层
            </Tag>
          </Space>
        </div>
      </Card>

      {/* Module Entries */}
      <Row gutter={[24, 24]}>
        {modules.map((module) => (
          <Col key={module.path} xs={24}>
            <ModuleEntry {...module} />
          </Col>
        ))}
      </Row>

      {/* Platform Architecture */}
      <Card
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>平台架构</span>}
        style={{ margin: '24px 0' }}
        bodyStyle={{ padding: '24px 32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          {[
            { label: 'L2 原子层', desc: '最小技术单元', color: '#1890ff', example: 'MoMo Pay API、WeChat Query API' },
            { label: 'L3 组合层', desc: '可复用逻辑块', color: '#52c41a', example: '支付选择器、退款处理' },
            { label: 'L4 模板层', desc: '面向场景方案', color: '#fa8c16', example: '电商支付流程、余额查询流程' },
          ].map((layer, idx) => (
            <div
              key={layer.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 24px',
                background: `${layer.color}08`,
                borderRadius: 12,
                border: `1px solid ${layer.color}20`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: `${layer.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 600,
                  color: layer.color,
                }}
              >
                L{idx + 2}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: layer.color }}>{layer.label}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{layer.desc}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{layer.example}</div>
              </div>
              {idx < 2 && <span style={{ color: '#d9d9d9', fontSize: 20, marginLeft: 8 }}>→</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
