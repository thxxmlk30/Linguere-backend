import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/**
 * Convertit page/limit en skip/take TypeORM. `undefined` si l'un des deux
 * champs est absent : le service doit alors renvoyer la liste complete,
 * exactement comme avant l'ajout de la pagination (pas de rupture de
 * contrat pour les clients existants qui n'envoient pas ces paramètres).
 */
export function toSkipTake(
  pagination?: PaginationQueryDto,
): { skip: number; take: number } | undefined {
  if (!pagination?.page || !pagination?.limit) {
    return undefined;
  }

  return {
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  };
}
