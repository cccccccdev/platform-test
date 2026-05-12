import { Modal } from 'antd';

interface StopDebugConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function StopDebugConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: StopDebugConfirmModalProps) {
  return (
    <Modal
      title="确认终止调试？"
      open={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="确认终止"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      <p>本次调试数据将被清除</p>
    </Modal>
  );
}
