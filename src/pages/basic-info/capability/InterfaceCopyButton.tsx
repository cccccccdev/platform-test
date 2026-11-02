import { Button, Dropdown, message } from 'antd';
import { CopyOutlined, DownOutlined } from '@ant-design/icons';
import { spiSchemaToMarkdown, validateEffectTags, validateSpiTree, type SpiFieldNode } from './spiSchemaModel';

interface Props {
  kind: 'API' | 'Config SPI' | 'Code SPI';
  businessType: string;
  serviceOrAbility: { label: 'Service' | 'Ability'; value: string };
  action: string;
  method: string;
  url: string;
  description: string;
  timeout?: string;
  subOrderMode?: string;
  request: SpiFieldNode[];
  response: SpiFieldNode[];
}

const escapeCell = (value: string) => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

export default function InterfaceCopyButton({ kind, businessType, serviceOrAbility, action, method, url, description, timeout, subOrderMode, request, response }: Props) {
  const copyMarkdown = async () => {
    const fieldError = validateSpiTree(request) || validateSpiTree(response)
      || (kind === 'API' ? validateEffectTags(request) || validateEffectTags(response) : null);
    if (fieldError) {
      message.warning(`Complete the fields before copying: ${fieldError}`);
      return;
    }

    const rows: [string, string][] = [
      ['Business Type', businessType],
      [serviceOrAbility.label, serviceOrAbility.value],
      ['Action', action],
      ...(subOrderMode !== undefined ? [['Sub-order Mode', subOrderMode] as [string, string]] : []),
      ['Method', method || 'Not configured'],
      ['URL', url || 'Not configured'],
      ...(timeout !== undefined ? [['Timeout (ms)', timeout || 'Not configured'] as [string, string]] : []),
      ['Description', description || '—'],
    ];
    const overview = ['| Item | Value |', '| --- | --- |', ...rows.map(([label, value]) => `| ${escapeCell(label)} | ${escapeCell(value)} |`)];
    const includeEffectTag = kind === 'API';
    const markdown = [`# ${kind}`, '', ...overview, '', '## Request Params', '', spiSchemaToMarkdown(request, includeEffectTag).trimEnd(), '', '## Response Params', '', spiSchemaToMarkdown(response, includeEffectTag).trimEnd(), ''].join('\n');
    try {
      await navigator.clipboard.writeText(markdown);
      message.success(`${kind} copied as Markdown.`);
    } catch {
      message.error('Could not copy to clipboard.');
    }
  };

  return <Dropdown menu={{ items: [
    { key: 'markdown', label: 'Markdown' },
    { key: 'json', label: 'JSON', disabled: true, title: 'Coming soon' },
  ], onClick: ({ key }) => { if (key === 'markdown') void copyMarkdown(); } }} trigger={['click']}>
    <Button icon={<CopyOutlined />} aria-label={`Copy all ${kind} information`}>Copy <DownOutlined className="capability-spi-copy-caret" /></Button>
  </Dropdown>;
}
