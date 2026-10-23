import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Input, Popconfirm, Select, Space, Switch, Table, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useBasicInfoReferenceStore } from '../basic-info/basicInfoReferenceStore';
import { useBusinessTypeStore } from '../basic-info/businessTypeReferenceData';
import { getTenantOptionsByCountry } from '../basic-info/partyTenantReferenceData';
import {
  type AvailabilityMonitoringRecord,
  type AvailabilityMonitoringStatus,
  useAvailabilityMonitoringStore,
} from './availabilityMonitoringDemo';

interface AvailabilityMonitoringFilters {
  country?: string;
  tenant?: string;
  businessType?: string;
  service: string;
  serviceChannel: string;
  status?: AvailabilityMonitoringStatus;
}

const initialFilters: AvailabilityMonitoringFilters = {
  country: 'NG',
  tenant: 'PALMPAY',
  businessType: 'VIBER',
  service: '',
  serviceChannel: '',
  status: undefined,
};

const emptyQuery: AvailabilityMonitoringFilters = {
  country: undefined,
  tenant: undefined,
  businessType: undefined,
  service: '',
  serviceChannel: '',
  status: undefined,
};

const normalize = (value: string) => value.trim().toLowerCase();

export default function AvailabilityMonitoringPage() {
  const navigate = useNavigate();
  const countries = useBasicInfoReferenceStore((state) => state.countries);
  const businessTypes = useBusinessTypeStore((state) => state.records);
  const records = useAvailabilityMonitoringStore((state) => state.records);
  const deleteRecord = useAvailabilityMonitoringStore((state) => state.deleteRecord);
  const setStatus = useAvailabilityMonitoringStore((state) => state.setStatus);
  const [filters, setFilters] = useState<AvailabilityMonitoringFilters>(initialFilters);
  const [query, setQuery] = useState<AvailabilityMonitoringFilters>(emptyQuery);

  const countryOptions = useMemo(() => countries
    .map(({ code }) => ({ value: code, label: code })), [countries]);
  const businessTypeOptions = useMemo(() => businessTypes
    .map(({ businessType }) => ({ value: businessType, label: businessType })), [businessTypes]);
  const tenantOptions = filters.country ? getTenantOptionsByCountry(filters.country) : [];

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (query.country && record.country !== query.country) return false;
    if (query.tenant && record.tenant !== query.tenant) return false;
    if (query.businessType && record.businessType !== query.businessType) return false;
    if (query.status && record.status !== query.status) return false;
    if (query.service && !normalize(record.service).includes(normalize(query.service))) return false;
    if (query.serviceChannel && !normalize(record.serviceChannel).includes(normalize(query.serviceChannel))) return false;
    return true;
  }), [query, records]);

  const patchFilters = (patch: Partial<AvailabilityMonitoringFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const reset = () => {
    setFilters(emptyQuery);
    setQuery(emptyQuery);
  };

  return (
    <div className="operation-config-page availability-monitoring-page">
      <div className="availability-monitoring-heading">
        <Breadcrumb items={[
          { title: 'Operation Config' },
          { title: 'Availability monitoring' },
        ]} />
        <h1>Availability monitoring</h1>
      </div>

      <div className="availability-monitoring-content">
        <section className="availability-monitoring-filter-card">
          <div className="availability-monitoring-filter-grid">
            <label>
              <span>Country :</span>
              <Select
                allowClear
                showSearch
                value={filters.country}
                options={countryOptions}
                placeholder="Country"
                onChange={(country) => patchFilters({ country, tenant: undefined })}
              />
            </label>
            <label>
              <span>Tenant :</span>
              <Select
                allowClear
                showSearch
                value={filters.tenant}
                options={tenantOptions}
                disabled={!filters.country}
                placeholder={filters.country ? 'Tenant' : 'Select Country first'}
                onChange={(tenant) => patchFilters({ tenant })}
              />
            </label>
            <label>
              <span>Service Channel :</span>
              <Input
                value={filters.serviceChannel}
                placeholder="Service Channel"
                onChange={(event) => patchFilters({ serviceChannel: event.target.value })}
              />
            </label>
            <label>
              <span>Business Type :</span>
              <Select
                allowClear
                showSearch
                value={filters.businessType}
                options={businessTypeOptions}
                placeholder="Business Type"
                onChange={(businessType) => patchFilters({ businessType })}
              />
            </label>
            <label>
              <span>Service :</span>
              <Input
                value={filters.service}
                placeholder="Service"
                onChange={(event) => patchFilters({ service: event.target.value })}
              />
            </label>
            <label>
              <span>Status :</span>
              <Select
                allowClear
                value={filters.status}
                options={[
                  { value: 'ON', label: 'ON' },
                  { value: 'OFF', label: 'OFF' },
                ]}
                placeholder="Status"
                onChange={(status) => patchFilters({ status })}
              />
            </label>
          </div>
          <Space className="availability-monitoring-filter-actions">
            <Button onClick={reset}>Reset</Button>
            <Button type="primary" onClick={() => setQuery({ ...filters })}>Query</Button>
          </Space>
        </section>

        <section className="availability-monitoring-table-card">
          <Button
            type="primary"
            className="availability-monitoring-create"
            onClick={() => navigate('/operation-config/availability-monitoring/create')}
          >
            Create
          </Button>
          <Table<AvailabilityMonitoringRecord>
            className="availability-monitoring-table"
            dataSource={filteredRecords}
            rowKey="id"
            scroll={{ x: 1770 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total) => `Total ${total} items`,
            }}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 100 },
              { title: 'Business Type', dataIndex: 'businessType', width: 180 },
              { title: 'Service', dataIndex: 'service', width: 180 },
              { title: 'Service Channel', dataIndex: 'serviceChannel', width: 360 },
              { title: 'Priority', dataIndex: 'priority', width: 100 },
              { title: 'Country', dataIndex: 'country', width: 100 },
              { title: 'Operator', dataIndex: 'operator', width: 170 },
              { title: 'Create time', dataIndex: 'createTime', width: 190 },
              { title: 'Update time', dataIndex: 'updateTime', width: 190 },
              {
                title: 'Status',
                dataIndex: 'status',
                width: 100,
                render: (status: AvailabilityMonitoringStatus, record) => (
                  <Switch
                    aria-label={`Status for availability monitoring record ${record.id}`}
                    checked={status === 'ON'}
                    onChange={(checked) => {
                      setStatus(record.id, checked ? 'ON' : 'OFF');
                      message.success(`Record ${record.id} is now ${checked ? 'ON' : 'OFF'}.`);
                    }}
                  />
                ),
              },
              {
                title: 'Operation',
                key: 'operation',
                width: 150,
                fixed: 'right',
                render: (_, record) => (
                  <Space size="middle">
                    <Button
                      type="link"
                      onClick={() => navigate(`/operation-config/availability-monitoring/${record.id}/modify`)}
                    >
                      Modify
                    </Button>
                    <Popconfirm
                      title="Delete this availability monitoring record?"
                      description="This operation only changes the current Demo data."
                      okText="Delete"
                      cancelText="Cancel"
                      onConfirm={() => {
                        deleteRecord(record.id);
                        message.success(`Record ${record.id} deleted.`);
                      }}
                    >
                      <Button type="link" danger>Delete</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
