export type Role = 'owner' | 'admin' | 'member' | 'billing' | 'guest';
export type Status = 'active' | 'invited' | 'deactivated';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  team: string;
  lastActive: string;
  avatar: string;
  twoFA: boolean;
};
