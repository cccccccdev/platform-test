import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, InputNumber, Modal, Space, message } from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnnouncementStore } from './announcementStore';
import MarkdownEditor, { MarkdownContent } from './MarkdownEditor';
import { canEdit } from './types';
import { TITLE_MAX_LENGTH } from './types';
import type { AnnouncementKind } from './types';

type EditorValues = { title: string; durationDays?: number; content?: string };

export default function AnnouncementEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const recordId = params.id;

  const kind: AnnouncementKind = params.kind === 'iteration' ? 'iteration' : 'system';
  const isNew = recordId === 'new';
  const isSystem = kind === 'system';

  const systemAnnouncements = useAnnouncementStore((state) => state.systemAnnouncements);
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);
  const createSystem = useAnnouncementStore((state) => state.createSystem);
  const createIteration = useAnnouncementStore((state) => state.createIteration);
  const updateSystem = useAnnouncementStore((state) => state.updateSystem);
  const updateIteration = useAnnouncementStore((state) => state.updateIteration);

  const [form] = Form.useForm<EditorValues>();
  const [dirty, setDirty] = useState(false);

  const existing = useMemo(() => {
    if (isNew) return undefined;
    return (isSystem ? systemAnnouncements : iterationAnnouncements).find((item) => item.id === recordId);
  }, [isNew, recordId, isSystem, systemAnnouncements, iterationAnnouncements]);

  // 任何状态的公告都允许编辑
  useEffect(() => {
    if (existing && !canEdit(existing.kind, existing.status)) {
      message.warning('This announcement cannot be edited');
      navigate('/announcement/manage', { replace: true });
    }
  }, [existing, navigate]);

  // 切换公告时回填表单，只跑一次避免覆盖用户输入
  const [loadedKey, setLoadedKey] = useState('');
  useEffect(() => {
    if (!existing) return;
    const key = `${kind}:${existing.id}`;
    if (loadedKey === key) return;
    setLoadedKey(key);
    if (isSystem && existing.kind === 'system') {
      form.setFieldsValue({ title: existing.title, durationDays: existing.durationDays });
    } else if (existing.kind === 'iteration') {
      form.setFieldsValue({ title: existing.title, content: existing.content });
    }
  }, [existing, kind, isSystem, form, loadedKey]);

  const managePath = `/announcement/manage${isSystem ? '' : '?kind=iteration'}`;

  const handleBack = () => {
    if (!dirty) {
      navigate(managePath);
      return;
    }
    Modal.confirm({
      title: 'Leave without saving?',
      content: 'Unsaved changes will be lost.',
      okText: 'Leave',
      cancelText: 'Stay',
      onOk: () => navigate(managePath),
    });
  };

  const handleSave = async () => {
    let values: EditorValues;
    try {
      values = await form.validateFields();
    } catch {
      message.error('Complete the required fields');
      return;
    }
    if (existing) {
      if (existing.kind === 'system') {
        updateSystem(existing.id, { title: values.title.trim(), durationDays: values.durationDays ?? 7 });
      } else {
        updateIteration(existing.id, { title: values.title.trim(), content: values.content ?? '' });
      }
      message.success('Announcement updated');
    } else if (isSystem) {
      createSystem({ title: values.title.trim(), durationDays: values.durationDays ?? 7 });
      message.success('System announcement created');
    } else {
      createIteration({ title: values.title.trim(), content: values.content ?? '' });
      message.success('Iteration announcement created');
    }
    setDirty(false);
    navigate(managePath);
  };

  const handleSaveAndPublish = async () => {
    let values: EditorValues;
    try {
      values = await form.validateFields();
    } catch {
      message.error('Complete the required fields');
      return;
    }
    const title = values.title.trim();
    const publishWarning = isSystem
      ? 'Once published, a system announcement can still be edited later, and it can be taken offline when needed.'
      : 'Once published, the iteration receives a version number (v + date + time) automatically. It can still be edited afterwards and has no offline action.';
    Modal.confirm({
      className: 'publish-confirm-modal',
      title: 'Publish this announcement?',
      content: (
        <div className="publish-confirm-body">
          <p className="publish-confirm-warning">{publishWarning}</p>
          <div className="publish-confirm-preview">
            <strong>{title}</strong>
            {!isSystem && values.content && <MarkdownContent source={values.content} className="publish-confirm-markdown" />}
          </div>
        </div>
      ),
      okText: 'Confirm and publish',
      cancelText: 'Keep editing',
      onOk: () => {
        if (existing) {
          if (existing.kind === 'system') {
            updateSystem(existing.id, { title, durationDays: values.durationDays ?? 7 });
          } else {
            updateIteration(existing.id, { title, content: values.content ?? '' });
          }
        } else if (isSystem) {
          createSystem({ title, durationDays: values.durationDays ?? 7 });
        } else {
          createIteration({ title, content: values.content ?? '' });
        }
        const publish = useAnnouncementStore.getState().publish;
        if (existing) publish(existing.kind, existing.id);
        message.success('Announcement published');
        navigate(managePath);
      },
    });
  };

  return (
    <div className="announcement-page">
      <section className="state-machine-heading">
        <Breadcrumb
          items={[
            { title: 'Announcement' },
            { title: 'Publish Management', href: managePath },
            { title: isNew ? 'Add announcement' : 'Edit announcement' },
          ]}
        />
        <div className="state-machine-title-line">
          {isSystem ? 'System announcement' : 'Iteration announcement'} — {isNew ? 'Add' : 'Edit'}
        </div>
      </section>

      <div className="announcement-content">
        <div className="announcement-table-panel">
          <div className="announcement-create">
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
              <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSaveAndPublish}>Save and publish</Button>
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
                rules={[{ required: true, whitespace: true, message: 'Enter a title' }, { max: TITLE_MAX_LENGTH, message: `Keep the title within ${TITLE_MAX_LENGTH} characters` }]}
              >
                <Input placeholder="Short, actionable headline" showCount maxLength={TITLE_MAX_LENGTH} />
              </Form.Item>

              {isSystem && (
                <Form.Item
                  name="durationDays"
                  label="Display days"
                  tooltip="How long the announcement stays in the header bar. Once expired it is taken offline automatically."
                  rules={[{ required: true, message: 'Set the display duration' }]}
                >
                  <InputNumber min={1} max={365} addonAfter="days" style={{ width: '100%' }} />
                </Form.Item>
              )}
            </div>

            {!isSystem && (
              <Form.Item label="Version">
                <div className="announcement-version-hint">
                  Generated automatically at publish time as <code>v</code> + publish date + time, for example <code>v202610131541</code>. It cannot be edited.
                </div>
              </Form.Item>
            )}

            {!isSystem && (
              <Form.Item
                name="content"
                label="Content"
                rules={[{ required: true, whitespace: true, message: 'Enter the announcement content' }]}
              >
                <MarkdownEditor
                  rows={18}
                  placeholder={'## What changed\n\nDescribe the release highlights...\n\n### Breaking changes\n\n- Item one'}
                />
              </Form.Item>
            )}
          </Form>
        </div>
      </div>
    </div>
  );
}
