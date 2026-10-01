# @jbrowse/quick-lru

Fork of [quick-lru](https://github.com/sindresorhus/quick-lru) with CJS and ESM
builds, written in TypeScript.

## Differences from upstream

- Does not extend `Map`, so `instanceof Map` is `false`
- Iteration, `keys()`, `values()`, `entries()` and `forEach()` all run oldest
  first
- `set()` on a key in the older generation no longer fires `onEviction` for it
  at the next rotation
- `maxAge` must be greater than 0; negative values and `NaN` throw
