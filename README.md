# HealWin Patient (New) — React Native

A fresh **bare React Native (CLI) + TypeScript** rebuild of the HealWin patient
app, implemented pixel-faithfully from the Figma designs (`node 5:595`, `5:3`,
`5:461`). **All imagery is SVG** (see "Images are SVG" below).

## Stack

- **Framework:** React Native 0.74.5 (bare CLI — no Expo)
- **Language:** TypeScript 5.4.5
- **Runtime:** React 18.2.0
- **Bundler:** Metro (`metro.config.js`)
- **Transpiler:** Babel (`@react-native/babel-preset`)
- Functional components + Hooks
- `StyleSheet` for all styling (no Tailwind)
- Flexbox layout, responsive scaling via `Dimensions`/`PixelRatio`
- `@react-navigation/native` + native-stack for screen flow
- Poppins `.ttf` bundled in `assets/fonts/` (linked via `react-native-asset`)
- **`react-native-svg` + `react-native-svg-transformer`** — all icons & images are SVG

## Screens & flow

- **Splash** — startup screen showing the HealWin logo (mark + wordmark), animates in
  then auto-enters Home. Initial route. The HealWin wordmark also appears atop **Home**,
  and the mark is the Android launcher icon (`android/app/src/main/res/mipmap-*`).
- **Home** (`node 5:595`) — greeting, "Where To?" search, promo carousel, bottom nav + SOS.
- **AmbulanceTypes** (`node 5:3`) — scrollable list of vehicle-type cards with a back button.
- **Profile** (`node 5:461`) — avatar, contact, and an action list (edit, bookings,
  family, settings, help, logout). *(The Figma frame was only a dimmed copy of Home,
  so this is a real, usable Profile screen built on the same components/theme.)*
- **NearbyAmbulances** (`node 5:1277`) — map + hospital card (Direction / Call) and a
  list of past-trip cards with Rebook.
- **MyCredits** (`node 5:758`) — wallet balance card, add-credits form (amount field +
  quick-amount chips + Add Money), and a payment-history list.
- **ServiceSelect** (`node 5:820`) — "What are you looking for?" Hospital / Pharmacy picker.
- **CentresList** (`node 5:844` + `5:914`) — healthcare-centre cards (rating, tag,
  Directions) with a bottom-sheet category filter (list icon → `FilterSheet` modal).
- **PlanAmbulance** (`node 5:123`) — Pickup-now/For-me toggle, pickup/drop route card,
  saved-address list, and a "Set location on map" button.
- **PlanAmbulanceMap** (`node 5:1230` + map tile `5:1204`) — map background with a
  location search card, address suggestions, and a forward FAB.
- **SelectAmbulance** (`node 5:1131` map **+** `5:1150` details, combined per the
  provided screenshot; route map tile `5:1231`) — map with pickup→drop route on top
  and an "Ambulance Details" panel with selectable ambulance option cards.
- **ExecutiveCall** (`node 5:1185`) — "Our Executive will call you shortly" confirmation
  with a green phone badge and estimated time.
- **Tracking** (`node 5:1003` + `5:1069`) — "Ambulance is on the way": map with route,
  arrival chip, pickup/driver/payment sheet, and an **expandable price breakup** + Pay Now.
- Plan **"For me"** opens a **Choose-contact** bottom sheet (`node 5:278`, `ContactSheet`);
  the **"For me"** selected state matches `node 5:200`.
- **Membership** (`node 5:1345/1370/1395/1616`) — swipeable plan cards (silver/gold benefits
  + active-plan info) with dots, a family-member list, and an add FAB.
- **UploadDocument** (`node 5:1420`) — title + description + Select File + selected-file row.
- **Documents** (`node 5:1455`) — search + All/Recent tabs + file-card list.
- **EditProfile** (`node 5:1559`) — profile info card + uploaded-documents card with add area.

Profile rows open **Edit Profile**, **Membership**, and **My Documents**. (Figma `5:1514`
is an empty frame — intentionally skipped.)

### Feature-parity screens (ported from the old Flutter app, front-end only — no API yet)
Auth (**Login → OTP → Signup**), **Onboarding** (permissions), **Saved Addresses** +
add/edit, **Bookings** list + detail, **Notifications**, **Help & Support** (FAQ),
**Lab Tests**, **Medical Records**, **Consult a Doctor** (list + detail + slots),
**Pharmacy** (catalog + cart), and **SOS** (confirm → countdown → dispatched).
These use in-memory stores (`src/state/familyStore`, `addressStore`, `cartStore`) and
static sample data — ready to swap for API calls later. Reached from **Profile** rows,
the Home **bell** (Notifications), **SOS** button, and **Family care** tab (Membership).

Flow: Home **"Where To?"** → Plan Ambulance → (Set location on map) → Plan Map → (FAB) →
Select Ambulance → (Book Now) → **Tracking** (ambulance on the way). Home **"Book Now"** →
Ambulance Types. In Plan Ambulance, **"For me"** → Contact sheet → (select) → Executive Call.
Home **"Locate Healthcare Centre"** → Service Select → Centres List → (list icon) →
filter sheet. Home **avatar** → Profile; Profile rows open My Credits / My Bookings.

## Images are SVG

Per project requirement, **every image is consumed through the SVG pipeline**:

- **Icons & simple vectors** (bell, home, family, SOS phone, back/forward chevrons,
  edit, settings, etc.) are hand-authored `react-native-svg` components in
  `src/components/icons/` — crisp at any size, tintable via a `color` prop.
- **Photographic assets** (forest/road backgrounds, ambulance & hospital
  illustrations, avatar) can't be true vectors, so each was **downscaled and
  embedded inside an `.svg` wrapper** (`<svg><image href="data:…"/></svg>`) in
  `assets/svg/`, imported as a component via `react-native-svg-transformer`.
  This collapsed ~67 MB of source PNGs down to ~2 MB of SVG.

`metro.config.js` registers the SVG transformer; `src/types/svg.d.ts` types
`import X from './x.svg'` as a React component.

## Run

```bash
cd healwin_patient_new
npm install

# Link the bundled Poppins fonts into the native projects (run once,
# and again whenever fonts change):
npm run fonts            # = npx react-native-asset

# iOS only — install pods:
cd ios && pod install && cd ..

# Start Metro + build:
npm start                # Metro bundler
npm run android          # build & run on Android device/emulator
npm run ios              # build & run on iOS simulator
```

> SVG images are bundled into the JS by Metro (no native asset linking needed).
> Only the Poppins fonts need native linking (`npm run fonts`).

## Project structure

```
healwin_patient_new/
├─ index.js                 # AppRegistry entry (registers App)
├─ App.tsx                  # SafeAreaProvider + NavigationContainer + RootNavigator
├─ app.json                 # RN app name
├─ metro.config.js          # Metro config (SVG transformer)
├─ babel.config.js          # @react-native/babel-preset
├─ react-native.config.js   # asset (font) linking config
├─ android/ · ios/          # native projects
├─ assets/
│  ├─ fonts/                # Poppins .ttf files (linked natively)
│  └─ svg/                  # all images as .svg (icons + embedded photos)
└─ src/
   ├─ svgAssets.ts          # SVG image registry (component map)
   ├─ types/svg.d.ts        # *.svg module typing
   ├─ theme/                # design tokens
   │  ├─ colors.ts          # color palette from Figma
   │  ├─ typography.ts      # font families + sizes + text styles
   │  ├─ spacing.ts         # spacing / radius scale
   │  ├─ shadows.ts         # cross-platform shadow (iOS shadow* / Android elevation)
   │  └─ responsive.ts      # scale / verticalScale / moderateScale
   ├─ navigation/           # root native-stack navigator + route types
   ├─ components/           # REUSABLE building blocks
   │  ├─ icons/             # hand-authored react-native-svg icon set
   │  ├─ Header.tsx         # avatar + greeting + notification bell
   │  ├─ Card.tsx           # rounded card (optional bg SVG + scrim)
   │  ├─ Button.tsx         # pill button (solid/outline/ghost)
   │  ├─ Dots.tsx           # carousel pagination dots
   │  ├─ BottomNav.tsx      # bottom bar + floating red SOS button
   │  ├─ BackButton.tsx     # circular back button
   │  ├─ AmbulanceTypeCard.tsx  # scenic card w/ vehicle + title + desc
   │  ├─ HospitalMapCard.tsx    # map + hospital + Direction/Call
   │  ├─ TripCard.tsx           # past-trip card w/ Rebook
   │  ├─ PaymentRow.tsx         # payment-history row w/ check + amount
   │  ├─ ServiceCard.tsx        # Hospital/Pharmacy service option
   │  ├─ CentreCard.tsx         # centre card w/ rating, tag, Directions
   │  ├─ FilterSheet.tsx        # bottom-sheet category filter (Modal)
   │  ├─ AddressRow.tsx         # map-pin + address suggestion row
   │  ├─ AmbulanceOptionCard.tsx # selectable ambulance option (price/book)
   │  ├─ ContactSheet.tsx       # "choose contact" bottom-sheet (Modal)
   │  ├─ Fab.tsx               # circular floating action button (plus/forward)
   │  ├─ PlanCard.tsx          # membership plan card (shield + benefits/info)
   │  ├─ FamilyMemberCard.tsx  # family member (photo + name + relation)
   │  └─ FileCard.tsx          # document/file card (folder tile)
   └─ screens/
      ├─ SplashScreen.tsx              # startup logo screen (initial route)
      ├─ HomeScreen.tsx                # home
      ├─ AmbulanceTypesScreen.tsx      # vehicle-type list (data-driven)
      ├─ ProfileScreen.tsx             # profile + action list
      ├─ NearbyAmbulancesScreen.tsx    # map + trip history (data-driven)
      ├─ MyCreditsScreen.tsx           # wallet balance + add credits + history
      ├─ ServiceSelectScreen.tsx       # "what are you looking for?"
      ├─ CentresListScreen.tsx         # centres list + filter sheet
      ├─ PlanAmbulanceScreen.tsx       # pickup/drop + address list
      ├─ PlanAmbulanceMapScreen.tsx    # map view + location search
      ├─ SelectAmbulanceScreen.tsx     # map + ambulance details (combined)
      ├─ ExecutiveCallScreen.tsx       # "executive will call you" confirmation
      ├─ TrackingScreen.tsx            # "ambulance on the way" + price breakup
      ├─ MembershipScreen.tsx          # plan carousel + family members
      ├─ UploadDocumentScreen.tsx      # add-document form
      ├─ DocumentsScreen.tsx           # search + file list
      └─ EditProfileScreen.tsx         # profile + uploaded documents
```

## Design tokens (from Figma)

### Colors
| Token | Value | Used for |
|-------|-------|----------|
| `background` | `#F7FCFF` | screen background |
| `surface` | `#FFFFFF` | cards, bell, nav bar |
| `textPrimary` | `#262424` | greeting, name, nav labels |
| `brandRed` | `#C92525` | "Book Now", SOS button, active dot |
| `brandRedDark` | `#880808` | "Healthcare Centre" heading |
| `avatarBorder` | `rgba(220,220,220,0.97)` | avatar ring |
| `shadow` | `rgba(0,0,0,0.25)` | drop shadow (0px 4px 4px) |

### Typography (Poppins)
| Style | Size | Weight | Used for |
|-------|------|--------|----------|
| caption | 12 | Regular / SemiBold | "Welcome,", nav labels |
| body | 15 | Bold | "Book Now" |
| title | 20 | Regular | "Know Your" |
| heading | 24 | Bold / SemiBold | name, "Where To ?", "Life Support Vehicle", "Locate" |
| headingLg | 26 | Bold | "Healthcare Centre" |

> Font sizes use `moderateScale()` so text stays readable on tablets while
> still scaling with the device.

### Spacing & radius
- Outer screen gutter: **13px** (`spacing.md`)
- Card radius: **10px** (`radius.card`)
- Avatar radius: **91px** (fully round)
- SOS button: **64px** circle, floats above the nav bar

## Responsiveness & cross-platform

- All sizes pass through `scale()` / `verticalScale()` / `moderateScale()`
  (base = iPhone 16 Pro, 402×854) so the layout holds across screen sizes.
- `react-native-safe-area-context` handles notches / home indicators on both
  iOS and Android.
- Shadows use `Platform.select` → iOS `shadow*` props, Android `elevation`.

## Notes / next steps

- The Figma asset URLs expire after 7 days; the images are already saved
  locally under `assets/images/`, so the app is self-contained.
- Wire the `onPress` handlers (currently no-ops) to navigation once
  `@react-navigation` is added.
# healwinpatient
