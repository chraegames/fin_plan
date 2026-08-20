// Unit definitions for the converter. Every category has a base unit; each
// unit converts to/from that base. Factors are the exact legal definitions
// (international inch/pound/gallon, international nautical mile, …).

export interface Unit {
  id: string;
  label: string;
  symbol: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

export type CategoryId = 'length' | 'weight' | 'volume' | 'area' | 'speed' | 'temperature';

export interface UnitCategory {
  id: CategoryId;
  name: string;
  units: Unit[];
  defaultFrom: string;
  defaultTo: string;
}

export function linear(factor: number) {
  return (id: string, label: string, symbol: string): Unit => ({
    id,
    label,
    symbol,
    toBase: v => v * factor,
    fromBase: v => v / factor,
  });
}

const INCH = 0.0254;
const FOOT = INCH * 12;
const YARD = FOOT * 3;
const MILE = YARD * 1760;
const POUND = 0.45359237;
const GALLON_US = 3.785411784;
const GALLON_UK = 4.54609;
const ACRE = 4046.8564224;

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    defaultFrom: 'mi',
    defaultTo: 'km',
    units: [
      linear(0.001)('mm', 'Millimeter', 'mm'),
      linear(0.01)('cm', 'Centimeter', 'cm'),
      linear(1)('m', 'Meter', 'm'),
      linear(1000)('km', 'Kilometer', 'km'),
      linear(INCH)('in', 'Inch', 'in'),
      linear(FOOT)('ft', 'Foot', 'ft'),
      linear(YARD)('yd', 'Yard', 'yd'),
      linear(MILE)('mi', 'Mile', 'mi'),
      linear(1852)('nmi', 'Nautical mile', 'nmi'),
    ],
  },
  {
    id: 'weight',
    name: 'Weight',
    defaultFrom: 'lb',
    defaultTo: 'kg',
    units: [
      linear(1e-6)('mg', 'Milligram', 'mg'),
      linear(0.001)('g', 'Gram', 'g'),
      linear(1)('kg', 'Kilogram', 'kg'),
      linear(1000)('t', 'Metric ton', 't'),
      linear(POUND / 16)('oz', 'Ounce', 'oz'),
      linear(POUND)('lb', 'Pound', 'lb'),
      linear(POUND * 14)('st', 'Stone', 'st'),
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    defaultFrom: 'gal_us',
    defaultTo: 'l',
    units: [
      linear(0.001)('ml', 'Milliliter', 'ml'),
      linear(1)('l', 'Liter', 'l'),
      linear(1000)('m3', 'Cubic meter', 'm³'),
      linear(GALLON_US / 768)('tsp', 'Teaspoon (US)', 'tsp'),
      linear(GALLON_US / 256)('tbsp', 'Tablespoon (US)', 'tbsp'),
      linear(GALLON_US / 128)('floz_us', 'Fluid ounce (US)', 'fl oz'),
      linear(GALLON_US / 16)('cup_us', 'Cup (US)', 'cup'),
      linear(GALLON_US / 8)('pt_us', 'Pint (US)', 'pt'),
      linear(GALLON_US / 4)('qt_us', 'Quart (US)', 'qt'),
      linear(GALLON_US)('gal_us', 'Gallon (US)', 'gal'),
      linear(GALLON_UK)('gal_uk', 'Gallon (UK)', 'gal UK'),
    ],
  },
  {
    id: 'area',
    name: 'Area',
    defaultFrom: 'acre',
    defaultTo: 'm2',
    units: [
      linear(1e-6)('mm2', 'Square millimeter', 'mm²'),
      linear(1e-4)('cm2', 'Square centimeter', 'cm²'),
      linear(1)('m2', 'Square meter', 'm²'),
      linear(1e4)('ha', 'Hectare', 'ha'),
      linear(1e6)('km2', 'Square kilometer', 'km²'),
      linear(INCH * INCH)('in2', 'Square inch', 'in²'),
      linear(FOOT * FOOT)('ft2', 'Square foot', 'ft²'),
      linear(YARD * YARD)('yd2', 'Square yard', 'yd²'),
      linear(ACRE)('acre', 'Acre', 'ac'),
      linear(MILE * MILE)('mi2', 'Square mile', 'mi²'),
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    defaultFrom: 'mph',
    defaultTo: 'kmh',
    units: [
      linear(1)('ms', 'Meter per second', 'm/s'),
      linear(1000 / 3600)('kmh', 'Kilometer per hour', 'km/h'),
      linear(MILE / 3600)('mph', 'Mile per hour', 'mph'),
      linear(1852 / 3600)('knot', 'Knot', 'kn'),
      linear(FOOT)('fts', 'Foot per second', 'ft/s'),
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    defaultFrom: 'f',
    defaultTo: 'c',
    units: [
      { id: 'c', label: 'Celsius', symbol: '°C', toBase: v => v, fromBase: v => v },
      {
        id: 'f',
        label: 'Fahrenheit',
        symbol: '°F',
        toBase: v => ((v - 32) * 5) / 9,
        fromBase: v => (v * 9) / 5 + 32,
      },
      { id: 'k', label: 'Kelvin', symbol: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    ],
  },
];

export function getCategory(id: string): UnitCategory | undefined {
  return UNIT_CATEGORIES.find(c => c.id === id);
}

export function getUnit(categoryId: string, unitId: string): Unit | undefined {
  return getCategory(categoryId)?.units.find(u => u.id === unitId);
}

export function convert(categoryId: string, fromId: string, toId: string, value: number): number {
  const from = getUnit(categoryId, fromId);
  const to = getUnit(categoryId, toId);
  if (!from || !to) return NaN;
  return to.fromBase(from.toBase(value));
}
