import { Card, Row, Col, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  BankOutlined,
  AppstoreOutlined,
  DollarOutlined,
  GlobalOutlined,
  TransactionOutlined,
  ShopOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ConfigItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
}

function ConfigItem({ title, description, icon, color, path }: ConfigItemProps) {
  const navigate = useNavigate();

  return (
    <Col xs={24} sm={12} lg={8}>
      <Card
        hoverable
        style={{
          height: '100%',
          borderTop: `3px solid ${color}`,
          borderRadius: 8,
        }}
        bodyStyle={{ padding: 20 }}
        onClick={() => navigate(path)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
          </div>
        </div>
      </Card>
    </Col>
  );
}

export default function BasicInfoIndex() {
  const configItems = [
    {
      title: '渠道管理',
      description: '配置支付渠道信息，包括渠道编码、名称、业务类型等',
      icon: <BankOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff',
      path: '/channel',
    },
    {
      title: '业务类型',
      description: '管理业务类型层级结构，如线上支付、线下支付、退款等',
      icon: <AppstoreOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a',
      path: '/basic-info/business-type',
    },
    {
      title: '货币配置',
      description: '配置支持的货币类型，包括货币代码、符号、精度等',
      icon: <DollarOutlined style={{ color: '#fa8c16' }} />,
      color: '#fa8c16',
      path: '/basic-info/currency',
    },
    {
      title: '国家配置',
      description: '配置支持的国家/地区，包括国家代码、名称、时区等',
      icon: <GlobalOutlined style={{ color: '#722ed1' }} />,
      color: '#722ed1',
      path: '/basic-info/country',
    },
    {
      title: '汇率配置',
      description: '配置货币汇率，支持多币种之间的汇率转换',
      icon: <TransactionOutlined style={{ color: '#eb2f96' }} />,
      color: '#eb2f96',
      path: '/basic-info/exchange-rate',
    },
    {
      title: '产品配置',
      description: '配置支付产品，如快捷支付、协议支付、代扣等',
      icon: <ShopOutlined style={{ color: '#13c2c2' }} />,
      color: '#13c2c2',
      path: '/basic-info/product',
    },
    {
      title: '商户配置',
      description: '配置商户信息，包括商户号、商户名称、接入方式等',
      icon: <UnorderedListOutlined style={{ color: '#fa541c' }} />,
      color: '#fa541c',
      path: '/basic-info/merchant',
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <Card style={{ margin: '24px 0' }}>
        <Title level={4} style={{ marginBottom: 0 }}>基础信息</Title>
        <Text type="secondary">管理渠道、业务类型、货币、国家、汇率、产品、商户等基础配置</Text>
      </Card>

      <Row gutter={[16, 16]}>
        {configItems.map((item) => (
          <ConfigItem key={item.title} {...item} />
        ))}
      </Row>
    </div>
  );
}
