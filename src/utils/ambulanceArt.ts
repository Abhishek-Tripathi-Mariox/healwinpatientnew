import { svgs } from '../svgAssets';

/** Default copy when a type has no admin-set description. */
export const FALLBACK_DESCRIPTION =
  'A reliable, equipped ambulance for safe and stable medical transport.';

/**
 * Map an admin-managed ambulance type name to its scenic background + vehicle
 * cut-out artwork. Shared by the home "Know Your Life Support Vehicle" carousel
 * and the full Ambulance Types screen so both stay visually consistent.
 */
export const artFor = (name: string): { Background: any; Vehicle: any } => {
  const n = (name || '').toLowerCase();
  if (n.includes('advanced') || n.includes('als')) return { Background: svgs.bgAls, Vehicle: svgs.vehBls };
  if (n.includes('4') || n.includes('4x4') || n.includes('transport')) return { Background: svgs.bg4x4, Vehicle: svgs.veh4x4 };
  if (n.includes('rapid') || n.includes('rrv')) return { Background: svgs.bgRrv, Vehicle: svgs.vehRrv };
  if (n.includes('urbania') || n.includes('force')) return { Background: svgs.bgUrbania, Vehicle: svgs.vehUrbania };
  if (n.includes('hearse') || n.includes('mortuary')) return { Background: svgs.bgHearse, Vehicle: svgs.vehHearse };
  if (n.includes('basic') || n.includes('bls')) return { Background: svgs.bgBls, Vehicle: svgs.vehBls };
  return { Background: svgs.bgHearse, Vehicle: svgs.vehHearse };
};
