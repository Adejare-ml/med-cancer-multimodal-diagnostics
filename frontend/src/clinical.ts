// Allowed values for the clinical fields. Must equal the enums in
// src/app/schemas.py; tests/frontend/schema-sync.test.ts checks this.

export interface Option {
  value: string;
  label: string;
}

export const SHAPES: Option[] = [
  { value: 'unknown', label: 'Not assessed' },
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'lobular', label: 'Lobular' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'architectural_distortion', label: 'Architectural distortion' },
];

export const MARGINS: Option[] = [
  { value: 'unknown', label: 'Not assessed' },
  { value: 'circumscribed', label: 'Circumscribed' },
  { value: 'microlobulated', label: 'Microlobulated' },
  { value: 'obscured', label: 'Obscured' },
  { value: 'indistinct', label: 'Indistinct' },
  { value: 'spiculated', label: 'Spiculated' },
];

export const DENSITY_GROUPS: { label: string; options: Option[] }[] = [
  {
    label: 'Ultrasound echo pattern',
    options: [
      { value: 'anechoic', label: 'Anechoic' },
      { value: 'hypoechoic', label: 'Hypoechoic' },
      { value: 'isoechoic', label: 'Isoechoic' },
      { value: 'hyperechoic', label: 'Hyperechoic' },
    ],
  },
  {
    label: 'Mammogram breast density',
    options: [
      { value: 'fatty', label: 'Almost entirely fatty' },
      { value: 'scattered', label: 'Scattered fibroglandular' },
      { value: 'heterogeneous', label: 'Heterogeneously dense' },
      { value: 'dense', label: 'Extremely dense' },
    ],
  },
];

export const BIRADS: Option[] = [
  { value: '0', label: '0 · Incomplete' },
  { value: '1', label: '1 · Negative' },
  { value: '2', label: '2 · Benign' },
  { value: '3', label: '3 · Probably benign' },
  { value: '4', label: '4 · Suspicious' },
  { value: '5', label: '5 · Highly suggestive of malignancy' },
  { value: '6', label: '6 · Biopsy-proven malignancy' },
];

export const allDensities = (): string[] => [
  'unknown',
  ...DENSITY_GROUPS.flatMap((g) => g.options.map((o) => o.value)),
];
