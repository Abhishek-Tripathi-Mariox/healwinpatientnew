import { api } from './client';

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
  visitDate: string;
  encounterType: string;
  diagnoses: string[];
  prescriptions: { drug: string; dose?: string; frequency?: string; duration?: string }[];
}

export interface HmsLabOrder {
  _id: string;
  category: 'lab' | 'imaging';
  name: string;
  status: 'ordered' | 'collected' | 'reported';
  resultValue?: string;
  resultNotes?: string;
  reports: { url: string; label: string }[];
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
  items: { description: string; section: string; quantity: number; amount: number }[];
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
  slots: { time: string; iso: string }[];
}

export const hmsApi = {
  summary: () => api.get<HmsSummary>('/patient/hms/summary'),
  doctorSlots: (doctorId: string, date: string) =>
    api.get<HmsSlotsResponse>(`/patient/hms/doctors/${doctorId}/slots`, { date }),
  appointments: () => api.get<HmsAppointment[]>('/patient/hms/appointments'),
  prescriptions: () => api.get<HmsPrescription[]>('/patient/hms/prescriptions'),
  labOrders: () => api.get<HmsLabOrder[]>('/patient/hms/lab-orders'),
  invoices: () => api.get<HmsInvoice[]>('/patient/hms/invoices'),
  admissions: () => api.get<HmsAdmission[]>('/patient/hms/admissions'),
  bookAppointment: (data: { doctorId: string; scheduledAt: string; reason?: string }) =>
    api.post('/patient/hms/appointments', data),
};
