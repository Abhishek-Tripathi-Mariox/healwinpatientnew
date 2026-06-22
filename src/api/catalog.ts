import { api } from './client';

/**
 * Catalog + commerce domains — all real backend endpoints now. Doctors come
 * from Doctor-role admins; pharmacy products & lab tests from their catalogs;
 * orders, lab bookings and consultations persist (place → list → detail).
 * Centres and medical records hit real endpoints too.
 */

const arr = <T,>(d: any): T[] => (Array.isArray(d) ? d : d?.items ?? d?.products ?? d?.tests ?? d?.doctors ?? []);

export const doctorsApi = {
  specialities: () => api.get<any[]>('/patient/doctors/specialities', undefined, false).then(arr),
  list: (q?: string, speciality?: string) =>
    api.get<any[]>('/patient/doctors', { q, speciality }, false).then(arr),
  detail: (id: string) => api.get<any>(`/patient/doctors/${id}`, undefined, false),
  // Appointment slots for a date — [{ time, label, available }] (auth required).
  slots: (id: string, date: string) =>
    api.get<any[]>(`/patient/doctors/${id}/slots`, { date }).then(arr),
  book: (data: { doctorId: string; date?: string; slot?: string; familyMemberId?: string; symptoms?: string; teleconsult?: boolean }) =>
    api.post('/patient/consultations', data),
  // History + cancel + reschedule for booked consultations.
  consultations: () => api.get<any[]>('/patient/consultations').then(arr),
  cancelConsultation: (id: string) => api.post(`/patient/consultations/${id}/cancel`, {}),
  rescheduleConsultation: (id: string, date: string, slot: string) =>
    api.post(`/patient/consultations/${id}/reschedule`, { date, slot }),
};

export const pharmacyApi = {
  categories: () => api.get<any[]>('/patient/pharmacy/categories', undefined, false).then(arr),
  products: (q?: string, category?: string) =>
    api.get<any[]>('/patient/pharmacy/products', { q, category }, false).then(arr),
  createOrder: (data: { items: { productId: string; qty: number }[]; addressId?: string; prescriptionUrl?: string }) =>
    api.post('/patient/pharmacy/orders', data),
  orders: () => api.get<any[]>('/patient/pharmacy/orders').then(arr),
  cancelOrder: (id: string) => api.post(`/patient/pharmacy/orders/${id}/cancel`, {}),
  // Upload a prescription file → returns { url } to pass as prescriptionUrl.
  uploadPrescription: (form: FormData) => api.upload<{ url: string }>('/patient/pharmacy/prescription', form, 'POST'),
};

export const labApi = {
  tests: (q?: string, category?: string) =>
    api.get<any[]>('/patient/lab/tests', { q, category }, false).then(arr),
  slots: (date: string) => api.get<any[]>('/patient/lab/slots', { date }).then(arr),
  book: (data: { testIds: string[]; addressId?: string; date?: string; slot?: string; familyMemberId?: string }) =>
    api.post('/patient/lab/bookings', data),
  // History + cancel + reschedule for booked lab tests.
  bookings: () => api.get<any[]>('/patient/lab/bookings').then(arr),
  cancelBooking: (id: string) => api.post(`/patient/lab/bookings/${id}/cancel`, {}),
  rescheduleBooking: (id: string, date: string, slot: string) =>
    api.post(`/patient/lab/bookings/${id}/reschedule`, { date, slot }),
};

export const centresApi = {
  serviceTypes: () => api.get<any[]>('/centres/service-types', undefined, false).then(arr),
  list: (params: { serviceType?: string; department?: string; state?: string; district?: string; search?: string; lat?: number; lng?: number } = {}) =>
    api.get<any[]>('/centres', params, false).then(arr),
  detail: (id: string) => api.get<any>(`/centres/${id}`, undefined, false),
};

export const recordsApi = {
  list: (familyMemberId?: string) =>
    api.get<any[]>('/patient/medical-records', { familyMemberId }).then(arr),
  /** Upload a medical record/document (multipart: file + title/type/notes). */
  upload: (form: FormData) => api.upload('/patient/medical-records', form),
  remove: (id: string) => api.del(`/patient/medical-records/${id}`),
};
