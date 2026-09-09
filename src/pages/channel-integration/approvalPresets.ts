export type ApproverPreset = {
  id: string;
  name: string;
  technicalApprover: string;
  productApprover: string;
  operationsApprover: string;
};

export const approverPresets: ApproverPreset[] = [
  {
    id: 'approver-set-a',
    name: 'Financial Network Approvers',
    technicalApprover: 'Zhang Wei',
    productApprover: 'Fatima Khan',
    operationsApprover: 'Rahul Mehta',
  },
  {
    id: 'approver-set-b',
    name: 'Acquiring Business Approvers',
    technicalApprover: 'Chen Rui',
    productApprover: 'Nadia Rahman',
    operationsApprover: 'Amina Bello',
  },
];

export const getApproverPreset = (id?: string) => approverPresets.find((preset) => preset.id === id);
