import { Role } from '../enums/role.enum';

export interface ActiveUserData {
  id: string;
  email: string;
  username: string;
  role: Role;
}
