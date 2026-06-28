import type { FamilyMember } from '../state/familyStore';
import type { SavedContact } from '../state/contactsStore';
import type { Address } from '../state/addressStore';

/** Route param list for the root native stack. */
export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  AmbulanceTypes: undefined;
  Profile: undefined;
  NearbyAmbulances: undefined;
  MyCredits: undefined;
  MyCoins: undefined;
  EmergencyContacts: undefined;
  ServiceSelect: undefined;
  CentresList: undefined;
  PlanAmbulance: undefined;
  PlanAmbulanceMap: { mode?: 'pickup' | 'drop'; next?: 'drop' | 'select' } | undefined;
  SelectAmbulance: undefined;
  ExecutiveCall: undefined;
  Tracking: undefined;
  Membership: undefined;
  UploadDocument: undefined;
  Documents: undefined;
  EditProfile: undefined;
  EditProfileForm: undefined;
  AddFamilyMember: { member?: FamilyMember } | undefined;
  AddContact: { contact?: SavedContact } | undefined;

  // Auth & onboarding
  Login: undefined;
  Otp: { mobileNumber: string; txnId: string; userRegister: boolean };
  Signup: undefined;
  Onboarding: undefined;

  // Addresses
  AddressList: undefined;
  AddressEdit: { address?: Address } | undefined;

  // Bookings
  Bookings: undefined;
  BookingDetail: { id: string };
  MyOrders: { tab?: 'consultations' | 'lab' | 'pharmacy' } | undefined;
  OrderDetail: { kind: 'consultations' | 'lab' | 'pharmacy'; order: any };

  // Misc
  Notifications: undefined;
  Support: undefined;
  Tickets: undefined;
  TicketDetail: { id: string };
  Settings: undefined;
  NotificationSettings: undefined;
  Payment: { amount: number; title?: string; purpose?: 'wallet' | 'generic' };
  LabTests: undefined;
  MedicalRecords: undefined;
  HospitalRecords: undefined;
  BookAppointment: undefined;
  DoctorList: undefined;
  DoctorDetail: { id: string };
  PharmacyHome: undefined;
  PharmacyCart: undefined;
  Sos: undefined;
};
