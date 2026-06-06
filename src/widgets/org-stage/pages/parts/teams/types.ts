export type Member = { id: string; name: string; email: string; avatar: string; role: 'lead' | 'member' };
export type CodePath = { id: string; pattern: string; auto: boolean };
export type Team = {
  id: string;
  name: string;
  handle: string;
  description: string;
  members: Member[];
  paths: CodePath[];
  notifChannel: string;
  createdAt: string;
};
