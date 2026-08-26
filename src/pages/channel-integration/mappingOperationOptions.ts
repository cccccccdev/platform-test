export const mappingOperationOptions = [
  {
    label: 'MONEY',
    value: 'money',
    children: [
      { label: 'Adjust Decimal Scale', value: 'adjust-decimal-scale' },
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
    ],
  },
];
