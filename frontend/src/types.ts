// Mirrors src/app/schemas.py. Keep the two in step.

export type ClassName = 'Benign' | 'Malignant' | 'Normal';
export type Basis = 'ultrasound' | 'mammogram' | 'clinical';
export type ImageType = 'ultrasound' | 'mammogram';

export const CLASS_ORDER: readonly ClassName[] = ['Benign', 'Malignant', 'Normal'];

export interface ExpertResult {
  name: Basis;
  prediction: ClassName;
  confidence: number;
  probabilities: Record<ClassName, number>;
  overconfident: boolean;
}

export interface FinalResult {
  prediction: ClassName;
  confidence: number;
  probabilities: Record<ClassName, number>;
  basis: Basis[];
}

export interface Modality {
  detected: ImageType;
  confidence: number;
  specialist: ImageType | null;
}

export interface PredictResponse {
  result: FinalResult | null;
  experts: ExpertResult[];
  modality: Modality | null;
  clinical_received: boolean;
  clinical_used: boolean;
  warnings: string[];
  version: string;
  model_revision: string;
}

export type ComponentState = 'ready' | 'disabled' | 'missing' | 'failed';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'starting';
  version: string;
  model_revision: string;
  components: Record<string, ComponentState>;
  detail?: string | null;
}

export interface ClinicalData {
  age: number;
  birads: number;
  shape: string;
  margin: string;
  density: string;
  calcifications: boolean;
  lesion_size_mm: number;
  family_history: boolean;
  prior_biopsy: boolean;
}
