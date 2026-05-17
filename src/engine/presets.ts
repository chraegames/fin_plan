import type { PlanInput } from '../models/types';

export type PresetKey = 'coast' | 'mid' | 'approaching';

export interface PresetMeta {
  key: PresetKey;
  name: string;
  meta: string;
  horizon: string;
  tone: 'positive' | 'neutral' | 'caution';
  values: number[];
}

export const PRESET_META: PresetMeta[] = [
  {
    key: 'coast',
    name: 'Coast FIRE',
    meta: 'Age 35 · $400K · 55 years',
    horizon: '2026 → 2081',
    tone: 'positive',
    values: [400, 480, 590, 720, 880, 1080, 1330, 1640, 2020, 2470, 3010, 3680, 4470, 5410, 6500],
  },
  {
    key: 'mid',
    name: 'Mid-career',
    meta: 'Age 45 · $1.2M · 45 years',
    horizon: '2026 → 2071',
    tone: 'neutral',
    values: [1200, 1320, 1450, 1590, 1740, 1900, 2070, 2240, 2410, 2570, 2700, 2790, 2800, 2750, 2620],
  },
  {
    key: 'approaching',
    name: 'Approaching retirement',
    meta: 'Age 58 · $2.4M · 32 years',
    horizon: '2026 → 2058',
    tone: 'caution',
    values: [2400, 2520, 2620, 2680, 2700, 2660, 2580, 2450, 2270, 2050, 1780, 1450, 1080, 660, 200],
  },
];

export function buildPresetInput(preset: PresetKey): PlanInput {
  const startYear = new Date().getFullYear();
  switch (preset) {
    case 'coast': {
      const endYear = startYear + 55;
      const birthYear = startYear - 35;
      return {
        startYear,
        endYear,
        birthYear,
        startingCash: 20000,
        brokerageBalance: 180000,
        brokerageBasis: 160000,
        rothBalance: 90000,
        iraBalance: 110000,
        returnRate: 0.07,
        inflationRate: 0.03,
        targetCash: 40000,
        incomes: [
          {
            id: 'inc-1',
            name: 'Salary',
            type: 'taxable',
            periods: [{ startYear, endYear: birthYear + 60, amount: 95000 }],
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            name: 'Living expenses',
            frequency: 'monthly',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 3500 }],
          },
          {
            id: 'exp-2',
            name: 'Housing',
            frequency: 'monthly',
            applyInflation: false,
            periods: [{ startYear, endYear: startYear + 25, amount: 1800 }],
          },
          {
            id: 'exp-3',
            name: 'Health insurance',
            frequency: 'monthly',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 450 }],
          },
        ],
        withdrawals: [],
      };
    }
    case 'mid': {
      const endYear = startYear + 45;
      const birthYear = startYear - 45;
      return {
        startYear,
        endYear,
        birthYear,
        startingCash: 100000,
        brokerageBalance: 800000,
        brokerageBasis: 550000,
        rothBalance: 450000,
        iraBalance: 650000,
        returnRate: 0.06,
        inflationRate: 0.03,
        targetCash: 100000,
        incomes: [
          {
            id: 'inc-1',
            name: 'Salary',
            type: 'taxable',
            periods: [{ startYear, endYear: birthYear + 60, amount: 180000 }],
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            name: 'Living expenses',
            frequency: 'monthly',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 6500 }],
          },
          {
            id: 'exp-2',
            name: 'Housing',
            frequency: 'monthly',
            applyInflation: false,
            periods: [{ startYear, endYear: startYear + 20, amount: 3200 }],
          },
          {
            id: 'exp-3',
            name: 'Health insurance',
            frequency: 'monthly',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 800 }],
          },
          {
            id: 'exp-4',
            name: 'Travel',
            frequency: 'annual',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 12000 }],
          },
        ],
        withdrawals: [],
      };
    }
    case 'approaching': {
      const endYear = startYear + 32;
      const birthYear = startYear - 58;
      return {
        startYear,
        endYear,
        birthYear,
        startingCash: 200000,
        brokerageBalance: 1400000,
        brokerageBasis: 900000,
        rothBalance: 800000,
        iraBalance: 1200000,
        returnRate: 0.06,
        inflationRate: 0.03,
        targetCash: 150000,
        incomes: [
          {
            id: 'inc-1',
            name: 'Salary',
            type: 'taxable',
            periods: [{ startYear, endYear: startYear + 4, amount: 220000 }],
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            name: 'Living expenses',
            frequency: 'monthly',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 7500 }],
          },
          {
            id: 'exp-2',
            name: 'Health insurance',
            frequency: 'monthly',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 1100 }],
          },
          {
            id: 'exp-3',
            name: 'Travel',
            frequency: 'annual',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 20000 }],
          },
          {
            id: 'exp-4',
            name: 'Property tax',
            frequency: 'annual',
            applyInflation: true,
            periods: [{ startYear, endYear, amount: 15000 }],
          },
        ],
        withdrawals: [],
      };
    }
  }
}
