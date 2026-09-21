export const BAL_REQUERY_STATE_MACHINE = 'FUNDS_IN_BAL_Requery_StateMachine';
export const ADMISSION_EXTERNAL_STATE_MACHINE = 'FUNDS_IN_Admission_External_StateMachine';

export const inboundStateMachines = [
  {
    id: 'sm_funds_in_bal_requery',
    name: BAL_REQUERY_STATE_MACHINE,
    description: 'Inbound business access exception recovery: BAL_EXCEPTION maps to PENDING and resolves to SUCCESS or FAIL.',
    status: 'SUBMITTED' as const,
    operator: 'System preset',
    operationTime: '2026-09-20 00:00:00',
  },
  {
    id: 'sm_funds_in_admission_external',
    name: ADMISSION_EXTERNAL_STATE_MACHINE,
    description: 'External admission lifecycle where BAL_EXCEPTION can resolve only to ADMISSION_PASSED or FAIL.',
    status: 'SUBMITTED' as const,
    operator: 'System preset',
    operationTime: '2026-09-20 00:00:00',
  },
];

export const inboundStateMachineLinks = [
  { bt: 'FUNDS_IN', ability: 'BIZ_TYPE_NOTIFY', smName: BAL_REQUERY_STATE_MACHINE, operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
  { bt: 'FUNDS_IN', ability: 'STABLECOIN_NOTIFY', smName: BAL_REQUERY_STATE_MACHINE, operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
  { bt: 'FUNDS_IN', ability: 'ADMISSION_CHECK_INTERNAL', smName: BAL_REQUERY_STATE_MACHINE, operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
  { bt: 'FUNDS_IN', ability: 'ADMISSION_CHECK_EXTERNAL', smName: ADMISSION_EXTERNAL_STATE_MACHINE, operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
];
