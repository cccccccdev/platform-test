import { useState } from 'react';
import { AlignLeftOutlined, FullscreenExitOutlined, FullscreenOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space, Tooltip, Typography } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;
export const groovyScriptTemplate = 'def execute(param) {\n\n  return null;\n}\n\nexecute(param);';

interface Props {
  name: string;
  label?: string;
  helpText?: string;
  /** 预置模板，默认 Groovy 模板。 */
  template?: string;
  /** 底部提示文案。 */
  languageNote?: string;
}

export default function GroovyScriptEditor({ name, label = 'Custom Script', helpText, template = groovyScriptTemplate, languageNote = 'Please write in Groovy' }: Props) {
  const form = Form.useFormInstance();
  const value = Form.useWatch(name, form) ?? '';
  const [fullscreen, setFullscreen] = useState(false);
  const formatScript = () => form.setFieldValue(name, String(value || template)
    .split('\n').map((line) => line.replace(/\s+$/g, '')).join('\n').trim());

  return (
    <div style={fullscreen ? { position: 'fixed', inset: 20, zIndex: 1300, background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 12px 48px rgba(0,0,0,.28)' } : undefined}>
      <Form.Item
        label={<Space size={5}><span>{label}</span>{helpText && <Tooltip placement="right" title={<pre style={{ margin: 0, maxWidth: 520, whiteSpace: 'pre-wrap', fontSize: 11 }}>{helpText}</pre>}><QuestionCircleOutlined style={{ color: '#8c8c8c' }} /></Tooltip>}</Space>}
        required
        style={{ marginBottom: 4 }}
      >
        <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#1f1f1f' }}>
          <div style={{ position: 'absolute', top: 8, right: 10, zIndex: 2 }}>
            <Space size={2}>
              <Tooltip title="Format script"><Button type="text" size="small" icon={<AlignLeftOutlined />} onClick={formatScript} style={{ color: '#d9d9d9' }} /></Tooltip>
              <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}><Button type="text" size="small" icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setFullscreen(!fullscreen)} style={{ color: '#d9d9d9' }} /></Tooltip>
            </Space>
          </div>
          <Form.Item name={name} initialValue={template} rules={[{ required: true, message: 'Enter script' }]} noStyle>
            <TextArea placeholder={template} style={{ height: fullscreen ? 'calc(100vh - 150px)' : 360, paddingTop: 42, resize: 'none', border: 0, borderRadius: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', background: '#1f1f1f', color: '#f5f5f5' }} />
          </Form.Item>
        </div>
      </Form.Item>
      <Text type="secondary">{languageNote}</Text>
    </div>
  );
}
