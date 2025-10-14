import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import glob from 'fast-glob';

const MUTATING = /\.(insert|update|delete)\(/;

describe('client code uses RPCs for writes', () => {
  it('no direct insert/update/delete on tables', async () => {
    const files = await glob(['src/**/*.ts','src/**/*.tsx'], { ignore: ['**/__tests__/**']});
    const offenders = files
      .map(f => [f, readFileSync(f,'utf8') as string] as const)
      .filter(([,text]) => /\.from\(['"][\w_]+'['"]\)/.test(text) && MUTATING.test(text));
    expect(offenders, `Direct writes found:\n${offenders.map(([f])=>f).join('\n')}`).toEqual([]);
  });
});

