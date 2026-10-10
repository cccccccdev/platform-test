export const mappingOperationOptions = [
  {
    label: 'MONEY',
    value: 'money',
    children: [
      { label: 'Enforce Exact Decimal Scale', value: 'enforce-exact-decimal-scale' },
      { label: 'Ensure Minimum Decimal Scale', value: 'ensure-minimum-decimal-scale' },
      { label: 'Unit Convert (main to fractional)', value: 'main-to-fractional' },
      { label: 'Unit Convert (main to fractional long)', value: 'main-to-fractional-long' },
    ],
  },
  {
    label: 'FORMAT',
    value: 'format',
    children: [
      { label: 'String to date', value: 'string-to-date' },
      { label: 'All to String', value: 'all-to-string' },
      { label: 'String to Integer', value: 'string-to-integer' },
      { label: 'Field Concat', value: 'field-concat' },
      { label: 'Timestamp', value: 'timestamp' },
    ],
  },
  {
    label: 'PHONE NUMER',
    value: 'phone-number',
    children: [
      { label: 'Remove Front Zero', value: 'remove-front-zero' },
      { label: 'phone number operate', value: 'phone-number-operate' },
    ],
  },
  {
    label: 'CUSTOM',
    value: 'custom',
    children: [{ label: 'Custom', value: 'custom' }],
  },
  {
    label: 'CONVERT',
    value: 'convert',
    children: [
      { label: 'Verify Type Convert', value: 'verify-type-convert' },
      { label: 'Read file from URL', value: 'read-file-from-url' },
      { label: 'Chain Code Inner to Outer', value: 'chain-code-inner-to-outer' },
      { label: 'Chain Code Outer to Inner', value: 'chain-code-outer-to-inner' },
      { label: 'Institution inner to outer', value: 'institution-inner-to-outer' },
      { label: 'Institution outer to inner', value: 'institution-outer-to-inner' },
      { label: 'Convert to Uppercase', value: 'convert-to-uppercase' },
      { label: 'Convert to Lowercase', value: 'convert-to-lowercase' },
    ],
  },
];
