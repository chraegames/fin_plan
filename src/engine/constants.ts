// Absolute bounds for the projection horizon. The actual range is per-scenario
// (input.startYear / input.endYear); these just keep UI inputs sane.
export const MIN_YEAR = 1990;
export const MAX_YEAR = 2150;

export const EARLY_WITHDRAWAL_PENALTY_RATE = 0.10;
// Penalty-free withdrawals begin the calendar year the account holder
// turns 60. This is a year-granular approximation of the IRS 59½ rule —
// since we don't capture birth month, mid-year precision isn't possible
// without a new input. Conservative for users born early in the year
// (delays penalty-free by ~6 months); exact for users born in December.
export const EARLY_WITHDRAWAL_PENALTY_AGE = 60;
export const earlyWithdrawalCutoff = (birthYear: number): number =>
  birthYear + EARLY_WITHDRAWAL_PENALTY_AGE;
