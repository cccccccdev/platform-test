import { Table } from 'antd';
import { countryReferenceData, type CountryReference } from '../../mock/countries';

const columns = [
  { title: 'Country', dataIndex: 'code', key: 'code', width: 96 },
  { title: 'Calling Code', dataIndex: 'callingCode', key: 'callingCode', width: 118 },
  { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 96 },
  { title: 'Main Unit', dataIndex: 'mainUnit', key: 'mainUnit', width: 142 },
  { title: 'Fractional Unit', dataIndex: 'fractionalUnit', key: 'fractionalUnit', width: 142 },
  { title: 'Ratio', dataIndex: 'ratio', key: 'ratio', width: 78 },
  { title: 'Segment Length', dataIndex: 'segmentLength', key: 'segmentLength', width: 132 },
  { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 132 },
  { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 184 },
];

export default function CountryPage() {
  return (
    <div className="basic-country-page">
      <div className="basic-country-heading">
        <span>Basic Info</span>
        <h1>Country</h1>
      </div>
      <div className="basic-country-table-wrap">
        <Table<CountryReference>
          className="basic-country-table"
          dataSource={countryReferenceData}
          columns={columns}
          rowKey="code"
          scroll={{ x: 1120 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </div>
    </div>
  );
}
