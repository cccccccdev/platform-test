import { Breadcrumb } from 'antd';

export default function OperationConfigPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="operation-config-page">
      <div className="operation-config-page-heading">
        <Breadcrumb items={[{ title: 'Operation Config' }, { title }]} />
        <h1>{title}</h1>
      </div>
      <div className="operation-config-placeholder">
        <span>待复现</span>
      </div>
    </div>
  );
}
