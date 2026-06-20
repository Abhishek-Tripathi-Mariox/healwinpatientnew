import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AmbulanceTypesScreen } from '../screens/AmbulanceTypesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NearbyAmbulancesScreen } from '../screens/NearbyAmbulancesScreen';
import { MyCreditsScreen } from '../screens/MyCreditsScreen';
import { ServiceSelectScreen } from '../screens/ServiceSelectScreen';
import { CentresListScreen } from '../screens/CentresListScreen';
import { PlanAmbulanceScreen } from '../screens/PlanAmbulanceScreen';
import { PlanAmbulanceMapScreen } from '../screens/PlanAmbulanceMapScreen';
import { SelectAmbulanceScreen } from '../screens/SelectAmbulanceScreen';
import { ExecutiveCallScreen } from '../screens/ExecutiveCallScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { MembershipScreen } from '../screens/MembershipScreen';
import { UploadDocumentScreen } from '../screens/UploadDocumentScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { EditProfileFormScreen } from '../screens/EditProfileFormScreen';
import { AddFamilyMemberScreen } from '../screens/AddFamilyMemberScreen';
import { AddContactScreen } from '../screens/AddContactScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AddressListScreen } from '../screens/AddressListScreen';
import { AddressEditScreen } from '../screens/AddressEditScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { LabTestsScreen } from '../screens/LabTestsScreen';
import { MedicalRecordsScreen } from '../screens/MedicalRecordsScreen';
import { MyOrdersScreen } from '../screens/MyOrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { DoctorListScreen } from '../screens/DoctorListScreen';
import { DoctorDetailScreen } from '../screens/DoctorDetailScreen';
import { PharmacyHomeScreen } from '../screens/PharmacyHomeScreen';
import { PharmacyCartScreen } from '../screens/PharmacyCartScreen';
import { SosScreen } from '../screens/SosScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
  >
    <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="AmbulanceTypes" component={AmbulanceTypesScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="NearbyAmbulances" component={NearbyAmbulancesScreen} />
    <Stack.Screen name="MyCredits" component={MyCreditsScreen} />
    <Stack.Screen name="ServiceSelect" component={ServiceSelectScreen} />
    <Stack.Screen name="CentresList" component={CentresListScreen} />
    <Stack.Screen name="PlanAmbulance" component={PlanAmbulanceScreen} />
    <Stack.Screen name="PlanAmbulanceMap" component={PlanAmbulanceMapScreen} />
    <Stack.Screen name="SelectAmbulance" component={SelectAmbulanceScreen} />
    <Stack.Screen name="ExecutiveCall" component={ExecutiveCallScreen} />
    <Stack.Screen name="Tracking" component={TrackingScreen} />
    <Stack.Screen name="Membership" component={MembershipScreen} />
    <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
    <Stack.Screen name="Documents" component={DocumentsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="EditProfileForm" component={EditProfileFormScreen} />
    <Stack.Screen name="AddFamilyMember" component={AddFamilyMemberScreen} />
    <Stack.Screen name="AddContact" component={AddContactScreen} />

    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Otp" component={OtpScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />

    <Stack.Screen name="AddressList" component={AddressListScreen} />
    <Stack.Screen name="AddressEdit" component={AddressEditScreen} />

    <Stack.Screen name="Bookings" component={BookingsScreen} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />

    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Support" component={SupportScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="LabTests" component={LabTestsScreen} />
    <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
    <Stack.Screen name="DoctorList" component={DoctorListScreen} />
    <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
    <Stack.Screen name="PharmacyHome" component={PharmacyHomeScreen} />
    <Stack.Screen name="PharmacyCart" component={PharmacyCartScreen} />
    <Stack.Screen name="Sos" component={SosScreen} />
  </Stack.Navigator>
);
