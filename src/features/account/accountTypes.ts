export type AccountKind = "local" | "cloud";

export interface AccountProfile {
  id: string;
  displayName: string;
  avatarInitials: string;
  bio: string;
  kind: AccountKind;
  createdAt: number;
  updatedAt: number;
}

export interface AccountProfilePatch {
  displayName?: string;
  avatarInitials?: string;
  bio?: string;
}

/** Local-only usage / budget placeholder (no cloud billing). */
export interface LocalUsageBudget {
  mode: "local";
  tokensUsed: number;
  tokenBudget: number | null;
  budgetLabel: string;
  note: string;
}

export interface AccountSession {
  profile: AccountProfile;
  signedIn: true;
  authLabel: string;
}
