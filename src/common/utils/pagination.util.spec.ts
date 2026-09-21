import { toSkipTake } from './pagination.util';

describe('toSkipTake', () => {
  it('renvoie undefined si aucune pagination n’est fournie (comportement inchangé)', () => {
    expect(toSkipTake(undefined)).toBeUndefined();
    expect(toSkipTake({})).toBeUndefined();
  });

  it('renvoie undefined si seul page est fourni', () => {
    expect(toSkipTake({ page: 2 })).toBeUndefined();
  });

  it('renvoie undefined si seul limit est fourni', () => {
    expect(toSkipTake({ limit: 10 })).toBeUndefined();
  });

  it('calcule skip/take correctement pour la première page', () => {
    expect(toSkipTake({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it('calcule skip/take correctement pour une page ultérieure', () => {
    expect(toSkipTake({ page: 3, limit: 10 })).toEqual({
      skip: 20,
      take: 10,
    });
  });
});
