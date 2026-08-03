import { api } from './client';

/** Real integration with the hospital billing module's insurance module —
 * claims here are the same ones hospital billing staff raise/approve/settle. */

export interface InsurancePayerOption {
  _id: string;
  name: string;
  type: 'insurer' | 'tpa';
}

export interface InsuranceClaimRow {
  _id: string;
  claimNumber: string;
  amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'settled';
  createdAt: string;
  settledAt?: string | null;
}

export interface InsurancePolicy {
  _id: string;
  payerName: string;
  payerType: 'insurer' | 'tpa';
  policyNumber: string;
  holderName: string;
  sumInsured: number;
  used: number;
  pending: number;
  remaining: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  claims: InsuranceClaimRow[];
}

export interface AddInsuranceInput {
  payerId: string;
  policyNumber: string;
  holderName?: string;
  sumInsured?: number;
  validFrom?: string;
  validTo?: string;
}

export const insuranceApi = {
  // `patientUserId` optionally views a family member's policies instead of
  // the logged-in user's own — see hms.ts for the same pattern.
  list: (patientUserId?: string) => api.get<InsurancePolicy[]>('/patient/insurance', { patientUserId }),
  payers: () => api.get<InsurancePayerOption[]>('/patient/insurance/payers'),
  add: (input: AddInsuranceInput) => api.post<{ _id: string }>('/patient/insurance', input),
};
