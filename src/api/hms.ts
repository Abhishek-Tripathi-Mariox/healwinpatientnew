import {api} from './client';

/**
 * Hospital (HMS) patient-portal endpoints. The app User is linked to its
 * hospital record(s) by phone number on the backend, so these return the
 * patient's real OPD appointments, prescriptions, lab reports, bills and
 * admissions — and let them book an OPD appointment with a hospital doctor.
 */

export interface HmsSummary {
  linked: boolean;
  appointments?: number;
  prescriptions?: number;
  labOrders?: number;
  invoices?: number;
  admissions?: number;
}

export interface HmsAppointment {
  _id: string;
  doctorName: string;
  speciality?: string;
  scheduledAt: string;
  tokenNumber: number;
  status: string;
  reason?: string;
}

export interface HmsPrescription {
  _id: string;
  doctorName: string;
  doctorSpeciality?: string;
  visitDate: string;
  encounterType: string;
  /** Why the patient came. */
  chiefComplaint?: string;
  /** The doctor's plain-language advice — "what was told". */
  summary?: string;
  diagnoses: string[];
  severity?: string;
  treatmentPlan?: string;
  followUpAt?: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
    spo2?: number;
    respiratoryRate?: number;
    height?: number;
    weight?: number;
  };
  prescriptions: {
    drug: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    timing?: string;
    notes?: string;
  }[];
  /** Tests ordered in this visit, with results once reported. */
  tests?: {
    name: string;
    category: string;
    status: string;
    resultValue?: string;
  }[];
}

export interface HmsLabOrder {
  _id: string;
  category: 'lab' | 'imaging';
  name: string;
  status: 'ordered' | 'collected' | 'reported';
  resultValue?: string;
  resultNotes?: string;
  reports: {url: string; label: string}[];
  orderedAt: string;
  reportedAt?: string | null;
}

export interface HmsInvoice {
  _id: string;
  invoiceNo?: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  createdAt: string;
  subtotal?: number;
  taxAmount?: number;
  discount?: number;
  items: {
    description: string;
    section: string;
    quantity: number;
    unitPrice?: number;
    amount: number;
  }[];
  /** Receipt history — what was paid, how, and when. */
  payments?: {
    amount: number;
    method: string;
    paidAt: string;
    reference?: string | null;
  }[];
  refunds?: {amount: number; method: string; paidAt: string}[];
  // Cross-links this bill to My Insurance — a claim already raised against
  // it (incl. auto-drafted ones), or whether the patient has an active
  // policy at all even if no claim exists yet on THIS bill.
  claim?: {
    claimNumber: string;
    status: string;
    claimedAmount: number;
    approvedAmount: number;
  } | null;
  hasActivePolicy?: boolean;
}

/** Lifetime billing totals across every bill, plus where the money went. */
export interface HmsBillingSummary {
  totalBilled: number;
  totalPaid: number;
  balanceDue: number;
  invoiceCount: number;
  unpaidCount: number;
  bySection: {section: string; amount: number; count: number}[];
}

export interface HmsAdmission {
  _id: string;
  ward: string;
  bedNumber: string;
  reason?: string;
  status: 'admitted' | 'discharged';
  admittedAt: string;
  dischargedAt?: string | null;
  dischargeSummary?: string;
}

export interface HmsSlotsResponse {
  hasSchedule: boolean;
  slots: {time: string; iso: string}[];
}

export interface HmsDocument {
  type: string;
  label?: string;
  url: string;
  uploadedAt: string;
}

// `patientUserId` optionally views a family member's records instead of the
// logged-in user's own — the backend only honours it for confirmed family
// members (see patient.routes.ts#myHospitalPatientIds), so this is safe to
// pass through without a separate permission check on the client.
export const hmsApi = {
  summary: (patientUserId?: string) =>
    api.get<HmsSummary>('/patient/hms/summary', {patientUserId}),
  doctorSlots: (doctorId: string, date: string) =>
    api.get<HmsSlotsResponse>(`/patient/hms/doctors/${doctorId}/slots`, {date}),
  appointments: (patientUserId?: string) =>
    api.get<HmsAppointment[]>('/patient/hms/appointments', {patientUserId}),
  prescriptions: (patientUserId?: string) =>
    api.get<HmsPrescription[]>('/patient/hms/prescriptions', {patientUserId}),
  labOrders: (patientUserId?: string) =>
    api.get<HmsLabOrder[]>('/patient/hms/lab-orders', {patientUserId}),
  invoices: (patientUserId?: string) =>
    api.get<HmsInvoice[]>('/patient/hms/invoices', {patientUserId}),
  billingSummary: (patientUserId?: string) =>
    api.get<HmsBillingSummary>('/patient/hms/billing-summary', {patientUserId}),
  admissions: (patientUserId?: string) =>
    api.get<HmsAdmission[]>('/patient/hms/admissions', {patientUserId}),
  documents: (patientUserId?: string) =>
    api.get<HmsDocument[]>('/patient/hms/documents', {patientUserId}),
  bookAppointment: (data: {
    doctorId: string;
    scheduledAt: string;
    reason?: string;
  }) => api.post('/patient/hms/appointments', data),
};
