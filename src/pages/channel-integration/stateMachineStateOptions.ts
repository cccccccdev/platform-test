export type MainState = 'INIT' | 'PENDING' | 'TO_BE_VERIFY' | 'SUCCESS' | 'FAIL';

export type SubStateOption = {
  value: string;
  mainState: MainState;
};

const optionsByStateMachine: Record<string, SubStateOption[]> = {
  Wallet_Debit_StateMachine: [
    { value: 'PAYMENT_PENDING_WAIT_CALLBACK', mainState: 'PENDING' },
    { value: 'PAYMENT_PENDING_WAIT_REQUERY', mainState: 'PENDING' },
    { value: 'PAYMENT_SUCCESS', mainState: 'SUCCESS' },
    { value: 'PAYMENT_FAILED_BY_CHANNEL', mainState: 'FAIL' },
  ],
  Fund_Notification_StateMachine: [
    { value: 'PAYMENT_PENDING_WAIT_CALLBACK', mainState: 'PENDING' },
    { value: 'PAYMENT_SUCCESS', mainState: 'SUCCESS' },
    { value: 'PAYMENT_FAILED_BY_CHANNEL', mainState: 'FAIL' },
    { value: 'BILL_QUERY_SUCCESS', mainState: 'SUCCESS' },
    { value: 'BILL_QUERY_FAILED', mainState: 'FAIL' },
  ],
  Default_Refund_StateMachine: [
    { value: 'INIT', mainState: 'INIT' },
    { value: 'PROGRESSING', mainState: 'PENDING' },
    { value: 'SUCCESS', mainState: 'SUCCESS' },
    { value: 'FAILED', mainState: 'FAIL' },
  ],
  BankCard_Debit_StateMachine: [
    { value: 'INIT', mainState: 'INIT' },
    { value: 'WAITING_OTP', mainState: 'TO_BE_VERIFY' },
    { value: 'VERIFYING_OTP', mainState: 'PENDING' },
    { value: 'AUTHENTICATING', mainState: 'PENDING' },
    { value: 'PROGRESSING', mainState: 'PENDING' },
    { value: 'SUCCESS', mainState: 'SUCCESS' },
    { value: 'FAILED', mainState: 'FAIL' },
  ],
  SMS_Single_Message_StateMachine: [
    { value: 'INIT', mainState: 'INIT' },
    { value: 'SUBMITTED', mainState: 'PENDING' },
    { value: 'DELIVERED', mainState: 'SUCCESS' },
    { value: 'FAILED', mainState: 'FAIL' },
  ],
};

export const stateOptionsFor = (stateMachine?: string) => optionsByStateMachine[stateMachine ?? ''] ?? [];

export const fallbackStateOptionsFor = (stateMachine?: string) =>
  stateOptionsFor(stateMachine).filter((item) => item.mainState === 'PENDING' || item.mainState === 'FAIL');

export const mainStateFor = (stateMachine: string | undefined, subState: string | undefined) =>
  stateOptionsFor(stateMachine).find((item) => item.value === subState)?.mainState;
