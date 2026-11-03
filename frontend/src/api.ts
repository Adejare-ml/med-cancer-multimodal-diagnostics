import type { ClinicalData, HealthResponse, PredictResponse } from './types';

export const API_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function describe(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : 'field';
        return `${String(field).replace(/_/g, ' ')}: ${d?.msg ?? 'invalid'}`;
      })
      .join('; ');
  }
  return 'The request was rejected.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(`Could not reach the model service at ${API_URL}.`, 0);
  }
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = (await res.json()).detail;
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(detail ? describe(detail) : `The model service answered ${res.status}.`, res.status);
  }
  return (await res.json()) as T;
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/health', { cache: 'no-store', signal });
}

export function predict(image: File, clinical: ClinicalData | null): Promise<PredictResponse> {
  const body = new FormData();
  body.append('image', image);
  if (clinical) body.append('clinical_data', JSON.stringify(clinical));
  return request<PredictResponse>('/predict', { method: 'POST', body });
}
