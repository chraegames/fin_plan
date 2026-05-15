export const START_YEAR = 2026;
export const END_YEAR = 2065;
export const EARLY_WITHDRAWAL_PENALTY_RATE = 0.10;
// IRS rule: the 10% penalty on Roth/IRA withdrawals ends at age 59½. We
// approximate that as the calendar year the account holder turns 60.
export const EARLY_WITHDRAWAL_PENALTY_AGE = 60;
export const earlyWithdrawalCutoff = (birthYear: number): number =>
  birthYear + EARLY_WITHDRAWAL_PENALTY_AGE;
export const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
