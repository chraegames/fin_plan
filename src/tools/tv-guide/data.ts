// The TV buying guide's content model — PURE data, no React, no browser APIs.
// Consumed by the prerendered (build-time) views, the live client views and
// the tests alike.
//
// Editorial rules (enforced by data.test.ts):
//   • Series / brand names only — never model numbers with specs, sizes, prices
//     or brightness figures. We have no live product data, so anything more
//     specific would go stale and mislead.
//   • Every revision adds a CHANGELOG entry; GUIDE_REVIEWED derives from it and
//     the manifest `updated` dates for all /tv-guide/ pages must match it.

export type Family = 'lcd' | 'oled';

export type TechId =
  | 'edge-led'
  | 'direct-led'
  | 'qled'
  | 'mini-led'
  | 'rgb-mini-led'
  | 'micro-rgb'
  | 'sqd-mini-led'
  | 'w-oled'
  | 'qd-oled'
  | 'tandem-oled';

export type TechStatus = 'mainstream' | 'new' | 'legacy';

export type LayerTone = 'backlight' | 'guide' | 'diffuser' | 'qd' | 'tft' | 'lc' | 'filter' | 'glass' | 'emitter';

export type LayerId =
  | 'edge-leds'
  | 'light-guide'
  | 'led-array'
  | 'blue-led-array'
  | 'mini-led-array'
  | 'rgb-led-array'
  | 'micro-rgb-array'
  | 'diffuser'
  | 'qd-film'
  | 'sqd-film'
  | 'tft'
  | 'lc-layer'
  | 'color-filter'
  | 'glass'
  | 'oled-white'
  | 'oled-blue'
  | 'oled-tandem'
  | 'wrgb-filter'
  | 'qd-converter'
  | 'encapsulation';

export interface Layer {
  id: LayerId;
  name: string;
  /** What the layer does, one short sentence. */
  role: string;
  tone: LayerTone;
}

export type AttributeId =
  | 'blackLevel'
  | 'brightness'
  | 'colorVolume'
  | 'viewingAngle'
  | 'burnIn'
  | 'blooming'
  | 'motion'
  | 'priceTier';

export interface Attribute {
  id: AttributeId;
  label: string;
  /** Column header in tight tables. */
  short: string;
  /** false = a low rating is the desirable one (burn-in risk, blooming, price). */
  higherIsBetter: boolean;
  blurb: string;
}

export type Rating = 1 | 2 | 3 | 4 | 5;
export type Ratings = Record<AttributeId, Rating>;

export type Demo = 'none' | 'zones' | 'rgb' | 'pixels';

export interface Technology {
  id: TechId;
  family: Family;
  name: string;
  shortName: string;
  /** Other generic names people use for the same thing (not brand names). */
  aka: string[];
  status: TechStatus;
  /** One sentence for cards and the decoder. */
  summary: string;
  /** Step-by-step: how light becomes the picture. */
  howItWorks: string[];
  /** Bottom (furthest from the viewer) → top (the glass you look at). */
  layers: LayerId[];
  /** Extra interactive demo shown next to the layer stack. */
  demo: Demo;
  pros: string[];
  cons: string[];
  bestFor: string[];
  /** Caveat shown as a callout, mainly for very new tech. */
  watchOut?: string;
  ratings: Ratings;
}

export type Tier = 'entry' | 'mid' | 'premium' | 'flagship';

export interface BrandName {
  /** The marketing name as printed on the box / website. */
  name: string;
  /** Underlying technologies this name has been used for (first = most common). */
  techIds: TechId[];
  tier?: Tier;
  /** What the name does and doesn't tell you. */
  note: string;
}

export interface Brand {
  id: string;
  name: string;
  /** Official site root only — never a product page. */
  officialUrl: string;
  /** Which names the brand uses, roughly cheapest → most expensive. */
  names: BrandName[];
  /** One line about how this brand names things. */
  namingStyle: string;
}

export interface ChangelogEntry {
  /** YYYY-MM-DD */
  date: string;
  summary: string;
}

// ─── Layers ──────────────────────────────────────────────────────────────

export const LAYERS: Layer[] = [
  { id: 'edge-leds', name: 'Edge LEDs', role: 'A strip of white LEDs along one or more edges of the frame.', tone: 'backlight' },
  { id: 'light-guide', name: 'Light guide plate', role: 'A clear plastic sheet that bounces edge light across the whole screen.', tone: 'guide' },
  { id: 'led-array', name: 'LED backlight grid', role: 'Rows of white LEDs spread behind the whole panel.', tone: 'backlight' },
  { id: 'blue-led-array', name: 'Blue LED backlight', role: 'Blue LEDs whose light will be converted to white by the quantum-dot film.', tone: 'backlight' },
  { id: 'mini-led-array', name: 'Mini-LED backlight', role: 'Thousands of tiny blue LEDs grouped into local-dimming zones.', tone: 'backlight' },
  { id: 'rgb-led-array', name: 'RGB LED backlight', role: 'Separate red, green and blue LEDs that mix light directly, no colour conversion needed.', tone: 'backlight' },
  { id: 'micro-rgb-array', name: 'Micro RGB backlight', role: 'RGB LEDs shrunk below a tenth of a millimetre, so many more fit — and many more dimming zones.', tone: 'backlight' },
  { id: 'diffuser', name: 'Diffuser', role: 'Spreads the backlight so you cannot see the individual LEDs.', tone: 'diffuser' },
  { id: 'qd-film', name: 'Quantum-dot film', role: 'Nano-crystals that turn blue light into pure red and green, giving richer colour.', tone: 'qd' },
  { id: 'sqd-film', name: 'Super quantum-dot film', role: 'A newer quantum-dot layer with smaller crystals, claimed to convert light more efficiently and cut light leakage.', tone: 'qd' },
  { id: 'tft', name: 'Transistor backplane', role: 'A grid of tiny switches, one per sub-pixel, that tells each pixel what to do.', tone: 'tft' },
  { id: 'lc-layer', name: 'Liquid-crystal layer', role: 'Each pixel twists crystals to let more or less backlight through — the "shutter".', tone: 'lc' },
  { id: 'color-filter', name: 'Colour filter', role: 'Red, green and blue tinted windows that colour the light passing through each sub-pixel.', tone: 'filter' },
  { id: 'glass', name: 'Front glass', role: 'The surface you look at, with anti-reflection coating.', tone: 'glass' },
  { id: 'oled-white', name: 'White OLED emitters', role: 'Organic layers that glow white on their own, pixel by pixel — no backlight at all.', tone: 'emitter' },
  { id: 'oled-blue', name: 'Blue OLED emitters', role: 'Organic layers that glow blue, pixel by pixel; colour is added by the quantum-dot layer above.', tone: 'emitter' },
  { id: 'oled-tandem', name: 'Stacked OLED emitters', role: 'Several emitting layers stacked on top of each other so each pixel can glow much brighter.', tone: 'emitter' },
  { id: 'wrgb-filter', name: 'WRGB colour filter', role: 'Red, green and blue filters plus an unfiltered white sub-pixel for extra brightness.', tone: 'filter' },
  { id: 'qd-converter', name: 'Quantum-dot colour layer', role: 'Converts each blue pixel to red or green without a filter, so less light is lost.', tone: 'qd' },
  { id: 'encapsulation', name: 'Encapsulation + glass', role: 'Seals the organic layers from air and moisture; the front glass sits on top.', tone: 'glass' },
];

export const LAYER_BY_ID: Record<LayerId, Layer> = Object.fromEntries(LAYERS.map(l => [l.id, l])) as Record<
  LayerId,
  Layer
>;

// ─── Attributes ──────────────────────────────────────────────────────────

export const ATTRIBUTES: Attribute[] = [
  {
    id: 'blackLevel',
    label: 'Black level & contrast',
    short: 'Blacks',
    higherIsBetter: true,
    blurb: 'How dark "black" really is and how much punch the picture has in a dim room.',
  },
  {
    id: 'brightness',
    label: 'Peak brightness',
    short: 'Brightness',
    higherIsBetter: true,
    blurb: 'How well the picture holds up against sunlight and how vivid HDR highlights look.',
  },
  {
    id: 'colorVolume',
    label: 'Colour richness',
    short: 'Colour',
    higherIsBetter: true,
    blurb: 'How saturated colours stay, especially when they are also bright.',
  },
  {
    id: 'viewingAngle',
    label: 'Viewing angle',
    short: 'Angles',
    higherIsBetter: true,
    blurb: 'Whether the picture washes out for people sitting off to the side.',
  },
  {
    id: 'burnIn',
    label: 'Burn-in risk',
    short: 'Burn-in',
    higherIsBetter: false,
    blurb: 'Whether static content left on screen for hours (news tickers, game HUDs, a desktop) can leave a faint ghost.',
  },
  {
    id: 'blooming',
    label: 'Halo / blooming',
    short: 'Halo',
    higherIsBetter: false,
    blurb: 'A glow around bright objects on dark backgrounds — subtitles, stars, credits.',
  },
  {
    id: 'motion',
    label: 'Motion clarity',
    short: 'Motion',
    higherIsBetter: true,
    blurb: 'How crisp fast movement looks in sport and games (pixel response, not refresh rate).',
  },
  {
    id: 'priceTier',
    label: 'Typical price tier',
    short: 'Price',
    higherIsBetter: false,
    blurb: 'Where the technology usually sits in a brand\'s range, from entry level (1) to flagship (5). Not a price.',
  },
];

// ─── Technologies ────────────────────────────────────────────────────────

export const TECHNOLOGIES: Technology[] = [
  {
    id: 'edge-led',
    family: 'lcd',
    name: 'Edge-lit LED LCD',
    shortName: 'Edge-lit LED',
    aka: ['Edge LED', 'LED TV', 'Slim LED'],
    status: 'legacy',
    summary: 'The thinnest and cheapest LCD: white LEDs along the frame push light sideways through a plastic guide plate.',
    howItWorks: [
      'A strip of white LEDs sits along one or more edges of the frame.',
      'A light-guide plate bounces that light across the back of the screen.',
      'The liquid-crystal layer opens or closes each pixel like a shutter to let light through.',
      'A colour filter tints each sub-pixel red, green or blue.',
    ],
    layers: ['edge-leds', 'light-guide', 'diffuser', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'none',
    pros: ['Very thin and light', 'The lowest prices', 'Fine for daytime TV, news and background viewing'],
    cons: [
      'Cannot dim parts of the screen independently, so dark scenes look grey',
      'Often uneven — brighter near the edges, cloudy patches elsewhere',
      'Narrow viewing angles and modest brightness',
    ],
    bestFor: ['A garage, workshop or kitchen counter', 'A second screen you rarely watch in the dark'],
    ratings: { blackLevel: 1, brightness: 2, colorVolume: 2, viewingAngle: 2, burnIn: 1, blooming: 3, motion: 2, priceTier: 1 },
  },
  {
    id: 'direct-led',
    family: 'lcd',
    name: 'Direct-lit LED LCD',
    shortName: 'Direct-lit LED',
    aka: ['Direct LED', 'Full-array LED', 'FALD (with local dimming)'],
    status: 'mainstream',
    summary: 'A grid of white LEDs behind the whole panel — the budget workhorse, sometimes with a handful of dimming zones.',
    howItWorks: [
      'Rows of white LEDs sit directly behind the panel instead of at the edges.',
      'A diffuser sheet blends them into an even glow.',
      'The liquid-crystal layer shutters each pixel; the colour filter adds colour.',
      'Better models group the LEDs into a few dozen zones that can dim together ("full-array local dimming").',
    ],
    layers: ['led-array', 'diffuser', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'zones',
    pros: ['More even than edge-lit', 'Inexpensive and widely available in large sizes', 'Nothing to worry about with static content'],
    cons: ['Blacks are still grey-ish, especially with few or no dimming zones', 'Colour is only as good as the white LEDs and filter allow', 'Viewing angles are narrow on most panels'],
    bestFor: ['Guest rooms, home offices and kids\' rooms', 'Casual viewers on a tight budget'],
    ratings: { blackLevel: 2, brightness: 2, colorVolume: 2, viewingAngle: 2, burnIn: 1, blooming: 2, motion: 2, priceTier: 1 },
  },
  {
    id: 'qled',
    family: 'lcd',
    name: 'QLED (quantum-dot LCD)',
    shortName: 'QLED',
    aka: ['Quantum dot LCD', 'QD-LCD', 'Quantum LED'],
    status: 'mainstream',
    summary: 'A direct-lit LCD with a quantum-dot film that turns blue backlight into purer reds and greens — richer, brighter colour.',
    howItWorks: [
      'Blue LEDs behind the panel provide the light.',
      'A quantum-dot film converts some of that blue into very pure red and green, making clean white light with a wide colour range.',
      'From there it is a normal LCD: transistors, liquid crystal shutters and a colour filter.',
      'Despite the "LED" in the name it is still an LCD — the quantum dots do not emit light on their own.',
    ],
    layers: ['blue-led-array', 'diffuser', 'qd-film', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'none',
    pros: ['Noticeably richer colour than plain LED', 'Brighter than budget LED', 'Strong value — the sweet spot for everyday viewing'],
    cons: ['Black level depends entirely on the backlight underneath: without local dimming it is still an LED TV with better colour', 'Some "QLED" models are edge-lit — check the spec sheet', 'Viewing angles remain LCD-typical'],
    bestFor: ['The main TV in a living room with mixed lighting', 'Anyone who wants better colour without paying for mini-LED or OLED'],
    watchOut: 'QLED describes the colour layer, not the backlight. A QLED with local dimming and a QLED without it look very different in a dark room.',
    ratings: { blackLevel: 2, brightness: 3, colorVolume: 4, viewingAngle: 2, burnIn: 1, blooming: 3, motion: 3, priceTier: 2 },
  },
  {
    id: 'mini-led',
    family: 'lcd',
    name: 'Mini-LED LCD',
    shortName: 'Mini-LED',
    aka: ['Mini LED', 'QD-Mini LED', 'Quantum Mini LED', 'MiniLED'],
    status: 'mainstream',
    summary: 'Thousands of much smaller backlight LEDs grouped into hundreds or thousands of dimming zones — bright, punchy, and far better blacks than regular LED.',
    howItWorks: [
      'The backlight is made of thousands of tiny LEDs instead of a few hundred normal ones.',
      'They are grouped into local-dimming zones that each get brighter or darker to follow the picture.',
      'A quantum-dot film (almost always) adds the colour range of QLED.',
      'The liquid-crystal layer still does the fine per-pixel work; the zones handle the broad light and dark areas.',
    ],
    layers: ['mini-led-array', 'diffuser', 'qd-film', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'zones',
    pros: ['Very bright — the best choice for sunlit rooms', 'Deep blacks for an LCD when the zone count is high', 'No burn-in concerns, good for gaming HUDs and news channels'],
    cons: ['Some halo ("blooming") around bright objects on black, especially with fewer zones', 'Picture washes out off-axis on many panels', 'Zone counts and dimming quality vary hugely between models at the same price'],
    bestFor: ['Bright living rooms and open-plan spaces', 'Sports and daytime viewing', 'People who want most of OLED\'s punch with none of its burn-in worry'],
    ratings: { blackLevel: 3, brightness: 5, colorVolume: 4, viewingAngle: 3, burnIn: 1, blooming: 3, motion: 3, priceTier: 3 },
  },
  {
    id: 'rgb-mini-led',
    family: 'lcd',
    name: 'RGB Mini-LED LCD',
    shortName: 'RGB Mini-LED',
    aka: ['RGB LED', 'RGB backlight', 'RGB local dimming'],
    status: 'new',
    summary: 'Mini-LED where each backlight zone has its own red, green and blue LEDs instead of white or blue ones — colour is made in the backlight, so nothing is lost converting it.',
    howItWorks: [
      'Each dimming zone contains separate red, green and blue LEDs.',
      'The TV mixes those three colours directly to match the scene — a red sunset gets a red backlight.',
      'Because there is no white-to-colour conversion, less light is wasted and colours stay saturated at high brightness.',
      'The liquid-crystal layer and a lighter colour filter still shape the fine detail.',
    ],
    layers: ['rgb-led-array', 'diffuser', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'rgb',
    pros: ['The widest colour range of any LCD, even at very high brightness', 'Extremely bright', 'Less blooming than regular mini-LED because the backlight colour already matches the scene'],
    cons: ['Brand-new and priced accordingly', 'Still an LCD: viewing angles and per-pixel blacks do not match OLED', 'Every brand uses a different name for it, which makes shopping confusing'],
    bestFor: ['Large screens in bright rooms', 'Early adopters who want the most vivid HDR'],
    watchOut: 'Micro RGB, True RGB, RGB Mini-LED and RGB MiniLED are all this same idea under different brand names. Judge them on reviews, not on the name.',
    ratings: { blackLevel: 3, brightness: 5, colorVolume: 5, viewingAngle: 3, burnIn: 1, blooming: 2, motion: 4, priceTier: 5 },
  },
  {
    id: 'micro-rgb',
    family: 'lcd',
    name: 'Micro RGB LCD',
    shortName: 'Micro RGB',
    aka: ['MicroRGB', 'Micro RGB LED'],
    status: 'new',
    summary: 'RGB Mini-LED with the LEDs shrunk below a tenth of a millimetre, so far more of them fit and dimming zones get much denser.',
    howItWorks: [
      'Same idea as RGB Mini-LED: red, green and blue LEDs make the backlight colour directly.',
      'The LEDs are much smaller, so a panel can hold many more of them.',
      'More LEDs means more, smaller dimming zones — halos shrink and dark scenes get closer to OLED.',
      'It is not Micro-LED: there is still a liquid-crystal layer in front of the backlight.',
    ],
    layers: ['micro-rgb-array', 'diffuser', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'rgb',
    pros: ['Denser dimming zones than any earlier LCD backlight', 'RGB colour purity at very high brightness', 'No burn-in'],
    cons: ['Flagship-only for now', 'The name invites confusion with true Micro-LED, a different (far more expensive) technology', 'Real-world zone counts are rarely published, so compare on reviews'],
    bestFor: ['Very large, very bright rooms', 'Buyers who want the newest LCD and can wait for reviews to settle'],
    watchOut: 'Micro RGB (an LCD with a tiny-LED backlight) is not Micro-LED (a screen made entirely of microscopic self-emitting LEDs, still a wall-sized luxury product).',
    ratings: { blackLevel: 4, brightness: 5, colorVolume: 5, viewingAngle: 3, burnIn: 1, blooming: 2, motion: 4, priceTier: 5 },
  },
  {
    id: 'sqd-mini-led',
    family: 'lcd',
    name: 'SQD-MiniLED LCD',
    shortName: 'SQD-MiniLED',
    aka: ['Super Quantum Dot', 'SQD'],
    status: 'new',
    summary: 'A mini-LED that keeps blue LEDs but swaps in a "super quantum dot" layer with much smaller crystals, claiming RGB-like colour, extreme brightness and near-zero blooming.',
    howItWorks: [
      'The backlight is a dense blue mini-LED grid with a very high zone count.',
      'A new quantum-dot layer with crystals of only a few nanometres converts blue to red and green more efficiently.',
      'The maker claims the layer also reduces the stray light that causes halos.',
      'Everything else is a conventional LCD stack.',
    ],
    layers: ['mini-led-array', 'diffuser', 'sqd-film', 'tft', 'lc-layer', 'color-filter', 'glass'],
    demo: 'zones',
    pros: ['Claims the colour benefits of RGB backlights without RGB LEDs', 'Extremely bright with very dense dimming', 'No burn-in'],
    cons: ['Very new — one brand, very few models, little long-term data', 'Claims about blooming still need independent testing', 'Flagship pricing'],
    bestFor: ['Early adopters', 'Anyone shopping the very top of the LCD market who should also read the RGB Mini-LED tab'],
    watchOut: 'As of this edition SQD is a single-manufacturer technology. Treat its headline claims as promising until independent reviews confirm them.',
    ratings: { blackLevel: 4, brightness: 5, colorVolume: 5, viewingAngle: 3, burnIn: 1, blooming: 2, motion: 4, priceTier: 5 },
  },
  {
    id: 'w-oled',
    family: 'oled',
    name: 'W-OLED (white OLED)',
    shortName: 'W-OLED',
    aka: ['WOLED', 'WRGB OLED', 'OLED', 'Tandem WOLED (older 2-stack)'],
    status: 'mainstream',
    summary: 'The standard OLED: every pixel is its own white light source with a colour filter, plus an extra white sub-pixel for brightness. Perfect blacks, no backlight.',
    howItWorks: [
      'There is no backlight. Each pixel contains organic material that glows when current flows.',
      'The emitters glow white; a colour filter turns sub-pixels red, green or blue.',
      'A fourth, unfiltered white sub-pixel adds brightness (the "W" in WRGB).',
      'A pixel that should be black is simply switched off — that is why blacks are perfect and there is no halo.',
    ],
    layers: ['tft', 'oled-white', 'wrgb-filter', 'encapsulation'],
    demo: 'pixels',
    pros: ['Perfect blacks and infinite contrast', 'Near-perfect viewing angles', 'Instant pixel response — superb motion for games and sport'],
    cons: ['Not as bright as mini-LED in a sunlit room', 'Colours desaturate slightly at peak brightness because of the white sub-pixel', 'Static content for many hours a day carries some burn-in risk'],
    bestFor: ['Movie nights in a dim or light-controlled room', 'Gaming', 'Anyone who values contrast over sheer brightness'],
    ratings: { blackLevel: 5, brightness: 3, colorVolume: 4, viewingAngle: 5, burnIn: 3, blooming: 1, motion: 5, priceTier: 3 },
  },
  {
    id: 'qd-oled',
    family: 'oled',
    name: 'QD-OLED',
    shortName: 'QD-OLED',
    aka: ['Quantum dot OLED', 'QD OLED'],
    status: 'mainstream',
    summary: 'OLED pixels that glow blue, with a quantum-dot layer converting them to red and green — OLED blacks plus the purest colour.',
    howItWorks: [
      'Every pixel is a self-emitting blue OLED.',
      'Instead of a colour filter, a quantum-dot layer converts blue to red or green — conversion, not filtering, so very little light is lost.',
      'The result keeps colour saturated even at high brightness.',
      'Like all OLED, black pixels are simply off.',
    ],
    layers: ['tft', 'oled-blue', 'qd-converter', 'glass'],
    demo: 'pixels',
    pros: ['Perfect blacks plus the richest colour of any OLED', 'Brighter colours than W-OLED', 'Excellent viewing angles and motion'],
    cons: ['The panel can look slightly grey-ish in a bright room because it lacks a polariser', 'Fewer sizes than W-OLED', 'Burn-in risk is similar to other OLED'],
    bestFor: ['Cinematic viewing with vivid HDR colour', 'Gamers who want the best of both colour and contrast'],
    ratings: { blackLevel: 5, brightness: 4, colorVolume: 5, viewingAngle: 5, burnIn: 3, blooming: 1, motion: 5, priceTier: 4 },
  },
  {
    id: 'tandem-oled',
    family: 'oled',
    name: 'Tandem OLED (4-stack)',
    shortName: 'Tandem OLED',
    aka: ['Four-stack OLED', 'Primary RGB Tandem', 'Multi-stack OLED'],
    status: 'new',
    summary: 'W-OLED rebuilt with four emitting layers stacked per pixel — far brighter than earlier OLED, aimed squarely at mini-LED\'s brightness lead.',
    howItWorks: [
      'Each pixel stacks several OLED emitting layers on top of one another.',
      'The stacks share the work, so each pixel can glow much brighter without wearing out faster.',
      'Colour still comes from a filter and a white sub-pixel, like W-OLED.',
      'Blacks are still perfect — it is an OLED, just a brighter one.',
    ],
    layers: ['tft', 'oled-tandem', 'wrgb-filter', 'encapsulation'],
    demo: 'pixels',
    pros: ['The brightest OLED yet — usable in brighter rooms than before', 'All the OLED virtues: perfect blacks, angles, motion', 'Improved colour at high brightness'],
    cons: ['Flagship-only and expensive', 'Early production has shown some inconsistency (for example faint colour banding on some units)', 'Burn-in risk is lower but not zero'],
    bestFor: ['Enthusiasts wanting OLED without giving up brightness', 'Buyers prepared to read early reviews carefully'],
    watchOut: 'First-generation panels. Early reports of unit-to-unit variation (banding, uniformity) are worth checking in reviews before buying.',
    ratings: { blackLevel: 5, brightness: 4, colorVolume: 4, viewingAngle: 5, burnIn: 2, blooming: 1, motion: 5, priceTier: 5 },
  },
];

export const TECH_BY_ID: Record<TechId, Technology> = Object.fromEntries(
  TECHNOLOGIES.map(t => [t.id, t]),
) as Record<TechId, Technology>;

export const FAMILIES: { id: Family; name: string; blurb: string }[] = [
  {
    id: 'lcd',
    name: 'LCD family',
    blurb:
      'A backlight shines through a liquid-crystal "shutter" layer. Every variation — LED, QLED, Mini-LED, RGB — is a different backlight or colour layer in front of the same shutter.',
  },
  {
    id: 'oled',
    name: 'OLED family',
    blurb:
      'No backlight. Each pixel makes its own light and can switch fully off, so blacks are perfect. The variations differ in how the pixel makes colour and how bright it can get.',
  },
];

// ─── Brands ──────────────────────────────────────────────────────────────

export const SPEC_SHEET_TIP =
  'Names change every year. The three lines on a spec sheet that tell you what you are really buying: panel type (LCD or OLED), backlight type (edge, direct, mini-LED, RGB) and local dimming (none / full-array / number of zones).';

export const BRANDS: Brand[] = [
  {
    id: 'samsung',
    name: 'Samsung',
    officialUrl: 'https://www.samsung.com/',
    namingStyle: 'Tiers by colour-layer name (Crystal → QLED → Neo QLED → Micro RGB), with OLED as a separate line.',
    names: [
      { name: 'Crystal UHD', techIds: ['direct-led', 'edge-led'], tier: 'entry', note: 'Plain LED LCD. "Crystal" refers to the processor and colour tuning, not the panel.' },
      { name: 'QLED', techIds: ['qled'], tier: 'mid', note: 'Quantum-dot LCD. Cheaper QLED models may be edge-lit with no local dimming.' },
      { name: 'The Frame', techIds: ['qled'], tier: 'mid', note: 'A QLED in a picture-frame design with a matte screen; the panel is the same family as Samsung\'s other QLEDs.' },
      { name: 'Neo QLED', techIds: ['mini-led'], tier: 'premium', note: '"Quantum Mini LED" backlight — Samsung\'s name for mini-LED with quantum dots.' },
      { name: 'Micro RGB', techIds: ['rgb-mini-led', 'micro-rgb'], tier: 'flagship', note: 'RGB backlight LCD. Not Micro-LED, which Samsung sells separately as a wall-sized product.' },
      { name: 'OLED (S9 series)', techIds: ['qd-oled', 'w-oled'], tier: 'premium', note: 'Top models use Samsung Display\'s QD-OLED; some sizes in the mid-range OLED series use W-OLED panels instead. Check the panel type per size.' },
    ],
  },
  {
    id: 'lg',
    name: 'LG',
    officialUrl: 'https://www.lg.com/',
    namingStyle: 'LCDs are "QNED" (with or without mini-LED); OLED is tiered by letter, with Tandem panels at the top.',
    names: [
      { name: 'UHD / UR series', techIds: ['direct-led'], tier: 'entry', note: 'Plain direct-lit LED LCD.' },
      { name: 'NanoCell', techIds: ['direct-led', 'qled'], tier: 'entry', note: 'LCD with a nano-particle colour filter — a colour enhancement, not a backlight upgrade.' },
      { name: 'QNED', techIds: ['qled', 'mini-led'], tier: 'mid', note: 'Originally quantum dot + NanoCell; recent QNED ranges use LG\'s own "Dynamic QNED Color" layer, which may not use quantum dots. Only some QNED models have mini-LED backlights.' },
      { name: 'QNED evo Mini-LED', techIds: ['mini-led'], tier: 'premium', note: 'The QNED models that do carry a mini-LED backlight.' },
      { name: 'Micro RGB evo', techIds: ['rgb-mini-led'], tier: 'flagship', note: 'LG\'s name for an RGB-backlight LCD.' },
      { name: 'OLED evo (B / C series)', techIds: ['w-oled'], tier: 'premium', note: '"evo" marks the brighter generations of LG Display\'s W-OLED panel.' },
      { name: 'OLED evo with Primary RGB Tandem (G / M series)', techIds: ['tandem-oled'], tier: 'flagship', note: 'The four-stack Tandem OLED panel. "Primary RGB Tandem" is LG\'s brand name for it.' },
    ],
  },
  {
    id: 'sony',
    name: 'Sony',
    officialUrl: 'https://www.sony.com/',
    namingStyle: 'Everything is "Bravia" followed by a number; the number, not the name, tells you the panel.',
    names: [
      { name: 'Bravia 3 / Bravia 5', techIds: ['direct-led', 'mini-led'], tier: 'entry', note: 'Lower numbers are direct-lit LED; the mid number introduces mini-LED. Check the backlight line.' },
      { name: 'Bravia 7 / Bravia 9', techIds: ['mini-led'], tier: 'premium', note: 'Mini-LED with Sony\'s "XR Backlight Master Drive" zone control.' },
      { name: 'True RGB', techIds: ['rgb-mini-led'], tier: 'flagship', note: 'Sony\'s name for an RGB-backlight LCD.' },
      { name: 'Bravia 8', techIds: ['w-oled'], tier: 'premium', note: 'W-OLED panel.' },
      { name: 'Bravia 8 II', techIds: ['qd-oled'], tier: 'flagship', note: 'QD-OLED panel.' },
      { name: 'Triluminos', techIds: ['qled', 'qd-oled'], note: 'A colour-processing brand, not a panel type — it appears on LCD and OLED models alike.' },
    ],
  },
  {
    id: 'tcl',
    name: 'TCL',
    officialUrl: 'https://www.tcl.com/',
    namingStyle: 'Letter series map cleanly to backlights: S (LED) → Q (QLED) → QM (mini-LED) → X (flagship).',
    names: [
      { name: 'S series', techIds: ['direct-led'], tier: 'entry', note: 'Direct-lit LED LCD.' },
      { name: 'Q series (QLED)', techIds: ['qled'], tier: 'mid', note: 'Quantum-dot LCD; higher Q models add full-array local dimming.' },
      { name: 'QM series (QD-Mini LED)', techIds: ['mini-led'], tier: 'premium', note: 'Mini-LED with quantum dots. TCL usually publishes zone counts, which makes comparison easier.' },
      { name: 'RGB Mini-LED', techIds: ['rgb-mini-led'], tier: 'flagship', note: 'RGB-backlight LCD under the generic name.' },
      { name: 'X series (SQD-MiniLED)', techIds: ['sqd-mini-led'], tier: 'flagship', note: '"Super Quantum Dot" mini-LED — TCL\'s alternative to RGB backlights.' },
    ],
  },
  {
    id: 'hisense',
    name: 'Hisense',
    officialUrl: 'https://www.hisense.com/',
    namingStyle: '"ULED" is an umbrella for the whole premium LCD range; the U-number tells you the backlight.',
    names: [
      { name: 'A series', techIds: ['direct-led'], tier: 'entry', note: 'Direct-lit LED LCD.' },
      { name: 'QLED (Q / U6 series)', techIds: ['qled', 'mini-led'], tier: 'mid', note: 'Quantum-dot LCD; newer U6 models have moved to mini-LED backlights.' },
      { name: 'ULED (U7 series)', techIds: ['mini-led', 'qled'], tier: 'mid', note: 'ULED is a bundle of picture features, not a panel. In this tier it usually means mini-LED with quantum dots.' },
      { name: 'ULED X (U8 / U9 series)', techIds: ['mini-led'], tier: 'premium', note: 'Hisense\'s high-zone-count mini-LED.' },
      { name: 'RGB MiniLED (UX series)', techIds: ['rgb-mini-led'], tier: 'flagship', note: 'RGB-backlight LCD; Hisense adds a fourth cyan emitter to the usual red, green and blue.' },
    ],
  },
  {
    id: 'panasonic',
    name: 'Panasonic',
    officialUrl: 'https://www.panasonic.com/',
    namingStyle: 'Z series is OLED, W series is LCD; the higher the number, the better the panel.',
    names: [
      { name: 'W series', techIds: ['qled', 'mini-led'], tier: 'mid', note: 'LCD range; the top W models use mini-LED, lower ones quantum-dot or plain LED.' },
      { name: 'Z series (OLED)', techIds: ['w-oled', 'tandem-oled'], tier: 'premium', note: 'LG Display W-OLED panels; the flagship Z model uses the Tandem panel.' },
    ],
  },
  {
    id: 'roku',
    name: 'Roku',
    officialUrl: 'https://www.roku.com/',
    namingStyle: 'Three plain tiers: Select, Plus, Pro.',
    names: [
      { name: 'Roku Select', techIds: ['direct-led'], tier: 'entry', note: 'Direct-lit LED LCD.' },
      { name: 'Roku Plus', techIds: ['qled'], tier: 'mid', note: 'Quantum-dot LCD with local dimming.' },
      { name: 'Roku Pro', techIds: ['mini-led'], tier: 'premium', note: 'Mini-LED with quantum dots.' },
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon Fire TV',
    officialUrl: 'https://www.amazon.com/',
    namingStyle: 'Numbered series for basic LED, "Omni" for the better panels.',
    names: [
      { name: 'Fire TV 2-Series / 4-Series', techIds: ['direct-led'], tier: 'entry', note: 'Direct-lit LED LCD.' },
      { name: 'Fire TV Omni QLED', techIds: ['qled'], tier: 'mid', note: 'Quantum-dot LCD with local dimming.' },
      { name: 'Fire TV Omni Mini-LED', techIds: ['mini-led'], tier: 'premium', note: 'Mini-LED with quantum dots.' },
    ],
  },
  {
    id: 'vizio',
    name: 'Vizio',
    officialUrl: 'https://www.vizio.com/',
    namingStyle: '"Quantum" marks the quantum-dot models; "Pro" adds mini-LED.',
    names: [
      { name: 'V series', techIds: ['direct-led'], tier: 'entry', note: 'Direct-lit LED LCD.' },
      { name: 'Quantum', techIds: ['qled'], tier: 'mid', note: 'Quantum-dot LCD.' },
      { name: 'Quantum Pro', techIds: ['mini-led'], tier: 'premium', note: 'Mini-LED with quantum dots.' },
    ],
  },
];

export const BRAND_BY_ID: Record<string, Brand> = Object.fromEntries(BRANDS.map(b => [b.id, b]));

// ─── Edition ─────────────────────────────────────────────────────────────

/** Newest first. Add an entry (and bump the manifest `updated` dates) with every content revision. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-08-26',
    summary:
      'First edition. LCD family (edge-lit, direct-lit, QLED, Mini-LED, RGB Mini-LED, Micro RGB, SQD-MiniLED) and OLED family (W-OLED, QD-OLED, Tandem OLED); brand-name decoder for Samsung, LG, Sony, TCL, Hisense, Panasonic, Roku, Amazon Fire TV and Vizio.',
  },
];

export const GUIDE_REVIEWED = CHANGELOG[0].date;
export const GUIDE_YEAR = Number(GUIDE_REVIEWED.slice(0, 4));
