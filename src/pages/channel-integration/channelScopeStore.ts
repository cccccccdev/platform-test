import { create } from 'zustand';
import { mockCredentials } from '../../mock/data';

export type AuthType = 'basic' | 'bearer' | 'custom' | 'oauth2';

export interface CredentialItem {
  id: string;
  key: string;
  description?: string;
}

export interface VariableItem {
  id: string;
  name: string;
  value: string;
}

export interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  version: string;
  credentials?: Record<string, string>;
  operator: string;
  operationTime: string;
}

export interface TcpDataElement {
  de: number;
  field: string;
  format: string;
  chars: string;
  length: string;
  coding: string;
}

export const npsbIso8583Dictionary: TcpDataElement[] = [
  { de: 2, field: 'Primary Account Number', format: 'HLVAR', chars: 'n', length: '16..19', coding: 'BCD' },
  { de: 3, field: 'Processing Code', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD' },
  { de: 4, field: 'Amount, Transaction', format: 'FIXED', chars: 'n', length: '12', coding: 'BCD' },
  { de: 5, field: 'Amount, Settlement', format: 'FIXED', chars: 'n', length: '12', coding: 'BCD' },
  { de: 6, field: 'Amount, Cardholder Billing', format: 'FIXED', chars: 'n', length: '12', coding: 'BCD' },
  { de: 7, field: 'Transmission Date & Time', format: 'FIXED', chars: 'n', length: '10', coding: 'BCD' },
  { de: 10, field: 'Conversion Rate, Cardholder Billing', format: 'FIXED', chars: 'n', length: '8', coding: 'BCD' },
  { de: 11, field: 'System Trace Audit Number', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD' },
  { de: 12, field: 'Local Transaction Time', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD' },
  { de: 13, field: 'Local Transaction Date', format: 'FIXED', chars: 'n', length: '4', coding: 'BCD' },
  { de: 14, field: 'Date, Expiration', format: 'FIXED', chars: 'n', length: '4', coding: 'BCD' },
  { de: 18, field: "Merchant's Type", format: 'FIXED', chars: 'n', length: '4', coding: 'BCD' },
  { de: 19, field: 'Acquiring Institution Country Code', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 20, field: 'Primary Account Number Country Code', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 22, field: 'Point of Service Entry Mode', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 23, field: 'Card Sequence Number', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 25, field: 'POS Condition Code', format: 'FIXED', chars: 'n', length: '2', coding: 'BCD' },
  { de: 26, field: 'POS PIN Captured Code', format: 'FIXED', chars: 'n', length: '2', coding: 'BCD' },
  { de: 28, field: 'Amount, Transaction Fee', format: 'FIXED', chars: 'an', length: '9', coding: 'ASCII' },
  { de: 32, field: 'Acquiring Institution ID, Code', format: 'HLVAR', chars: 'n', length: '6..11', coding: 'BCD' },
  { de: 33, field: 'Forwarding Institution Code', format: 'HLVAR', chars: 'n', length: '6..11', coding: 'BCD' },
  { de: 35, field: 'Track 2 Data', format: 'HLVAR', chars: 'z', length: '..37', coding: 'BCD' },
  { de: 37, field: 'Retrieval Reference Number', format: 'FIXED', chars: 'an', length: '12', coding: 'ASCII' },
  { de: 38, field: 'Authorization Code Response', format: 'FIXED', chars: 'an', length: '6', coding: 'ASCII' },
  { de: 39, field: 'Response Code', format: 'FIXED', chars: 'an', length: '2', coding: 'ASCII' },
  { de: 41, field: 'Card Acceptor Terminal Id.', format: 'FIXED', chars: 'ans', length: '8', coding: 'ASCII' },
  { de: 42, field: 'Card Acceptor Identification Code', format: 'FIXED', chars: 'ans', length: '15', coding: 'ASCII' },
  { de: 43, field: 'Card Acceptor Name/Location', format: 'FIXED', chars: 'ans', length: '40', coding: 'ASCII' },
  { de: 45, field: 'Track 1 Data', format: 'HLVAR', chars: 'ans', length: '..76', coding: 'ASCII' },
  { de: 46, field: 'Proprietary Field 46', format: 'HLLVAR', chars: 'ans', length: '0..999', coding: 'ASCII' },
  { de: 47, field: 'Proprietary Field 47', format: 'HLLVAR', chars: 'ans', length: '0..999', coding: 'ASCII' },
  { de: 48, field: 'Proprietary Field 48', format: 'HLLVAR', chars: 'ans', length: '0..999', coding: 'ASCII' },
  { de: 49, field: 'Transaction Currency Code', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 50, field: 'Settlement Currency Code', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 51, field: 'Cardholder Billing Currency Code', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 54, field: 'Additional Amounts', format: 'HLLVAR', chars: 'ans', length: '20..120', coding: 'ASCII' },
  { de: 55, field: 'ICC Sys Related Data', format: 'HLLVAR', chars: 'b', length: '..255', coding: 'BIN' },
  { de: 70, field: 'Network Management Information Code', format: 'FIXED', chars: 'n', length: '3', coding: 'BCD' },
  { de: 100, field: 'Receiving Institution Identification Code', format: 'HLVAR', chars: 'n', length: '..11', coding: 'BCD' },
  { de: 102, field: 'Account Identification-1', format: 'HLVAR', chars: 'ans', length: '0..99', coding: 'ASCII' },
  { de: 103, field: 'Account Identification-2', format: 'HLVAR', chars: 'ans', length: '0..99', coding: 'ASCII' },
  { de: 104, field: 'Transaction Description', format: 'HLVAR', chars: 'ans', length: '0..99', coding: 'ASCII' },
  { de: 112, field: 'Additional Info', format: 'HLLVAR', chars: 'an', length: '..999', coding: 'BIN' },
  { de: 125, field: 'Mini Statement Information', format: 'HLLVAR', chars: 'ans', length: '999', coding: 'ASCII' },
  { de: 128, field: 'Message Authentication Code', format: 'FIXED', chars: 'an', length: '64', coding: 'BIT' },
];

type IsoTemplateOverride = [number, string, string, string];
const iso8583Ver1987Overrides: IsoTemplateOverride[] = [
  [2,'n..19','Primary account number (PAN)','ASCII'],[3,'n 6','Processing Code','ASCII'],[4,'n 12','Amount Transaction','ASCII'],[5,'n 12','Amount, settlement','ASCII'],[6,'n 12','Amount, cardholder billing','ASCII'],[7,'n 10','Transmission date & time','ASCII'],[8,'n 8','Amount, cardholder billing fee','ASCII'],[9,'n 8','Conversion rate, settlement','ASCII'],[10,'n 8','Conversion rate, cardholder billing','ASCII'],[11,'n 6','System trace audit number (STAN)','ASCII'],[12,'n 6','Local transaction time (hhmmss)','ASCII'],[13,'n 4','Local transaction date (MMDD)','ASCII'],[14,'n 4','Expiration date (YYMM)','ASCII'],[15,'n 4','Settlement date','ASCII'],[16,'n 4','Currency conversion date','ASCII'],[17,'n 4','Capture date','ASCII'],[18,'n 4','Merchant type / merchant category code','ASCII'],[19,'n 3','Acquiring institution country code','ASCII'],[20,'n 3','PAN extended country code','ASCII'],[21,'n 3','Forwarding institution country code','ASCII'],[22,'n 3','Point of service entry mode','ASCII'],[23,'n 3','Application PAN sequence number','ASCII'],[24,'n 3','Network international identifier (NII)','ASCII'],[25,'n 2','Point of service condition code','ASCII'],[26,'n 2','Point of service capture code','ASCII'],[27,'n 1','Authorizing identification response length','ASCII'],[28,'x+n 8','Amount, transaction fee','ASCII'],[29,'x+n 8','Amount, settlement fee','ASCII'],[30,'x+n 8','Amount, transaction processing fee','ASCII'],[31,'x+n 8','Amount, settlement processing fee','ASCII'],[32,'n..11','Acquiring institution identification code','ASCII'],[33,'n..11','Forwarding institution identification code','ASCII'],[34,'ns..28','Primary account number, extended','ASCII'],[35,'z..37','Track 2 data','ASCII'],[36,'n...104','Track 3 data','ASCII'],[37,'an 12','Retrieval reference number','ASCII'],[38,'an 6','Authorization identification response','ASCII'],[39,'an 2','Response code','ASCII'],[40,'an 3','Service restriction code','ASCII'],[41,'ans 8','Card acceptor terminal identification','ASCII'],[42,'ans 15','Card acceptor identification code','ASCII'],[43,'ans 40','Card acceptor name/location','ASCII'],[44,'an..25','Additional response data','ASCII'],[45,'an..76','Track 1 data','ASCII'],[46,'an...999','Additional data (ISO)','ASCII'],[47,'an...999','Additional data (national)','ASCII'],[48,'an...999','Additional data (private)','ASCII'],[49,'a/n 3','Currency code, transaction','ASCII'],[50,'a/n 3','Currency code, settlement','ASCII'],[51,'a/n 3','Currency code, cardholder billing','ASCII'],[52,'b 64','Personal identification number data','BIN'],[53,'n 16','Security related control information','ASCII'],[54,'an...120','Additional amounts','ASCII'],[55,'ans...999','ICC data – EMV having multiple tags','ASCII'],[56,'ans...999','Reserved (ISO)','ASCII'],[57,'ans...999','Reserved (national)','ASCII'],[58,'ans...999','Reserved (national)','ASCII'],[59,'ans...999','Reserved (national)','ASCII'],[60,'ans...999','Reserved (national)','ASCII'],[61,'ans...999','Reserved (private)','ASCII'],[62,'ans...999','Reserved (private)','ASCII'],[63,'ans...999','Reserved (private)','ASCII'],[64,'b 64','Message authentication code (MAC)','BIN'],[65,'b 1','Extended bitmap indicator','BIN'],[66,'n 1','Settlement code','ASCII'],[67,'n 2','Extended payment code','ASCII'],[68,'n 3','Receiving institution country code','ASCII'],[69,'n 3','Settlement institution country code','ASCII'],[70,'n 3','Network management information code','ASCII'],[71,'n 4','Message number','ASCII'],[72,'n 4',"Last message's number",'ASCII'],[73,'n 6','Action date (YYMMDD)','ASCII'],[74,'n 10','Number of credits','ASCII'],[75,'n 10','Credits, reversal number','ASCII'],[76,'n 10','Number of debits','ASCII'],[77,'n 10','Debits, reversal number','ASCII'],[78,'n 10','Transfer number','ASCII'],[79,'n 10','Transfer, reversal number','ASCII'],[80,'n 10','Number of inquiries','ASCII'],[81,'n 10','Number of authorizations','ASCII'],[82,'n 12','Credits, processing fee amount','ASCII'],[83,'n 12','Credits, transaction fee amount','ASCII'],[84,'n 12','Debits, processing fee amount','ASCII'],[85,'n 12','Debits, transaction fee amount','ASCII'],[86,'n 16','Total amount of credits','ASCII'],[87,'n 16','Credits, reversal amount','ASCII'],[88,'n 16','Total amount of debits','ASCII'],[89,'n 16','Debits, reversal amount','ASCII'],[90,'n 42','Original data elements','ASCII'],[91,'an 1','File update code','ASCII'],[92,'an 2','File security code','ASCII'],[93,'an 5','Response indicator','ASCII'],[94,'an 7','Service indicator','ASCII'],[95,'an 42','Replacement amounts','ASCII'],[96,'b 64','Message security code','BIN'],[97,'x+n 16','Net settlement amount','ASCII'],[98,'ans 25','Payee','ASCII'],[99,'n..11','Settlement institution identification code','ASCII'],[100,'n..11','Receiving institution identification code','ASCII'],[101,'ans..17','File name','ASCII'],[102,'ans..28','Account identification 1','ASCII'],[103,'ans..28','Account identification 2','ASCII'],[104,'ans...100','Transaction description','ASCII'],[105,'ans...999','Reserved for ISO use','ASCII'],[106,'ans...999','Reserved for ISO use','ASCII'],[107,'ans...999','Reserved for ISO use','ASCII'],[108,'ans...999','Reserved for ISO use','ASCII'],[109,'ans...999','Reserved for ISO use','ASCII'],[110,'ans...999','Reserved for ISO use','ASCII'],[111,'ans...999','Reserved for ISO use','ASCII'],[112,'ans...999','Reserved for national use','ASCII'],[113,'ans...999','Reserved for national use','ASCII'],[114,'ans...999','Reserved for national use','ASCII'],[115,'ans...999','Reserved for national use','ASCII'],[116,'ans...999','Reserved for national use','ASCII'],[117,'ans...999','Reserved for national use','ASCII'],[118,'ans...999','Reserved for national use','ASCII'],[119,'ans...999','Reserved for national use','ASCII'],[120,'ans...999','Reserved for private use','ASCII'],[121,'ans...999','Reserved for private use','ASCII'],[122,'ans...999','Reserved for private use','ASCII'],[123,'ans...999','Reserved for private use','ASCII'],[124,'ans...999','Reserved for private use','ASCII'],[125,'ans...999','Reserved for private use','ASCII'],[126,'ans...999','Reserved for private use','ASCII'],[127,'ans...999','Reserved for private use','ASCII'],[128,'b 64','Message authentication code','BIN'],
];

export const iso8583Ver1987Template: TcpDataElement[] = iso8583Ver1987Overrides.map(([de, type, field, coding]) => {
  const variableDigits = (type.match(/\.{1,3}/)?.[0].length ?? 0);
  const chars = type.split(/[ .]/)[0];
  const length = type.slice(chars.length).trim().replace(/^\.{1,3}/, match => `${match}`);
  return { de, field, format: variableDigits === 3 ? 'HLLVAR' : variableDigits === 2 ? 'HLVAR' : variableDigits === 1 ? 'LVAR' : 'FIXED', chars, length, coding };
});

export interface TcpProfile {
  id: string;
  name: string;
  status: 'Draft' | 'Active' | 'Disabled';
  responseTimeout?: number;
  maxInFlight?: number;
  afterConnectBehavior: 'none' | 'sign-on';
  beforeCloseBehavior: 'none' | 'sign-off';
  framingType: 'length-prefix' | 'delimiter' | 'fixed-length' | 'message-derived' | 'custom';
  frameHeaderSize?: '2-bytes';
  frameByteOrder?: 'big-endian' | 'little-endian';
  frameLengthIncludesHeader?: boolean;
  messageProtocol?: 'ISO8583:1987' | 'raw-custom';
  mtiEncoding: 'ASCII' | 'BCD';
  bitmapEncoding: 'Binary' | 'ASCII Hex';
  correlationFields: number[];
  fieldDictionary: TcpDataElement[];
}

const seedCredentials = (): Record<string, CredentialItem[]> =>
  structuredClone(mockCredentials) as Record<string, CredentialItem[]>;

interface ChannelScopeStore {
  credentialsByChannel: Record<string, CredentialItem[]>;
  credentialVersionByChannel: Record<string, string>;
  globalVariablesByChannel: Record<string, VariableItem[]>;
  globalVariableVersionByChannel: Record<string, string>;
  orderVariablesByChannel: Record<string, VariableItem[]>;
  orderVariableVersionByChannel: Record<string, string>;
  authenticationsByChannel: Record<string, AuthConfig[]>;
  tcpProfilesByChannel: Record<string, TcpProfile[]>;
  addCredential: (channelCode: string, credential: CredentialItem) => void;
  updateCredential: (channelCode: string, id: string, updates: Partial<CredentialItem>) => void;
  deleteCredential: (channelCode: string, id: string) => { success: boolean; message?: string };
  addAuthentication: (channelCode: string, auth: AuthConfig) => void;
  updateAuthentication: (channelCode: string, id: string, updates: Partial<AuthConfig>) => void;
  removeAuthentication: (channelCode: string, id: string) => void;
  addGlobalVariable: (channelCode: string, variable: VariableItem) => void;
  updateGlobalVariableValue: (channelCode: string, variableId: string, value: string) => void;
  addOrderVariable: (channelCode: string, variable: VariableItem) => void;
  getCredentials: (channelCode: string) => CredentialItem[];
  getAuthentications: (channelCode: string) => AuthConfig[];
  addTcpProfile: (channelCode: string, profile: TcpProfile) => void;
  updateTcpProfile: (channelCode: string, id: string, updates: Partial<TcpProfile>) => void;
  getTcpProfiles: (channelCode: string) => TcpProfile[];
}

export const timestampVersion = () => {
  const date = new Date();
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
};

export const useChannelScopeStore = create<ChannelScopeStore>((set, get) => ({
  credentialsByChannel: seedCredentials(),
  credentialVersionByChannel: { EVEXIN: '20260703095237', GTB_NG: '20260628111000', ZENITH_NG: '20260628111000', PAYSTACK_NG: '20260628111000' },
  globalVariablesByChannel: {
    EVEXIN: [],
    GTB_NG: [
      { id: 'global_channel_code', name: 'channelCode', value: 'GTB_NG' },
      { id: 'global_country_code', name: 'countryCode', value: 'NG' },
      { id: 'global_default_currency', name: 'defaultCurrency', value: 'NGN' },
    ],
    ZENITH_NG: [{ id: 'global_zenith_currency', name: 'defaultCurrency', value: 'NGN' }],
    PAYSTACK_NG: [{ id: 'global_paystack_currency', name: 'defaultCurrency', value: 'NGN' }],
  },
  globalVariableVersionByChannel: { EVEXIN: '20260703095237', GTB_NG: '20260628110000', ZENITH_NG: '20260628110000', PAYSTACK_NG: '20260628110000' },
  orderVariablesByChannel: {
    EVEXIN: [],
    GTB_NG: [
      { id: 'order_request_reference', name: 'requestReference', value: '{{order.requestReference}}' },
      { id: 'order_customer_id', name: 'customerId', value: '{{order.customerId}}' },
      { id: 'order_original_amount', name: 'originalAmount', value: '{{order.originalAmount}}' },
    ],
    ZENITH_NG: [],
    PAYSTACK_NG: [],
  },
  orderVariableVersionByChannel: { EVEXIN: '20260703095237', GTB_NG: '20260628110500', ZENITH_NG: '20260628110500', PAYSTACK_NG: '20260628110500' },
  authenticationsByChannel: {
    GTB_NG: [
      {
        id: 'auth_seed_basic',
        name: 'GTB Basic Auth',
        type: 'basic',
        version: '20260701110000',
        credentials: { username: 'API_KEY', password: 'SECRET_KEY' },
        operator: 'admin',
        operationTime: '2026-07-01 11:00:00',
      },
    ],
  },
  tcpProfilesByChannel: {
    NPSB_BD: [
      {
        id: 'tcp_npsb_default',
        name: 'NPSB ISO8583',
        status: 'Active',
        responseTimeout: 25,
        maxInFlight: 50,
        afterConnectBehavior: 'sign-on',
        beforeCloseBehavior: 'sign-off',
        framingType: 'length-prefix',
        frameHeaderSize: '2-bytes',
        frameByteOrder: 'big-endian',
        frameLengthIncludesHeader: false,
        messageProtocol: 'ISO8583:1987',
        mtiEncoding: 'ASCII',
        bitmapEncoding: 'Binary',
        correlationFields: [32, 37, 41, 42],
        fieldDictionary: npsbIso8583Dictionary,
      },
    ],
  },

  addCredential: (channelCode, credential) => set((state) => ({
    credentialsByChannel: {
      ...state.credentialsByChannel,
      [channelCode]: [...(state.credentialsByChannel[channelCode] ?? []), credential],
    },
    credentialVersionByChannel: { ...state.credentialVersionByChannel, [channelCode]: timestampVersion() },
  })),

  updateCredential: (channelCode, id, updates) => set((state) => ({
    credentialsByChannel: {
      ...state.credentialsByChannel,
      [channelCode]: (state.credentialsByChannel[channelCode] ?? []).map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    },
    credentialVersionByChannel: { ...state.credentialVersionByChannel, [channelCode]: timestampVersion() },
  })),

  deleteCredential: (_channelCode, _id) => {
    return { success: true };
  },

  addAuthentication: (channelCode, auth) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: [...(state.authenticationsByChannel[channelCode] ?? []), auth],
    },
  })),

  updateAuthentication: (channelCode, id, updates) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: (state.authenticationsByChannel[channelCode] ?? []).map((a) =>
        a.id === id ? { ...a, ...updates, version: timestampVersion() } : a
      ),
    },
  })),

  removeAuthentication: (channelCode, id) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: (state.authenticationsByChannel[channelCode] ?? []).filter((a) => a.id !== id),
    },
  })),

  addGlobalVariable: (channelCode, variable) => set((state) => ({
    globalVariablesByChannel: {
      ...state.globalVariablesByChannel,
      [channelCode]: [...(state.globalVariablesByChannel[channelCode] ?? []), variable],
    },
    globalVariableVersionByChannel: { ...state.globalVariableVersionByChannel, [channelCode]: timestampVersion() },
  })),

  updateGlobalVariableValue: (channelCode, variableId, value) => set((state) => ({
    globalVariablesByChannel: {
      ...state.globalVariablesByChannel,
      [channelCode]: (state.globalVariablesByChannel[channelCode] ?? []).map((variable) =>
        variable.id === variableId ? { ...variable, value } : variable
      ),
    },
    globalVariableVersionByChannel: { ...state.globalVariableVersionByChannel, [channelCode]: timestampVersion() },
  })),

  addOrderVariable: (channelCode, variable) => set((state) => ({
    orderVariablesByChannel: {
      ...state.orderVariablesByChannel,
      [channelCode]: [...(state.orderVariablesByChannel[channelCode] ?? []), variable],
    },
    orderVariableVersionByChannel: { ...state.orderVariableVersionByChannel, [channelCode]: timestampVersion() },
  })),

  getCredentials: (channelCode) => get().credentialsByChannel[channelCode] ?? [],
  getAuthentications: (channelCode) => get().authenticationsByChannel[channelCode] ?? [],
  addTcpProfile: (channelCode, profile) => set((state) => ({
    tcpProfilesByChannel: {
      ...state.tcpProfilesByChannel,
      [channelCode]: [...(state.tcpProfilesByChannel[channelCode] ?? []), profile],
    },
  })),
  updateTcpProfile: (channelCode, id, updates) => set((state) => ({
    tcpProfilesByChannel: {
      ...state.tcpProfilesByChannel,
      [channelCode]: (state.tcpProfilesByChannel[channelCode] ?? []).map((profile) =>
        profile.id === id ? { ...profile, ...updates } : profile
      ),
    },
  })),
  getTcpProfiles: (channelCode) => get().tcpProfilesByChannel[channelCode] ?? [],
}));
