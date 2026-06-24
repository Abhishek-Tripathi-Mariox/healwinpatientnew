/**
 * SVG asset registry. Every imported asset is a React component
 * (react-native-svg-transformer turns each .svg into one).
 *
 * Photographic assets are downscaled rasters embedded inside an <svg><image/>>
 * wrapper so the whole project consumes a single SVG pipeline.
 */
import ForestBg from '../assets/svg/forest_bg.svg';
import Avatar from '../assets/svg/avatar.svg';
import AmbulanceCard from '../assets/svg/ambulance_card.svg';
import AmbulanceSearch from '../assets/svg/ambulance_search.svg';
import Hospital from '../assets/svg/homepagerename.svg';
import TripMap from '../assets/svg/trip_map.svg';
import Wallet from '../assets/svg/wallet.svg';
import Cash from '../assets/svg/cash.svg';
import CentreThumb from '../assets/svg/centre_thumb.svg';
import PlanMap from '../assets/svg/plan_map.svg';
import SelectMap from '../assets/svg/select_map.svg';
import TrackMap from '../assets/svg/track_map.svg';
import Logo from '../assets/svg/logo.svg';
import LogoMark from '../assets/svg/logo_mark.svg';

import BgBls from '../assets/svg/bg_bls.svg';
import BgAls from '../assets/svg/bg_als.svg';
import Bg4x4 from '../assets/svg/bg_4x4.svg';
import BgRrv from '../assets/svg/bg_rrv.svg';
import BgUrbania from '../assets/svg/bg_urbania.svg';
import BgHearse from '../assets/svg/bg_hearse.svg';

import VehBls from '../assets/svg/veh_bls.svg';
import Veh4x4 from '../assets/svg/veh_4x4.svg';
import VehRrv from '../assets/svg/veh_rrv.svg';
import VehUrbania from '../assets/svg/veh_urbania.svg';
import VehHearse from '../assets/svg/veh_hearse.svg';

export const svgs = {
  forestBg: ForestBg,
  avatar: Avatar,
  ambulanceCard: AmbulanceCard,
  ambulanceSearch: AmbulanceSearch,
  hospital: Hospital,
  tripMap: TripMap,
  wallet: Wallet,
  cash: Cash,
  centreThumb: CentreThumb,
  planMap: PlanMap,
  selectMap: SelectMap,
  trackMap: TrackMap,
  logo: Logo,
  logoMark: LogoMark,

  bgBls: BgBls,
  bgAls: BgAls,
  bg4x4: Bg4x4,
  bgRrv: BgRrv,
  bgUrbania: BgUrbania,
  bgHearse: BgHearse,

  vehBls: VehBls,
  veh4x4: Veh4x4,
  vehRrv: VehRrv,
  vehUrbania: VehUrbania,
  vehHearse: VehHearse,
} as const;
