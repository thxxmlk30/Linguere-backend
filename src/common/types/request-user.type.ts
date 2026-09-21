import { Role } from '../enums/role.enum';

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  // Renseigne uniquement si ce compte est lie a une fiche Staff (RH),
  // via POST /staff/:id/provision-account. null pour un client ou un
  // admin non lie a une fiche.
  staffId: string | null;
}
