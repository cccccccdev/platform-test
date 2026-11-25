import { useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Form, Input, Modal, Select, Space, Table, Tabs, Typography, message } from 'antd';
import { useCardBinStore, CARD_TYPE_SELECT_OPTIONS, COUNTRY_TABS, type CardBinRecord, type CardType } from './cardBinStore';

const { Title } = Typography;

interface CardBinFormValues {
  cardBin: string;
  cardType: CardType;
  bankName: string;
  bankCode: string;
  cardSchemeName: string;
  cardSchemeCode: string;
}

function operationTimeNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/** 批量新增：每行一条，逗号分隔 cardBin,cardType,bankCode,cardSchemeCode；name 由系统按 code 自动反显 */
const BATCH_FORMAT_HINT = 'cardBin,cardType,bankCode,cardSchemeCode';
const BATCH_EXAMPLE = ['507882,Debit,100833,VERVE', '408124,Credit,050001,VISA'].join('\n');

interface BatchParseResult {
  imported: CardBinRecord[];
  failures: string[];
}

function parseBatchInput(raw: string, country: string, existingBins: Set<string>, bankCodeNameMap: Map<string, string>, schemeCodeNameMap: Map<string, string>): BatchParseResult {
  const imported: CardBinRecord[] = [];
  const failures: string[] = [];
  const seen = new Set(existingBins);
  const rows = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  rows.forEach((line, index) => {
    const rowNo = index + 1;
    const cells = line.split(',').map((cell) => cell.trim());
    if (cells.length !== 4) {
      failures.push(`Row ${rowNo}: expected 4 columns (${BATCH_FORMAT_HINT})`);
      return;
    }
    const [cardBin, cardType, bankCode, cardSchemeCode] = cells;
    if (!/^\d{6,8}$/.test(cardBin)) {
      failures.push(`Row ${rowNo}: Card Bin must be 6-8 digits`);
      return;
    }
    if (seen.has(cardBin)) {
      failures.push(`Row ${rowNo}: Card Bin ${cardBin} already exists`);
      return;
    }
    const matchedType = CARD_TYPE_SELECT_OPTIONS.find((option) => option.value.toLowerCase() === cardType.toLowerCase());
    if (!matchedType) {
      failures.push(`Row ${rowNo}: unknown Card Type "${cardType}"`);
      return;
    }
    if (!bankCode || !cardSchemeCode) {
      failures.push(`Row ${rowNo}: bank code and card scheme code are required`);
      return;
    }
    // Name 反显：按 code 从既有 Card Bin 数据解析，解析不到则该行跳过
    const bankName = bankCodeNameMap.get(bankCode);
    if (!bankName) {
      failures.push(`Row ${rowNo}: unknown Bank Code "${bankCode}"`);
      return;
    }
    const cardSchemeName = schemeCodeNameMap.get(cardSchemeCode);
    if (!cardSchemeName) {
      failures.push(`Row ${rowNo}: unknown Card Scheme Code "${cardSchemeCode}"`);
      return;
    }
    seen.add(cardBin);
    imported.push({
      key: `${country}-${cardBin}`,
      country,
      cardBin,
      cardType: matchedType.value,
      bankName,
      bankCode,
      cardSchemeName,
      cardSchemeCode,
      operator: 'Current User',
      operationTime: operationTimeNow(),
    });
  });
  return { imported, failures };
}

export default function CardBinPage() {
  const records = useCardBinStore((state) => state.records);
  const addRecords = useCardBinStore((state) => state.addRecords);
  const [activeCountry, setActiveCountry] = useState<string>('NG');
  const [bankNameFilter, setBankNameFilter] = useState('');
  const [cardSchemeFilter, setCardSchemeFilter] = useState('');
  const [cardBinFilter, setCardBinFilter] = useState('');
  const [query, setQuery] = useState({ bankName: '', cardSchemeName: '', cardBin: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRaw, setBatchRaw] = useState('');
  const [batchIssues, setBatchIssues] = useState<string[]>([]);
  const [form] = Form.useForm<CardBinFormValues>();

  const countryRecords = useMemo(() => records.filter((record) => record.country === activeCountry), [activeCountry, records]);
  const filteredRecords = useMemo(() => countryRecords.filter((record) =>
    record.bankName.toLowerCase().includes(query.bankName.trim().toLowerCase())
    && record.cardSchemeName.toLowerCase().includes(query.cardSchemeName.trim().toLowerCase())
    && record.cardBin.includes(query.cardBin.trim())), [countryRecords, query]);
  const existingBins = useMemo(() => new Set(countryRecords.map((record) => record.cardBin)), [countryRecords]);
  /** Bank Code → Bank Name 字典，取自全部既有记录（跨国家），批量导入时按 code 反显 name */
  const bankCodeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((record) => map.set(record.bankCode, record.bankName));
    return map;
  }, [records]);
  const schemeCodeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((record) => map.set(record.cardSchemeCode, record.cardSchemeName));
    return map;
  }, [records]);

  const openCreate = () => {
    form.resetFields();
    setCreateOpen(true);
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      const cardBin = values.cardBin.trim();
      if (existingBins.has(cardBin)) {
        form.setFields([{ name: 'cardBin', errors: ['Card Bin already exists'] }]);
        return;
      }
      addRecords([{ key: `${activeCountry}-${cardBin}`, country: activeCountry, cardBin, cardType: values.cardType, bankName: values.bankName.trim(), bankCode: values.bankCode.trim(), cardSchemeName: values.cardSchemeName.trim(), cardSchemeCode: values.cardSchemeCode.trim(), operator: 'Current User', operationTime: operationTimeNow() }]);
      message.success('Card Bin created');
      setCreateOpen(false);
    } catch {
      // Ant Design displays field-level validation feedback.
    }
  };

  const openBatch = () => {
    setBatchRaw('');
    setBatchIssues([]);
    setBatchOpen(true);
  };

  const importBatch = () => {
    if (!batchRaw.trim()) {
      message.error('Paste rows to import');
      return;
    }
    const { imported, failures } = parseBatchInput(batchRaw, activeCountry, existingBins, bankCodeNameMap, schemeCodeNameMap);
    if (imported.length === 0) {
      setBatchIssues(failures.length > 0 ? failures : ['No valid rows were found']);
      message.error('No valid Card Bin rows were imported');
      return;
    }
    addRecords(imported);
    setBatchIssues(failures);
    message.success(`Imported ${imported.length} Card Bin record(s)${failures.length > 0 ? `, skipped ${failures.length} invalid row(s)` : ''}`);
    if (failures.length === 0) setBatchOpen(false);
  };

  const columns = [
    { title: 'Card Bin', dataIndex: 'cardBin', key: 'cardBin', width: 120 },
    { title: 'Card Type', dataIndex: 'cardType', key: 'cardType', width: 120 },
    { title: 'Bank Name', dataIndex: 'bankName', key: 'bankName', width: 220 },
    { title: 'Bank Code', dataIndex: 'bankCode', key: 'bankCode', width: 150 },
    { title: 'Card Scheme Name', dataIndex: 'cardSchemeName', key: 'cardSchemeName', width: 180 },
    { title: 'Card Scheme Code', dataIndex: 'cardSchemeCode', key: 'cardSchemeCode', width: 180 },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 150 },
    { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 185 },
  ];

  return (
    <div className="institution-type-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Card Bin' }]} />
        <div className="state-machine-title-line"><Title level={4}>Card Bin</Title></div>
      </section>

      <div className="institution-type-content">
        <Tabs
          activeKey={activeCountry}
          onChange={(country) => {
            setActiveCountry(country);
            setBankNameFilter(''); setCardSchemeFilter(''); setCardBinFilter('');
            setQuery({ bankName: '', cardSchemeName: '', cardBin: '' });
          }}
          items={COUNTRY_TABS.map((country) => ({ key: country, label: country }))}
        />

        <div className="institution-type-filter-panel">
          <div className="institution-type-filters">
            <label><span>Bank Name :</span><Input value={bankNameFilter} placeholder="Bank Name" onChange={(event) => setBankNameFilter(event.target.value)} /></label>
            <label><span>Card Scheme Name :</span><Input value={cardSchemeFilter} placeholder="Card Scheme Name" onChange={(event) => setCardSchemeFilter(event.target.value)} /></label>
            <label><span>Card Bin :</span><Input value={cardBinFilter} placeholder="Card Bin" onChange={(event) => setCardBinFilter(event.target.value)} /></label>
          </div>
          <Space className="institution-type-filter-actions">
            <Button onClick={() => { setBankNameFilter(''); setCardSchemeFilter(''); setCardBinFilter(''); setQuery({ bankName: '', cardSchemeName: '', cardBin: '' }); }}>Reset</Button>
            <Button type="primary" onClick={() => setQuery({ bankName: bankNameFilter, cardSchemeName: cardSchemeFilter, cardBin: cardBinFilter })}>Query</Button>
          </Space>
        </div>

        <div className="institution-type-table-panel">
          <div className="institution-type-create">
            <Space>
              <Button onClick={openBatch}>Batch Create</Button>
              <Button type="primary" onClick={openCreate}>Create Card Bin</Button>
            </Space>
          </div>
          <Table<CardBinRecord>
            className="institution-type-table"
            dataSource={filteredRecords}
            columns={columns}
            rowKey="key"
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
          />
        </div>
      </div>

      <Modal
        className="institution-type-modal"
        title="Create Card Bin"
        open={createOpen}
        width={700}
        okText="Save"
        cancelText="Cancel"
        onOk={save}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} preserve={false}>
          <Form.Item name="cardBin" label="Card Bin" rules={[{ required: true, whitespace: true, message: 'Enter Card Bin' }, { pattern: /^\d{6,8}$/, message: 'Card Bin must be 6-8 digits' }]}>
            <Input placeholder="Card Bin" maxLength={8} />
          </Form.Item>
          <Form.Item name="cardType" label="Card Type" rules={[{ required: true, message: 'Select Card Type' }]}>
            <Select allowClear placeholder="Card Type" options={CARD_TYPE_SELECT_OPTIONS} />
          </Form.Item>
          <Form.Item name="bankName" label="Bank Name" rules={[{ required: true, whitespace: true, message: 'Enter Bank Name' }]}>
            <Input placeholder="Bank Name" />
          </Form.Item>
          <Form.Item name="bankCode" label="Bank Code" rules={[{ required: true, whitespace: true, message: 'Enter Bank Code' }]}>
            <Input placeholder="Bank Code" />
          </Form.Item>
          <Form.Item name="cardSchemeName" label="Card Scheme Name" rules={[{ required: true, whitespace: true, message: 'Enter Card Scheme Name' }]}>
            <Input placeholder="Card Scheme Name" />
          </Form.Item>
          <Form.Item name="cardSchemeCode" label="Card Scheme Code" rules={[{ required: true, whitespace: true, message: 'Enter Card Scheme Code' }]}>
            <Input placeholder="Card Scheme Code" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="institution-type-modal"
        title="Batch Create Card Bin"
        open={batchOpen}
        width={820}
        okText="Import"
        cancelText="Cancel"
        onOk={importBatch}
        onCancel={() => setBatchOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`One record per line, comma separated (imported into the "${activeCountry}" tab)`}
          description={(
            <>
              <code>{BATCH_FORMAT_HINT}</code>
              <pre style={{ marginTop: 8, marginBottom: 8 }}>{BATCH_EXAMPLE}</pre>
              Bank Name and Card Scheme Name are resolved automatically from the codes based on existing records; unknown codes are skipped.
            </>
          )}
        />
        <Input.TextArea
          rows={8}
          value={batchRaw}
          placeholder={BATCH_EXAMPLE}
          onChange={(event) => setBatchRaw(event.target.value)}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
        {batchIssues.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
            message={`${batchIssues.length} row(s) were skipped`}
            description={<ul style={{ margin: 0, paddingLeft: 18 }}>{batchIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
          />
        )}
      </Modal>
    </div>
  );
}
