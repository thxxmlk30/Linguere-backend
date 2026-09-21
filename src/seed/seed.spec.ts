import { shouldSkipSeed } from './seed';

describe('shouldSkipSeed', () => {
  it('ignore le seed en production sans SEED_FORCE', () => {
    expect(shouldSkipSeed({ NODE_ENV: 'production' })).toBe(true);
  });

  it('exécute le seed en production si SEED_FORCE=true', () => {
    expect(shouldSkipSeed({ NODE_ENV: 'production', SEED_FORCE: 'true' })).toBe(
      false,
    );
  });

  it('exécute le seed hors production', () => {
    expect(shouldSkipSeed({ NODE_ENV: 'development' })).toBe(false);
    expect(shouldSkipSeed({ NODE_ENV: 'test' })).toBe(false);
    expect(shouldSkipSeed({})).toBe(false);
  });
});
