export interface Options<KeyType, ValueType> {
  /**
   * The target maximum number of items before evicting the least recently used items.
   *
   * __Note:__ The cache keeps two generations of items to avoid expensive deletes, so it can hold up to `2 × maxSize` items, though `size` never reports more than `maxSize`.
   */
  readonly maxSize: number

  /**
   * The maximum number of milliseconds an item should remain in the cache. Items expire lazily, on the next read or write that touches them.
   *
   * Individual items can override it with `set(key, value, {maxAge})`.
   *
   * @default Infinity
   */
  readonly maxAge?: number

  /**
   * Called when an item leaves the cache due to LRU pressure, TTL expiration, `resize()` or `evict()`. Useful for cleaning up items like object URLs (`revokeObjectURL`).
   *
   * It is not called for `delete()`, `clear()`, or when `set()` overwrites an existing key.
   */
  onEviction?: (key: KeyType, value: ValueType) => void
}

interface Item<ValueType> {
  value: ValueType
  expiry?: number
}

function assertPositive(name: string, value: number) {
  if (!(value > 0)) {
    throw new TypeError(`\`${name}\` must be a number greater than 0`)
  }
}

/**
 * Simple ["Least Recently Used" (LRU) cache](https://en.m.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29).
 *
 * The instance is an iterable of `[key, value]` pairs, oldest first.
 *
 * @example
 * ```
 * import QuickLRU from '@jbrowse/quick-lru'
 *
 * const lru = new QuickLRU({maxSize: 1000})
 *
 * lru.set('🦄', '🌈')
 *
 * lru.has('🦄')
 * //=> true
 *
 * lru.get('🦄')
 * //=> '🌈'
 * ```
 */
export default class QuickLRU<KeyType, ValueType> implements Iterable<
  [KeyType, ValueType]
> {
  #cache = new Map<KeyType, Item<ValueType>>()
  #oldCache = new Map<KeyType, Item<ValueType>>()
  #maxSize: number
  #maxAge: number
  #onEviction?: (key: KeyType, value: ValueType) => void

  constructor(options: Options<KeyType, ValueType>) {
    const maxAge = options.maxAge ?? Number.POSITIVE_INFINITY
    assertPositive('maxSize', options.maxSize)
    assertPositive('maxAge', maxAge)
    this.#maxSize = options.maxSize
    this.#maxAge = maxAge
    this.#onEviction = options.onEviction
  }

  #emitEvictions(items: Iterable<[KeyType, Item<ValueType>]>) {
    const onEviction = this.#onEviction
    if (onEviction) {
      for (const [key, item] of items) {
        onEviction(key, item.value)
      }
    }
  }

  #deleteIfExpired(key: KeyType, item: Item<ValueType>) {
    if (item.expiry !== undefined && item.expiry <= Date.now()) {
      this.#onEviction?.(key, item.value)
      this.delete(key)
      return true
    }
    return false
  }

  #valueIfFresh(key: KeyType, item: Item<ValueType>) {
    return this.#deleteIfExpired(key, item) ? undefined : item.value
  }

  #moveToRecent(key: KeyType, item: Item<ValueType>) {
    this.#oldCache.delete(key)
    this.#cache.set(key, item)

    if (this.#cache.size >= this.#maxSize) {
      const evicted = this.#oldCache
      this.#oldCache = this.#cache
      this.#cache = new Map()
      this.#emitEvictions(evicted)
    }
  }

  #replaceWith(items: [KeyType, Item<ValueType>][]) {
    this.#oldCache = new Map(items)
    this.#cache = new Map()
  }

  *#liveItemsAscending(): Generator<[KeyType, Item<ValueType>]> {
    for (const cache of [this.#oldCache, this.#cache]) {
      for (const entry of cache) {
        if (!this.#deleteIfExpired(...entry)) {
          yield entry
        }
      }
    }
  }

  /**
   * Get an item, marking it as recently used.
   *
   * @returns The stored item or `undefined`.
   */
  get(key: KeyType): ValueType | undefined {
    const item = this.#cache.get(key)
    if (item) {
      return this.#valueIfFresh(key, item)
    }

    const oldItem = this.#oldCache.get(key)
    if (oldItem && !this.#deleteIfExpired(key, oldItem)) {
      this.#moveToRecent(key, oldItem)
      return oldItem.value
    }
    return undefined
  }

  /**
   * Set an item, marking it as recently used.
   *
   * The `maxAge` option overrides the cache-wide `maxAge` for this item.
   *
   * @returns The cache instance.
   */
  set(
    key: KeyType,
    value: ValueType,
    { maxAge = this.#maxAge }: { maxAge?: number } = {},
  ): this {
    const item = {
      value,
      expiry:
        maxAge === Number.POSITIVE_INFINITY ? undefined : Date.now() + maxAge,
    }

    if (this.#cache.has(key)) {
      this.#cache.set(key, item)
    } else {
      this.#moveToRecent(key, item)
    }
    return this
  }

  /** Check if an item exists, without marking it as recently used. */
  has(key: KeyType): boolean {
    const item = this.#cache.get(key) ?? this.#oldCache.get(key)
    return item !== undefined && !this.#deleteIfExpired(key, item)
  }

  /**
   * Get an item without marking it as recently used.
   *
   * @returns The stored item or `undefined`.
   */
  peek(key: KeyType): ValueType | undefined {
    const item = this.#cache.get(key) ?? this.#oldCache.get(key)
    return item ? this.#valueIfFresh(key, item) : undefined
  }

  /**
   * Get the remaining time to live of an item, in milliseconds. Neither marks the item as recently used nor removes it if expired, so the result may be negative.
   *
   * @returns The remaining milliseconds, `Infinity` if the item never expires, or `undefined` if it is not in the cache.
   */
  expiresIn(key: KeyType): number | undefined {
    const item = this.#cache.get(key) ?? this.#oldCache.get(key)
    if (item) {
      return item.expiry === undefined
        ? Number.POSITIVE_INFINITY
        : item.expiry - Date.now()
    }
    return undefined
  }

  /**
   * Delete an item.
   *
   * @returns `true` if the item was removed, `false` if it did not exist.
   */
  delete(key: KeyType): boolean {
    return this.#cache.delete(key) || this.#oldCache.delete(key)
  }

  /** Delete all items. */
  clear(): void {
    this.#cache.clear()
    this.#oldCache.clear()
  }

  /** Update `maxSize` in place, evicting the least recently used items if the cache no longer fits. */
  resize(maxSize: number): void {
    assertPositive('maxSize', maxSize)

    const items = [...this.#liveItemsAscending()]
    const removeCount = items.length - maxSize
    if (removeCount < 0) {
      this.#cache = new Map(items)
      this.#oldCache = new Map()
    } else {
      this.#emitEvictions(items.slice(0, removeCount))
      this.#replaceWith(items.slice(removeCount))
    }
    this.#maxSize = maxSize
  }

  /**
   * Evict the least recently used items. Always keeps at least one item.
   *
   * @param count - The number of items to evict.
   */
  evict(count = 1): void {
    if (!(count > 0)) {
      return
    }

    const items = [...this.#liveItemsAscending()]
    const evictCount = Math.trunc(Math.min(count, items.length - 1))
    if (evictCount > 0) {
      this.#emitEvictions(items.slice(0, evictCount))
      this.#replaceWith(items.slice(evictCount))
    }
  }

  /** The stored item count, capped at `maxSize`. */
  get size(): number {
    return Math.min(this.#cache.size + this.#oldCache.size, this.#maxSize)
  }

  get maxSize(): number {
    return this.#maxSize
  }

  get maxAge(): number {
    return this.#maxAge
  }

  /** Iterate over all entries, oldest first. */
  *entriesAscending(): IterableIterator<[KeyType, ValueType]> {
    for (const [key, item] of this.#liveItemsAscending()) {
      yield [key, item.value]
    }
  }

  /** Iterate over all entries, newest first. */
  *entriesDescending(): IterableIterator<[KeyType, ValueType]> {
    for (const cache of [this.#cache, this.#oldCache]) {
      for (const [key, item] of [...cache].reverse()) {
        if (!this.#deleteIfExpired(key, item)) {
          yield [key, item.value]
        }
      }
    }
  }

  /** Iterate over all entries, oldest first. Alias for `entriesAscending()`. */
  entries(): IterableIterator<[KeyType, ValueType]> {
    return this.entriesAscending()
  }

  [Symbol.iterator](): IterableIterator<[KeyType, ValueType]> {
    return this.entriesAscending()
  }

  *keys(): IterableIterator<KeyType> {
    for (const [key] of this) {
      yield key
    }
  }

  *values(): IterableIterator<ValueType> {
    for (const [, value] of this) {
      yield value
    }
  }

  forEach(
    callbackFunction: (
      value: ValueType,
      key: KeyType,
      map: QuickLRU<KeyType, ValueType>,
    ) => void,
    thisArgument: unknown = this,
  ): void {
    for (const [key, value] of this) {
      callbackFunction.call(thisArgument, value, key, this)
    }
  }

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get [Symbol.toStringTag](): string {
    return 'QuickLRU'
  }

  toString(): string {
    return `QuickLRU(${this.size}/${this.maxSize})`
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.toString()
  }
}
