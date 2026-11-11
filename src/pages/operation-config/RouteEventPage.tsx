import { Breadcrumb, Button, Form, Input, Result, Select, Space, Table } from 'antd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { create } from 'zustand';
import { useBasicInfoReferenceStore } from '../basic-info/basicInfoReferenceStore';
import { useBusinessTypeStore } from '../basic-info/businessTypeReferenceData';
import { getTenantOptionsByCountry } from '../basic-info/partyTenantReferenceData';

const base = '/operation-config/route-event';
type RouteType = 'engine rule' | 'decision center';
type Fields = {
  country: string;
  tenant: string;
  businessType: string;
  service: string;
  transType?: string;
  sourceProduct?: string;
  businessTag?: string;
  routeType: RouteType;
  eventId?: string;
  eventSubId?: string;
};
type Record = Fields & { id: number };
type Filters = Partial<Fields> & { id?: string };

const scope = { country: 'NG', tenant: 'PALMPAY', businessType: 'BANK_ACCOUNT_CREDIT', service: 'TRANSFER' };
const decision = { ...scope, routeType: 'decision center', eventId: 'NG_AccountWithdrawal' } as const;
const useEvents = create<{ records: Record[]; add: (values: Fields) => void }>((set) => ({
  records: [
    { ...decision, id: 68, sourceProduct: 'transfer_to_mmo', eventSubId: 'consumer' },
    { ...decision, id: 65, eventSubId: 'consumer' },
    { ...decision, id: 63, transType: '41', sourceProduct: 'merchant_disbursement', businessTag: 'payment-oneloop', eventSubId: 'CrossBorder' },
    { ...decision, id: 61, transType: '40', eventSubId: 'Fund' },
    { ...decision, id: 58, sourceProduct: 'data_distribution', eventSubId: 'Agent' },
    { ...decision, id: 57, sourceProduct: 'agent_transfer', eventSubId: 'Agent' },
    { ...scope, id: 56, service: 'CUSTOMER_VALIDATION', routeType: 'decision center', eventId: 'NG_NameVerification' },
    { ...scope, id: 55, sourceProduct: 'demo_engine', routeType: 'engine rule' },
  ],
  add: (values) => set(({ records }) => ({
    records: [{ ...values, id: Math.max(0, ...records.map(({ id }) => id)) + 1 }, ...records],
  })),
}));

const routeTypes = ['engine rule', 'decision center'].map((value) => ({ value, label: value }));
const textFields = [
  ['service', 'Service'],
  ['transType', 'transType'],
  ['sourceProduct', 'Source Product'],
  ['businessTag', 'Business Tag'],
] as const;

function useReferenceOptions(country?: string) {
  const countries = useBasicInfoReferenceStore((state) => state.countries);
  const businessTypes = useBusinessTypeStore((state) => state.records);
  return {
    countries: countries.map(({ code }) => ({ value: code, label: code })),
    tenants: country ? getTenantOptionsByCountry(country) : [],
    businessTypes: businessTypes.map(({ businessType }) => ({ value: businessType, label: businessType })),
  };
}

function Heading({ detail = false }: { detail?: boolean }) {
  return <div className="availability-monitoring-heading">
    <Breadcrumb items={[{ title: 'Operation Config' }, { title: 'Route Event' }, ...(detail ? [{ title: 'Route Event Detail' }] : [])]} />
    <h1>{detail ? 'Route Event Detail' : 'Route Strategy'}</h1>
  </div>;
}

export default function RouteEventPage() {
  const navigate = useNavigate();
  const records = useEvents((state) => state.records);
  const [form] = Form.useForm<Filters>();
  const country = Form.useWatch('country', form);
  const options = useReferenceOptions(country);
  const [query, setQuery] = useState<Filters>({ country: scope.country, tenant: scope.tenant });
  const rows = records.filter((row) => (Object.keys(query) as (keyof Filters)[]).every((key) => {
    const value = query[key]?.trim();
    return !value || String(row[key] ?? '') === value;
  }));

  return <div className="operation-config-page">
    <Heading />
    <div className="availability-monitoring-content">
      <Form form={form} initialValues={{ country: scope.country, tenant: scope.tenant }} onFinish={setQuery}
        className="availability-monitoring-filter-card">
        <div className="route-event-filter-grid">
          <Form.Item name="country" label="Country"><Select allowClear options={options.countries} onChange={() => form.setFieldValue('tenant', undefined)} /></Form.Item>
          <Form.Item name="tenant" label="Tenant"><Select allowClear options={options.tenants} /></Form.Item>
          <Form.Item name="id" label="Route Strategy ID"><Input /></Form.Item>
          <Form.Item name="eventId" label="Event ID"><Input /></Form.Item>
          <Form.Item name="businessType" label="Business Type"><Select allowClear showSearch options={options.businessTypes} /></Form.Item>
          {textFields.map(([key, label]) => <Form.Item key={key} name={key} label={key === 'businessTag' ? 'Tag' : label}><Input /></Form.Item>)}
          <Form.Item name="routeType" label="Route Type"><Select allowClear options={routeTypes} /></Form.Item>
        </div>
        <Space className="route-event-filter-actions">
          <Button onClick={() => { form.resetFields(); setQuery({ country: scope.country, tenant: scope.tenant }); }}>Reset</Button>
          <Button type="primary" htmlType="submit">Query</Button>
        </Space>
      </Form>
      <section className="availability-monitoring-table-card">
        <Button type="primary" onClick={() => navigate(base + '/create')}>Create</Button>
        <Table<Record> className="route-event-table" rowKey="id" dataSource={rows} scroll={{ x: 1150 }}
          pagination={{ showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `Total ${total} items` }}
          columns={[
            { title: 'Route Strategy ID', dataIndex: 'id' },
            { title: 'Business Type', dataIndex: 'businessType' },
            ...textFields.map(([key, label]) => ({ title: key === 'businessTag' ? 'Tag' : label, dataIndex: key })),
            { title: 'Route Type', dataIndex: 'routeType' },
            { title: 'Event ID', dataIndex: 'eventId' },
            { title: 'Event Sub ID', dataIndex: 'eventSubId' },
            { title: 'Operation', render: (_, row) => <Button type="link" onClick={() => navigate(`${base}/${row.id}`)}>Details</Button> },
          ]} />
      </section>
    </div>
  </div>;
}

export function RouteEventDetailPage() {
  const { recordId } = useParams();
  const record = useEvents((state) => state.records.find(({ id }) => String(id) === recordId));
  const navigate = useNavigate();
  if (recordId && !record) return <Result status="404" title="Route Event not found"
    extra={<Button onClick={() => navigate(base)}>Back</Button>} />;
  return <RouteEventForm key={recordId ?? 'create'} record={record} />;
}

function RouteEventForm({ record }: { record?: Record }) {
  const navigate = useNavigate();
  const add = useEvents((state) => state.add);
  const [form] = Form.useForm<Fields>();
  const country = Form.useWatch('country', form);
  const routeType = Form.useWatch('routeType', form) ?? record?.routeType;
  const options = useReferenceOptions(country ?? record?.country ?? scope.country);
  const required = [{ required: true }];
  const requiredText = [{ required: true, whitespace: true }];

  const save = (values: Fields) => {
    if (record) return;
    const { eventId, eventSubId, ...fields } = values;
    add({
      ...fields,
      service: fields.service.trim(),
      transType: fields.transType?.trim() || undefined,
      sourceProduct: fields.sourceProduct?.trim() || undefined,
      businessTag: fields.businessTag?.trim() || undefined,
      ...(fields.routeType === 'decision center' && { eventId: eventId?.trim(), eventSubId: eventSubId?.trim() || undefined }),
    });
    navigate(base);
  };

  return <div className="operation-config-page">
    <Heading detail />
    <div className="availability-monitoring-content">
      <section className="availability-monitoring-filter-card">
        <h2 className="route-event-form-title">Basic Information</h2>
        <Form form={form} initialValues={record ?? { country: scope.country, tenant: scope.tenant }}
          disabled={Boolean(record)} onFinish={save} className="route-event-form"
          labelCol={{ xs: { span: 24 }, sm: { span: 7 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 17 } }}>
          <Form.Item name="country" label="Country" rules={required}><Select options={options.countries} onChange={() => form.setFieldValue('tenant', undefined)} /></Form.Item>
          <Form.Item name="tenant" label="Tenant" rules={required}><Select options={options.tenants} /></Form.Item>
          <Form.Item name="businessType" label="Business Type" rules={required}><Select showSearch options={options.businessTypes} /></Form.Item>
          {textFields.map(([key, label]) => <Form.Item key={key} name={key} label={label} rules={key === 'service' ? requiredText : undefined}><Input /></Form.Item>)}
          <Form.Item name="routeType" label="Route Type" rules={required}><Select options={routeTypes} onChange={(value) => {
            if (value === 'engine rule') form.setFieldsValue({ eventId: undefined, eventSubId: undefined });
          }} /></Form.Item>
          {routeType === 'decision center' && <>
            <Form.Item name="eventId" label="Event ID" preserve={false} rules={requiredText}><Input /></Form.Item>
            <Form.Item name="eventSubId" label="Event Sub ID" preserve={false}><Input /></Form.Item>
          </>}
          {!record && <Space><Button type="primary" htmlType="submit">Confirm</Button><Button onClick={() => navigate(base)}>Cancel</Button></Space>}
        </Form>
        {record && <Button onClick={() => navigate(base)}>Back</Button>}
      </section>
    </div>
  </div>;
}
