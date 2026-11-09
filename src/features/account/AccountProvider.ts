import type {
  AccountKind,
  AccountProfile,
  AccountProfilePatch,
  AccountSession,
  LocalUsageBudget,
} from "./accountTypes.ts";

/**
 * Swappable account backend. LocalAccountProvider is the current default;
 * a future CloudAccountProvider can implement the same contract.
 */
export interface AccountProvider {
  kind(): AccountKind;
  authLabel(): string;
  getSession(): AccountSession;
  getProfile(): AccountProfile;
  updateProfile(patch: AccountProfilePatch): AccountProfile;
  getUsageBudget(): LocalUsageBudget;
  setTokenBudget(budget: number | null): LocalUsageBudget;
}
