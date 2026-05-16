// Absolute bounds for the projection horizon. The actual range is per-scenario
// (input.startYear / input.endYear); these just keep UI inputs sane.
export const MIN_YEAR = 1990;
export const MAX_YEAR = 2150;

export const EARLY_WITHDRAWAL_PENALTY_RATE = 0.10;
// IRS rule: the 10% penalty on Roth/IRA withdrawals ends at age 59½. We
// approximate that as the calendar year the account holder turns 60.
export const EARLY_WITHDRAWAL_PENALTY_AGE = 60;
export const earlyWithdrawalCutoff = (birthYear: number): number =>
  birthYear + EARLY_WITHDRAWAL_PENALTY_AGE;
