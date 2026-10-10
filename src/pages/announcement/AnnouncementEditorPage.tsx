import { useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Breadcrumb, Button, Form, Input, InputNumber, Modal, Space, message } from 'antd';
import { ArrowLeftOutlined, ExclamationCircleFilled, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CURRENT_USER, useAnnouncementStore } from './announcementStore';
import MarkdownEditor, { MarkdownContent } from './MarkdownEditor';
import type { AnnouncementKind } from './types';

type EditorValues = { title: string; content: string; durationDays?: number; version?: string };

export default function AnnouncementEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  const kind = params.kind === 'iteration' ? 'iteration' : 'system';
  const isSystem = kind === 'system';
  // Cancel returns to Publish Management and keeps the tab matching this announcement kind.
  const managePath = `/announcement/manage?kind=${kind}`;

  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);
  const drafts = useAnnouncementStore((state) => state.drafts);
  const publishSystem = useAnnouncementStore((state) => state.publishSystem);
  const publishIteration = useAnnouncementStore((state) => state.publishIteration);
  const saveDraft = useAnnouncementStore((state) => state.saveDraft);

  const [form] = Form.useForm<EditorValues>();
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(draftId ?? undefined);
  const [dirty, setDirty] = useState(false);
  const initialisedRef = useRef<string>('');

  const versions = useMemo(
    () => Array.from(new Set(iterationAnnouncements.map((item) => item.version))),
    [iterationAnnouncements],
  );

  useEffect(() => {
    if (!draftId) return;
    const draft = drafts.find((item) => item.id === draftId);
    if (!draft) return;
    // Guards against re-running on later store changes, which would overwrite what the author just typed.
    if (initialisedRef.current === `draft:${draftId}`) return;
    initialisedRef.current = `draft:${draftId}`;
    form.setFieldsValue({ title: draft.title, content: draft.content, durationDays: draft.durationDays });
    setDirty(false);
  }, [draftId, drafts, form]);

  const goBack = () => navigate(managePath);

  const handleBack = () => {
    if (!dirty) {
      goBack();
      return;
    }
    Modal.confirm({
      title: 'Leave without publishing?',
      content: 'Unsaved content will be lost.',
      okText: 'Leave',
      cancelText: 'Stay',
      onOk: goBack,
    });
  };

  const handleSaveDraft = async () => {
    const values = form.getFieldsValue();
    if (!values.title?.trim() && !values.content?.trim()) {
      message.warning('Add a title or content before saving a draft');
      return;
    }
    const draft = saveDraft({
      id: activeDraftId,
      kind: kind as AnnouncementKind,
      title: values.title ?? '',
      content: values.content ?? '',
      durationDays: values.durationDays ?? 7,
    });
    setActiveDraftId(draft.id);
    setDirty(false);
    message.success('Draft saved');
  };

  const doPublish = (values: EditorValues) => {
    if (isSystem) {
      publishSystem({ title: values.title.trim(), content: values.content, durationDays: values.durationDays ?? 7, publisher: CURRENT_USER });
      message.success('System announcement published');
    } else {
      publishIteration({ title: values.title.trim(), content: values.content, version: values.version ?? 'Unversioned', publisher: CURRENT_USER });
      message.success('Iteration announcement published');
    }
    if (activeDraftId) {
      useAnnouncementStore.getState().deleteDraft(activeDraftId);
    }
    navigate('/announcement/manage');
  };

  const handlePublish = async () => {
    let values: EditorValues;
    try {
      values = await form.validateFields();
    } catch {
      message.error('Complete the required fields before publishing');
      return;
    }
    Modal.confirm({
      className: 'publish-confirm-modal',
      width: 720,
      icon: <ExclamationCircleFilled />,
      title: isSystem ? 'Publish this system announcement?' : 'Publish this iteration announcement?',
      content: (
        <div className="publish-confirm-body">
          <p className="publish-confirm-warning">
            Once published, an announcement becomes read-only and <strong>can no longer be edited</strong>. Please confirm the content is correct.
          </p>
          <div className="publish-confirm-preview">
            <strong>{values.title}</strong>
            <MarkdownContent source={values.content} className="publish-confirm-markdown" />
          </div>
        </div>
      ),
      okText: 'Confirm and publish',
      cancelText: 'Keep editing',
      onOk: () => doPublish(values),
    });
  };

  return (
    <div className="announcement-page">
      <section className="state-machine-heading">
        <Breadcrumb
          items={[
            { title: 'Announcement' },
            { title: 'Publish Management', href: '/announcement/manage' },
            { title: isSystem ? 'Publish system announcement' : 'Publish iteration announcement' },
          ]}
        />
        <div className="state-machine-title-line">
          {isSystem ? 'Publish system announcement' : 'Publish iteration announcement'}
        </div>
      </section>

      <div className="announcement-content">
        <div className="announcement-table-panel">
        <div className="announcement-create">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>Cancel</Button>
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>Save draft</Button>
            <Button type="primary" onClick={handlePublish}>Publish</Button>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ durationDays: 7 }}
          onValuesChange={() => setDirty(true)}
          requiredMark="optional"
        >
          <div className="announcement-form-grid">
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, whitespace: true, message: 'Enter a title' }, { max: 120, message: 'Keep the title within 120 characters' }]}
            >
              <Input placeholder="Short, actionable headline" showCount maxLength={120} />
            </Form.Item>

            {isSystem ? (
              <Form.Item
                name="durationDays"
                label="Display duration (days)"
                tooltip="How long the announcement stays in the header bar before it stops scrolling. The record itself remains in the list as history."
                rules={[{ required: true, message: 'Set the display duration' }]}
              >
                <InputNumber min={1} max={365} addonAfter="days" style={{ width: '100%' }} />
              </Form.Item>
            ) : (
              <Form.Item
                name="version"
                label="Release version"
                rules={[{ required: true, whitespace: true, message: 'Enter the release version' }]}
              >
                <AutoComplete
                  options={versions.map((version) => ({ label: version, value: version }))}
                  placeholder={versions[0] ? `${versions[0]} (type a new version to add)` : 'e.g. 2.2.0'}
                  filterOption={(input, option) => String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            )}
          </div>

          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, whitespace: true, message: 'Enter the announcement content' }]}
          >
            <MarkdownEditor
              rows={18}
              placeholder={isSystem
                ? '## Scope\n\nDescribe what changed and who is affected...\n\n### Action required\n\n- Item one\n- Item two'
                : '## What changed\n\nDescribe the release highlights...\n\n### Breaking changes\n\n- Item one'}
            />
          </Form.Item>
        </Form>

        <div className="announcement-editor-footer-note">
          Content supports Markdown: headings, bold, italic, strikethrough, ordered and bullet lists, code blocks, quotes, links and tables. The right pane previews the rendered result exactly as readers will see it.
        </div>
        </div>
      </div>
    </div>
  );
}
