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
  documents: PolicyDocument[];
  claims: InsuranceClaimRow[];
}

export type PolicyDocumentKind = 'policy' | 'card' | 'other';

export interface PolicyDocument {
  _id: string;
  kind: PolicyDocumentKind;
  name: string;
  url: string;
  mimeType: string;
}

export interface AddInsuranceInput {
  payerId: string;
  policyNumber: string;
  holderName?: string;
  sumInsured?: number;
  validFrom?: string;
  validTo?: string;
}

/** A photo or scan picked from the device, ready for multipart upload. */
export interface PickedDocument {
  uri: string;
  name: string;
  type: string;
}

export const insuranceApi = {
  // `patientUserId` optionally views a family member's policies instead of
  // the logged-in user's own — see hms.ts for the same pattern.
  list: (patientUserId?: string) => api.get<InsurancePolicy[]>('/patient/insurance', { patientUserId }),
  payers: () => api.get<InsurancePayerOption[]>('/patient/insurance/payers'),
  /**
   * The POLICY DOCUMENT is required — it carries the number, sum insured and
   * validity that billing verifies against. The CARD is optional: useful at
   * the desk, but it does not prove the cover.
   */
  add: (
    input: AddInsuranceInput,
    policyDocuments: PickedDocument[],
    cards: PickedDocument[] = [],
  ) => {
    const form = new FormData();
    form.append('payerId', input.payerId);
    form.append('policyNumber', input.policyNumber);
    if (input.holderName) form.append('holderName', input.holderName);
    if (input.sumInsured != null) form.append('sumInsured', String(input.sumInsured));
    if (input.validFrom) form.append('validFrom', input.validFrom);
    if (input.validTo) form.append('validTo', input.validTo);
    policyDocuments.forEach((d) => form.append('policyDocument', d as any));
    cards.forEach((d) => form.append('card', d as any));
    return api.upload<{ _id: string; documents: number; message?: string }>(
      '/patient/insurance',
      form,
    );
  },
};
