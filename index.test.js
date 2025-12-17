import { setTimeout as delay } from 'node:timers/promises'
import { test, expect } from 'vitest'
import QuickLRU from './index.js'

const lruWithDuplicates = () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('key', 'value')
	lru.set('keyDupe', 1)
	lru.set('keyDupe', 2)
	return lru
}

test('main', () => {
	expect(() => {
		new QuickLRU() // eslint-disable-line no-new
	}).toThrow(/maxSize/)
})

test('maxAge: throws on invalid value', () => {
	expect(() => {
		new QuickLRU({ maxSize: 10, maxAge: 0 }) // eslint-disable-line no-new
	}).toThrow(/maxAge/)
})

test('.get() / .set()', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('foo', 1)
	const setReturnValue = lru.set('bar', 2)
	expect(setReturnValue).toBe(lru)
	expect(lru.get('foo')).toBe(1)
	expect(lru.size).toBe(2)
})

test('.get() - limit', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	expect(lru.get('1')).toBe(1)
	expect(lru.get('3')).toBe(undefined)
	lru.set('3', 3)
	lru.get('1')
	lru.set('4', 4)
	lru.get('1')
	lru.set('5', 5)
	expect(lru.has('1')).toBe(true)
})

test('.set() - limit', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('foo', 1)
	lru.set('bar', 2)
	expect(lru.get('foo')).toBe(1)
	expect(lru.get('bar')).toBe(2)
	lru.set('baz', 3)
	lru.set('faz', 4)
	expect(lru.has('foo')).toBe(false)
	expect(lru.has('bar')).toBe(false)
	expect(lru.has('baz')).toBe(true)
	expect(lru.has('faz')).toBe(true)
	expect(lru.size).toBe(2)
})

test('.set() - update item', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('foo', 1)
	expect(lru.get('foo')).toBe(1)
	lru.set('foo', 2)
	expect(lru.get('foo')).toBe(2)
	expect(lru.size).toBe(1)
})

test('.has()', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('foo', 1)
	expect(lru.has('foo')).toBe(true)
})

test('.peek()', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	expect(lru.peek('1')).toBe(1)
	lru.set('2', 2)
	expect(lru.peek('1')).toBe(1)
	expect(lru.peek('3')).toBe(undefined)
	lru.set('3', 3)
	lru.set('4', 4)
	expect(lru.has('1')).toBe(false)
})

test('expiresIn() returns undefined for missing key', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	expect(lru.expiresIn('nope')).toBe(undefined)
})

test('expiresIn() returns Infinity when no maxAge', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('infinity', 'no ttl given')
	expect(lru.expiresIn('infinity')).toBe(Number.POSITIVE_INFINITY)
})

test('expiresIn() returns remaining ms for expiring item', async () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('100ms', 'ttl given', { maxAge: 100 })
	expect(lru.expiresIn('100ms')).toBe(100)
	await delay(50)
	const remainingMs = lru.expiresIn('100ms')
	expect(remainingMs > 40 && remainingMs < 60).toBe(true)
})

test('expiresIn() returns <= 0 when expired and does not evict', async () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('short', 'value', { maxAge: 20 })
	await delay(30)
	const remainingMs = lru.expiresIn('short')
	expect(remainingMs <= 0).toBe(true)
})

test('.delete()', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('foo', 1)
	lru.set('bar', 2)
	expect(lru.delete('foo')).toBe(true)
	expect(lru.has('foo')).toBe(false)
	expect(lru.has('bar')).toBe(true)
	expect(lru.delete('foo')).toBe(false)
	expect(lru.size).toBe(1)
})

test('.delete() - limit', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('foo', 1)
	lru.set('bar', 2)
	expect(lru.size).toBe(2)
	expect(lru.delete('foo')).toBe(true)
	expect(lru.has('foo')).toBe(false)
	expect(lru.has('bar')).toBe(true)
	lru.delete('bar')
	expect(lru.size).toBe(0)
})

test('.clear()', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('foo', 1)
	lru.set('bar', 2)
	lru.set('baz', 3)
	lru.clear()
	expect(lru.size).toBe(0)
})

test('.keys()', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	expect([...lru.keys()].sort()).toEqual(['1', '2', '3'])
})

test('.keys() - accounts for duplicates', () => {
	const lru = lruWithDuplicates()
	expect([...lru.keys()].sort()).toEqual(['key', 'keyDupe'])
})

test('.values()', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	expect([...lru.values()].sort()).toEqual([1, 2, 3])
})

test('.values() - accounts for duplicates', () => {
	const lru = lruWithDuplicates()
	expect([...lru.values()].sort()).toEqual([2, 'value'])
})

test('.[Symbol.iterator]()', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	expect([...lru].sort()).toEqual([
		['1', 1],
		['2', 2],
		['3', 3],
	])
})

test('.[Symbol.iterator]() - accounts for duplicates', () => {
	const lru = lruWithDuplicates()
	expect([...lru].sort()).toEqual([
		['key', 'value'],
		['keyDupe', 2],
	])
})

test('.size', () => {
	const lru = new QuickLRU({ maxSize: 100 })
	lru.set('1', 1)
	lru.set('2', 2)
	expect(lru.size).toBe(2)
	lru.delete('1')
	expect(lru.size).toBe(1)
	lru.set('3', 3)
	expect(lru.size).toBe(2)
})

test('.size - accounts for duplicates', () => {
	const lru = lruWithDuplicates()
	expect(lru.size).toBe(2)
})

test('max size', () => {
	const lru = new QuickLRU({ maxSize: 3 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	expect(lru.size).toBe(3)
	lru.set('4', 4)
	expect(lru.size).toBe(3)
})

test('.maxSize', () => {
	const maxSize = 100
	const lru = new QuickLRU({ maxSize })
	expect(lru.maxSize).toBe(maxSize)
})

test('.maxAge', () => {
	const lru = new QuickLRU({ maxSize: 1 })
	expect(lru.maxAge).toBe(Number.POSITIVE_INFINITY)
})

test('checks total cache size does not exceed `maxSize`', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.get('1')
	expect(lru.__oldCache.has('1')).toBe(false)
})

test('`onEviction` is called after `maxSize` is exceeded', () => {
	const expectedKey = '1'
	const expectedValue = 1
	let evictionCalled = false
	let actualKey
	let actualValue

	const onEviction = (key, value) => {
		actualKey = key
		actualValue = value
		evictionCalled = true
	}

	const lru = new QuickLRU({ maxSize: 1, onEviction })
	lru.set(expectedKey, expectedValue)
	lru.set('2', 2)
	expect(actualKey).toBe(expectedKey)
	expect(actualValue).toBe(expectedValue)
	expect(evictionCalled).toBe(true)
})

test('set(maxAge): an item can have a custom expiration', async () => {
	const lru = new QuickLRU({ maxSize: 10 })
	lru.set('1', 'test', { maxAge: 100 })
	await delay(200)
	expect(lru.has('1')).toBe(false)
})

test('set(maxAge): items without expiration never expire', async () => {
	const lru = new QuickLRU({ maxSize: 10 })
	lru.set('1', 'test', { maxAge: 100 })
	lru.set('2', 'boo')
	await delay(200)
	expect(lru.has('1')).toBe(false)
	await delay(200)
	expect(lru.has('2')).toBe(true)
})

test('set(maxAge): ignores non-numeric maxAge option', async () => {
	const lru = new QuickLRU({ maxSize: 10 })
	lru.set('1', 'test', 'string')
	lru.set('2', 'boo')
	await delay(200)
	expect(lru.has('1')).toBe(true)
	await delay(200)
	expect(lru.has('2')).toBe(true)
})

test('set(maxAge): per-item maxAge overrides global maxAge', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 1000 })
	lru.set('1', 'test', { maxAge: 100 })
	lru.set('2', 'boo')
	await delay(300)
	expect(lru.has('1')).toBe(false)
	await delay(200)
	expect(lru.has('2')).toBe(true)
})

test('set(maxAge): setting the same key refreshes expiration', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 150 })
	lru.set('1', 'test')
	await delay(100)
	lru.set('1', 'test')
	await delay(100)
	expect(lru.has('1')).toBe(true)
})

test('set(maxAge): is returned by getter', () => {
	const maxAge = 100
	const lru = new QuickLRU({ maxSize: 1, maxAge })
	expect(lru.maxAge).toBe(maxAge)
})

test('maxAge: get() removes an expired item', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 90 })
	lru.set('1', 'test')
	await delay(200)
	expect(lru.get('1')).toBe(undefined)
})

test('maxAge: non-recent items can also expire', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', 'test1')
	lru.set('2', 'test2')
	lru.set('3', 'test4')
	await delay(200)
	expect(lru.get('1')).toBe(undefined)
})

test('maxAge: setting the same key refreshes expiration', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', 'test')
	await delay(50)
	lru.set('1', 'test2')
	await delay(50)
	expect(lru.get('1')).toBe('test2')
})

test('maxAge: setting an item with a local expiration', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', 'test')
	lru.set('2', 'test2', { maxAge: 500 })
	await delay(200)
	expect(lru.has('2')).toBe(true)
	await delay(300)
	expect(lru.has('2')).toBe(false)
})

test('maxAge: empty options object uses global maxAge', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', 'test')
	lru.set('2', 'test2', {})
	await delay(200)
	expect(lru.has('2')).toBe(false)
})

test('maxAge: calls onEviction for expired recent item', async () => {
	const expectedKey = '1'
	const expectedValue = 'test'

	let evictionCalled = false
	let actualKey
	let actualValue
	const onEviction = (key, value) => {
		evictionCalled = true
		actualKey = key
		actualValue = value
	}

	const lru = new QuickLRU({
		maxSize: 2,
		maxAge: 100,
		onEviction,
	})

	lru.set(expectedKey, expectedValue)

	await delay(200)

	expect(lru.get('1')).toBe(undefined)
	expect(evictionCalled).toBe(true)
	expect(actualKey).toBe(expectedKey)
	expect(actualValue).toBe(expectedValue)
}, 1000)

test('maxAge: calls onEviction for expired non-recent items', async () => {
	const expectedKeys = ['1', '2']
	const expectedValues = ['test', 'test2']

	let evictionCalled = false
	const actualKeys = []
	const actualValues = []
	const onEviction = (key, value) => {
		evictionCalled = true
		actualKeys.push(key)
		actualValues.push(value)
	}

	const lru = new QuickLRU({
		maxSize: 2,
		maxAge: 100,
		onEviction,
	})

	lru.set('1', 'test')
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	lru.set('4', 'test4')
	lru.set('5', 'test5')

	await delay(200)

	expect(lru.get('1')).toBe(undefined)
	expect(evictionCalled).toBe(true)
	expect(actualKeys).toEqual(expectedKeys)
	expect(actualValues).toEqual(expectedValues)
}, 1000)

test('maxAge: evicts expired items on resize', async () => {
	const expectedKeys = ['1', '2', '3']
	const expectedValues = ['test', 'test2', 'test3']

	let evictionCalled = false
	const actualKeys = []
	const actualValues = []
	const onEviction = (key, value) => {
		evictionCalled = true
		actualKeys.push(key)
		actualValues.push(value)
	}

	const lru = new QuickLRU({
		maxSize: 3,
		maxAge: 100,
		onEviction,
	})

	lru.set('1', 'test')
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	lru.set('4', 'test4')
	lru.set('5', 'test5')

	lru.resize(2)

	await delay(200)

	expect(lru.has('1')).toBe(false)
	expect(evictionCalled).toBe(true)
	expect(actualKeys).toEqual(expectedKeys)
	expect(actualValues).toEqual(expectedValues)
}, 1000)

test('maxAge: peek() returns non-expired items', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 400 })
	lru.set('1', 'test')
	await delay(200)
	expect(lru.peek('1')).toBe('test')
})

test('maxAge: peek() lazily removes expired recent items', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 100 })
	lru.set('1', 'test')
	await delay(200)
	expect(lru.peek('1')).toBe(undefined)
})

test('maxAge: peek() lazily removes expired non-recent items', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', 'test')
	lru.set('2', 'test')
	lru.set('3', 'test')
	await delay(200)
	expect(lru.peek('1')).toBe(undefined)
})

test('maxAge: non-recent items not expired are valid', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 200 })
	lru.set('1', 'test')
	lru.set('2', 'test2')
	lru.set('3', 'test4')
	await delay(100)
	expect(lru.get('1')).toBe('test')
})

test('maxAge: has() deletes expired items and returns false', async () => {
	const lru = new QuickLRU({ maxSize: 4, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test')
	lru.set('3', 'test')
	await delay(200)
	expect(lru.has('1')).toBe(false)
})

test('maxAge: has() returns true when not expired', () => {
	const lru = new QuickLRU({ maxSize: 4, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test')
	lru.set('3', 'test')
	expect(lru.has('1')).toBe(true)
})

test('maxAge: has() returns true for undefined values with expiration', () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test')
	lru.set('3', 'test')
	expect(lru.has('1')).toBe(true)
})

test('maxAge: keys() returns only non-expired keys', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'loco')

	expect([...lru.keys()].sort()).toEqual(['4'])
})

test('maxAge: keys() returns empty when all items expired', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)

	expect([...lru.keys()].sort()).toEqual([])
})

test('maxAge: values() returns empty when all items expired', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)

	expect([...lru.values()].sort()).toEqual([])
})

test('maxAge: values() returns only non-expired values', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('5', 'loco')

	expect([...lru.values()].sort()).toEqual(['loco'])
})

test('maxAge: entriesDescending() excludes expired entries', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entriesDescending()]).toEqual([
		['5', 'loco'],
		['4', 'coco'],
	])
})

test('maxAge: entriesDescending() excludes expired entries from old cache', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entriesDescending()]).toEqual([
		['5', 'loco'],
		['4', 'coco'],
	])
})

test('maxAge: entriesDescending() returns all non-expired entries in order', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 5000 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entriesDescending()]).toEqual([
		['5', 'loco'],
		['4', 'coco'],
		['3', 'test3'],
		['2', 'test2'],
		['1', undefined],
	])
})

test('maxAge: entriesAscending() excludes expired entries', async () => {
	const lru = new QuickLRU({ maxSize: 5, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entriesAscending()]).toEqual([
		['4', 'coco'],
		['5', 'loco'],
	])
})

test('maxAge: entriesAscending() excludes expired non-recent entries', async () => {
	const lru = new QuickLRU({ maxSize: 3, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entriesAscending()]).toEqual([
		['4', 'coco'],
		['5', 'loco'],
	])
})

test('maxAge: entriesAscending() returns only non-expired entries', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	await delay(200)
	lru.set('3', 'test3')
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entriesAscending()]).toEqual([
		['3', 'test3'],
		['4', 'coco'],
		['5', 'loco'],
	])
})

test('maxAge: entries() returns only non-expired entries', async () => {
	const lru = new QuickLRU({ maxSize: 10, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	await delay(200)
	lru.set('3', 'test3')
	lru.set('4', 'coco')
	lru.set('5', 'loco')

	expect([...lru.entries()]).toEqual([
		['3', 'test3'],
		['4', 'coco'],
		['5', 'loco'],
	])
})

test('maxAge: forEach() excludes expired entries', async () => {
	const lru = new QuickLRU({ maxSize: 5, maxAge: 100 })
	lru.set('1', undefined)
	lru.set('2', 'test2')
	lru.set('3', 'test3')
	await delay(200)
	lru.set('4', 'coco')
	lru.set('5', 'loco')
	const entries = []

	for (const [key, value] of lru.entries()) {
		entries.push([key, value])
	}

	expect(entries).toEqual([
		['4', 'coco'],
		['5', 'loco'],
	])
})

test('maxAge: iterator excludes expired items', async () => {
	const lru = new QuickLRU({ maxSize: 2, maxAge: 100 })
	lru.set('key', 'value')
	lru.set('key3', 1)
	await delay(200)
	lru.set('key4', 2)

	expect([...lru].sort()).toEqual([['key4', 2]])
})

test('maxAge: iterator excludes expired items from old cache', async () => {
	const lru = new QuickLRU({ maxSize: 1, maxAge: 100 })
	lru.set('keyunique', 'value')
	lru.set('key3unique', 1)
	lru.set('key4unique', 2)
	await delay(200)

	expect([...lru].sort()).toEqual([])
})

test('entriesAscending enumerates cache items oldest-first', () => {
	const lru = new QuickLRU({ maxSize: 3 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	lru.set('3', 7)
	lru.set('2', 8)
	expect([...lru.entriesAscending()]).toEqual([
		['1', 1],
		['3', 7],
		['2', 8],
	])
})

test('entriesDescending enumerates cache items newest-first', () => {
	const lru = new QuickLRU({ maxSize: 3 })
	lru.set('t', 1)
	lru.set('q', 2)
	lru.set('a', 8)
	lru.set('t', 4)
	lru.set('v', 3)
	expect([...lru.entriesDescending()]).toEqual([
		['v', 3],
		['t', 4],
		['a', 8],
		['q', 2],
	])
})

test('entries enumerates cache items oldest-first', () => {
	const lru = new QuickLRU({ maxSize: 3 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	lru.set('3', 7)
	lru.set('2', 8)
	expect([...lru.entries()]).toEqual([
		['1', 1],
		['3', 7],
		['2', 8],
	])
})

test('forEach calls the cb function for each cache item oldest-first', () => {
	const lru = new QuickLRU({ maxSize: 3 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	lru.set('3', 7)
	lru.set('2', 8)
	const entries = []

	for (const [key, value] of lru.entries()) {
		entries.push([key, value])
	}

	expect(entries).toEqual([
		['1', 1],
		['3', 7],
		['2', 8],
	])
})

test('resize removes older items', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	lru.resize(1)
	expect(lru.peek('1')).toBe(undefined)
	expect(lru.peek('3')).toBe(3)
	lru.set('3', 4)
	expect(lru.peek('3')).toBe(4)
	lru.set('4', 5)
	expect(lru.peek('4')).toBe(5)
	expect(lru.peek('2')).toBe(undefined)
})

test('resize omits evictions', () => {
	const calls = []
	const onEviction = (...args) => calls.push(args)
	const lru = new QuickLRU({ maxSize: 2, onEviction })

	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	lru.resize(1)
	expect(calls.length > 0).toBe(true)
	expect(calls.some(([key]) => key === '1')).toBe(true)
})

test('resize increases capacity', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.resize(3)
	lru.set('3', 3)
	lru.set('4', 4)
	lru.set('5', 5)
	expect([...lru.entriesAscending()]).toEqual([
		['1', 1],
		['2', 2],
		['3', 3],
		['4', 4],
		['5', 5],
	])
})

test('resize does not conflict with the same number of items', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	lru.set('3', 3)
	lru.resize(3)
	lru.set('4', 4)
	lru.set('5', 5)
	expect([...lru.entriesAscending()]).toEqual([
		['1', 1],
		['2', 2],
		['3', 3],
		['4', 4],
		['5', 5],
	])
})

test('resize checks parameter bounds', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	expect(() => {
		lru.resize(-1)
	}).toThrow(/maxSize/)
})

test('function value', () => {
	const lru = new QuickLRU({ maxSize: 1 })
	let isCalled = false

	lru.set('fn', () => {
		isCalled = true
	})

	lru.get('fn')()
	expect(isCalled).toBe(true)
})

test('[Symbol.toStringTag] output', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	expect(lru[Symbol.toStringTag]).toBe('QuickLRU')
})

test('toString() works as expected', () => {
	const lru = new QuickLRU({ maxSize: 2 })
	lru.set('1', 1)
	lru.set('2', 2)
	expect(lru.toString()).toBe('QuickLRU(2/2)')
})

test('non-primitive key', () => {
	const lru = new QuickLRU({ maxSize: 99 })
	const key = ['foo', 'bar']
	const value = true
	lru.set(key, value)
	expect(lru.has(key)).toBe(true)
	expect(lru.get(key)).toBe(value)
})

test('handles circular references gracefully', () => {
	const lru = new QuickLRU({ maxSize: 2 })

	const object1 = { name: 'object1' }
	const object2 = { name: 'object2' }
	object1.ref = object2
	object2.ref = object1

	lru.set('key1', object1)
	lru.set('key2', object2)

	expect(() => {
		String(lru)
	}).not.toThrow()

	expect(lru.toString()).toBe('QuickLRU(2/2)')
	expect(Object.prototype.toString.call(lru)).toBe('[object QuickLRU]')
})

test('.evict() removes least recently used items', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)
	lru.set('d', 4)
	lru.set('e', 5)

	// Evict 2 least recently used items
	lru.evict(2)

	expect(lru.size).toBe(3)
	expect(lru.has('a')).toBe(false)
	expect(lru.has('b')).toBe(false)
	expect(lru.has('c')).toBe(true)
	expect(lru.has('d')).toBe(true)
	expect(lru.has('e')).toBe(true)
})

test('.evict() with accessed items changes order', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)
	lru.set('d', 4)
	lru.set('e', 5)

	// Access 'a' and 'b' to make them recently used
	lru.get('a')
	lru.get('b')

	// Should evict 'c' and 'd' (now the oldest)
	lru.evict(2)

	expect(lru.size).toBe(3)
	expect(lru.has('a')).toBe(true)
	expect(lru.has('b')).toBe(true)
	expect(lru.has('c')).toBe(false)
	expect(lru.has('d')).toBe(false)
	expect(lru.has('e')).toBe(true)
})

test('.evict() keeps at least one item', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	// Try to evict all items (should keep the most recent)
	lru.evict(10)

	expect(lru.size).toBe(1)
	expect(lru.has('c')).toBe(true)
})

test('.evict() triggers onEviction callback', () => {
	const evicted = []
	const lru = new QuickLRU({
		maxSize: 5,
		onEviction(key, value) {
			evicted.push({ key, value })
		},
	})

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	lru.evict(2)

	expect(evicted.length).toBe(2)
	expect(evicted[0]).toEqual({ key: 'a', value: 1 })
	expect(evicted[1]).toEqual({ key: 'b', value: 2 })
})

test('.evict() default count is 1', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	// Evict without parameter (should default to 1)
	lru.evict()

	expect(lru.size).toBe(2)
	expect(lru.has('a')).toBe(false)
	expect(lru.has('b')).toBe(true)
	expect(lru.has('c')).toBe(true)
})

test('.evict() with zero or negative count does nothing', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)

	const initialSize = lru.size

	lru.evict(0)
	expect(lru.size).toBe(initialSize)

	lru.evict(-5)
	expect(lru.size).toBe(initialSize)
})

test('.evict() on empty cache does nothing', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	expect(() => {
		lru.evict(5)
	}).not.toThrow()

	expect(lru.size).toBe(0)
})

test('.evict() respects maxSize after eviction', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)
	lru.set('d', 4)
	lru.set('e', 5)

	// Evict 2 items
	lru.evict(2)
	expect(lru.size).toBe(3)

	// Can still add up to maxSize
	lru.set('f', 6)
	lru.set('g', 7)
	expect(lru.size).toBe(5)

	// Adding more triggers normal LRU eviction
	lru.set('h', 8)
	lru.set('i', 9)
	expect(lru.size).toBe(5)
})

test('.evict() handles edge case inputs', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	// NaN should do nothing
	lru.evict(Number.NaN)
	expect(lru.size).toBe(3)

	// String "1" should be coerced to number 1
	lru.evict('1')
	expect(lru.size).toBe(2)

	// Undefined should use default of 1
	lru.evict(undefined)
	expect(lru.size).toBe(1)
	expect(lru.has('c')).toBe(true)
})

test('.evict() keeps at least one item with expired entries', async () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1, { maxAge: 1 }) // Will expire
	lru.set('b', 2, { maxAge: 1 }) // Will expire
	lru.set('c', 3) // Will not expire

	// Wait for expiration
	await delay(10)

	// Try to evict everything - should keep the one live item
	lru.evict(Number.POSITIVE_INFINITY)

	expect(lru.size).toBe(1)
	expect(lru.has('a')).toBe(false) // Expired
	expect(lru.has('b')).toBe(false) // Expired
	expect(lru.has('c')).toBe(true) // Only live item left
})

test('.evict() handles all items expired gracefully', async () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1, { maxAge: 1 }) // Will expire
	lru.set('b', 2, { maxAge: 1 }) // Will expire
	lru.set('c', 3, { maxAge: 1 }) // Will expire

	// Wait for all to expire
	await delay(10)

	// When all items are expired, evict should be a no-op
	lru.evict(1)

	expect(lru.size).toBe(0)
})

test('.evict() with mixed expiry and access patterns', async () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('fast1', 1, { maxAge: 5 }) // Expires quickly
	lru.set('slow1', 2, { maxAge: 100 }) // Expires slowly
	lru.set('fast2', 3, { maxAge: 5 }) // Expires quickly
	lru.set('slow2', 4, { maxAge: 100 }) // Expires slowly

	// Wait for fast items to expire
	await delay(10)

	// Access remaining items to change order
	lru.get('slow1')
	lru.get('slow2')

	// Should evict the oldest remaining live item
	lru.evict(1)

	expect(lru.size).toBe(1)
	expect(lru.has('fast1')).toBe(false) // Expired
	expect(lru.has('fast2')).toBe(false) // Expired
	expect(lru.has('slow1')).toBe(false) // Evicted (was oldest live)
	expect(lru.has('slow2')).toBe(true) // Remaining
})

test('.evict() with extremely large count values', () => {
	const lru = new QuickLRU({ maxSize: 3 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	// MAX_SAFE_INTEGER should work
	lru.evict(Number.MAX_SAFE_INTEGER)

	expect(lru.size).toBe(1)
	expect(lru.has('c')).toBe(true) // Most recent item kept
})

test('.evict() works with complex object values', () => {
	const evicted = []
	const lru = new QuickLRU({
		maxSize: 4,
		onEviction(key, value) {
			evicted.push({ key, value })
		},
	})

	const object1 = { data: 'test1', nested: { value: 1 } }
	const object2 = { data: 'test2', nested: { value: 2 } }
	const array1 = [1, 2, { nested: true }]
	const array2 = [4, 5, { nested: false }]

	lru.set('obj1', object1)
	lru.set('obj2', object2)
	lru.set('arr1', array1)
	lru.set('arr2', array2)

	lru.evict(2)

	expect(lru.size).toBe(2)
	expect(evicted.length).toBe(2)
	expect(evicted[0]).toEqual({ key: 'obj1', value: object1 })
	expect(evicted[1]).toEqual({ key: 'obj2', value: object2 })
	expect(lru.has('arr1')).toBe(true)
	expect(lru.has('arr2')).toBe(true)
})

test('.evict() with WeakMap/WeakSet values', () => {
	const lru = new QuickLRU({ maxSize: 3 })

	const weakMap = new WeakMap()
	const weakSet = new WeakSet()
	const object = {}

	lru.set('weakmap', weakMap)
	lru.set('weakset', weakSet)
	lru.set('object', object)

	lru.evict(1)

	expect(lru.size).toBe(2)
	expect(lru.has('weakmap')).toBe(false)
	expect(lru.has('weakset')).toBe(true)
	expect(lru.has('object')).toBe(true)
})

test('.evict() maintains cache integrity after multiple operations', () => {
	const lru = new QuickLRU({ maxSize: 10 })

	// Fill cache
	for (let i = 0; i < 8; i++) {
		lru.set(i, i)
	}

	// Mix of operations
	lru.delete(3)
	lru.get(1)
	lru.set(9, 9)
	lru.peek(5)
	lru.evict(3)

	// Verify cache is still functional
	expect(lru.size > 0).toBe(true)

	// Test all methods still work
	lru.set('new', 'value')
	expect(lru.has('new')).toBe(true)
	expect(lru.get('new')).toBe('value')

	const keys = [...lru.keys()]
	const values = [...lru.values()]
	const entries = [...lru.entries()]

	expect(keys.length).toBe(lru.size)
	expect(values.length).toBe(lru.size)
	expect(entries.length).toBe(lru.size)
})

test('.evict() with non-integer count coercion edge cases', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)
	lru.set('d', 4)

	// Test various coercion cases
	const initialSize = lru.size

	// Boolean true -> 1
	lru.evict(true)
	expect(lru.size).toBe(initialSize - 1)

	// Boolean false -> 0 (no-op)
	lru.evict(false)
	expect(lru.size).toBe(initialSize - 1)

	// String with spaces
	lru.evict('  2  ')
	expect(lru.size).toBe(1)

	// Should keep at least one
	expect(lru.size > 0).toBe(true)
})

test('.evict() with maxSize of 1', () => {
	const lru = new QuickLRU({ maxSize: 1 })

	lru.set('only', 'item')
	expect(lru.size).toBe(1)

	// Should keep the one item
	lru.evict(1)
	expect(lru.size).toBe(1)
	expect(lru.has('only')).toBe(true)

	// Evict 0 should be no-op
	lru.evict(0)
	expect(lru.size).toBe(1)
	expect(lru.has('only')).toBe(true)

	// Even large numbers should keep the one item
	lru.evict(999_999)
	expect(lru.size).toBe(1)
	expect(lru.has('only')).toBe(true)
})

test('.evict() during iteration maintains stability', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	for (let i = 0; i < 5; i++) {
		lru.set(i, i)
	}

	const keys = []
	let iterationCount = 0

	for (const [key] of lru) {
		keys.push(key)
		if (iterationCount === 2) {
			// Evict during iteration
			lru.evict(2)
		}

		iterationCount++
		// Safety check to prevent infinite loop
		if (iterationCount > 10) {
			break
		}
	}

	// Should have completed iteration
	expect(keys.length).toBe(5)
	expect(lru.size).toBe(3)
})

test('.evict() rapid successive calls', () => {
	const evicted = []
	const lru = new QuickLRU({
		maxSize: 10,
		onEviction(key, value) {
			evicted.push({ key, value })
		},
	})

	for (let i = 0; i < 10; i++) {
		lru.set(i, i)
	}

	// Multiple rapid evictions
	lru.evict(1)
	lru.evict(1)
	lru.evict(1)
	lru.evict(2)

	expect(lru.size).toBe(5)
	expect(evicted.length).toBe(5)

	// Verify eviction order (should be 0, 1, 2, 3, 4)
	for (let i = 0; i < 5; i++) {
		expect(evicted[i].key).toBe(i)
		expect(evicted[i].value).toBe(i)
	}
})

test('.evict() with circular references', () => {
	const lru = new QuickLRU({ maxSize: 3 })

	const circular1 = { name: 'obj1' }
	circular1.self = circular1

	const circular2 = { name: 'obj2' }
	circular2.ref = circular1
	circular1.ref = circular2

	lru.set('circular1', circular1)
	lru.set('circular2', circular2)
	lru.set('normal', 'value')

	// Should handle circular references without issues
	expect(() => {
		lru.evict(1)
	}).not.toThrow()

	expect(lru.size).toBe(2)
})

test('.evict() with symbols as keys', () => {
	const lru = new QuickLRU({ maxSize: 4 })

	const sym1 = Symbol('first')
	const sym2 = Symbol('second')
	const sym3 = Symbol('third')
	const sym4 = Symbol('fourth')

	lru.set(sym1, 'value1')
	lru.set(sym2, 'value2')
	lru.set(sym3, 'value3')
	lru.set(sym4, 'value4')

	lru.evict(2)

	expect(lru.size).toBe(2)
	expect(lru.has(sym1)).toBe(false)
	expect(lru.has(sym2)).toBe(false)
	expect(lru.has(sym3)).toBe(true)
	expect(lru.has(sym4)).toBe(true)
})

test('.evict() interaction with resize method', () => {
	const evicted = []
	const lru = new QuickLRU({
		maxSize: 10,
		onEviction(key, value) {
			evicted.push({ key, value })
		},
	})

	for (let i = 0; i < 10; i++) {
		lru.set(i, i)
	}

	// First resize down
	lru.resize(6)
	expect(lru.size).toBe(6)
	expect(evicted.length).toBe(4)

	// Then evict more
	lru.evict(3)
	expect(lru.size).toBe(3)
	expect(evicted.length).toBe(7)

	// Resize back up
	lru.resize(8)
	expect(lru.maxSize).toBe(8)
	expect(lru.size).toBe(3)

	// Add more items
	lru.set('new1', 'val1')
	lru.set('new2', 'val2')
	expect(lru.size).toBe(5)
})

test('.evict() with custom object toString methods', () => {
	const lru = new QuickLRU({ maxSize: 3 })

	const customObject = {
		value: 42,
		toString() {
			return 'CustomStringRepresentation'
		},
	}

	const anotherObject = {
		data: 'test',
		toString() {
			throw new Error('toString should not be called during eviction')
		},
	}

	lru.set('custom', customObject)
	lru.set('another', anotherObject)
	lru.set('normal', 'normalValue')

	// Should not call toString during eviction
	expect(() => {
		lru.evict(1)
	}).not.toThrow()

	expect(lru.size).toBe(2)
})

test('.evict() stress test with many items', () => {
	const lru = new QuickLRU({ maxSize: 1000 })

	// Fill with many items
	for (let i = 0; i < 1000; i++) {
		lru.set(i, `value${i}`)
	}

	expect(lru.size).toBe(1000)

	// Evict large batch
	const start = Date.now()
	lru.evict(500)
	const duration = Date.now() - start

	expect(lru.size).toBe(500)
	expect(duration < 100).toBe(true) // Should be fast (< 100ms)

	// Verify remaining items are the most recent
	for (let i = 500; i < 1000; i++) {
		expect(lru.has(i)).toBe(true)
	}

	for (let i = 0; i < 500; i++) {
		expect(lru.has(i)).toBe(false)
	}
})

test('.evict() with alternating get/set/evict operations', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	// Complex sequence of operations
	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	lru.get('a') // Make 'a' recent (but still moves to recent cache)
	lru.evict(1) // Should evict oldest, which is 'a' (the get moved it but it's still oldest in the recent cache)

	expect(lru.has('a')).toBe(false)
	expect(lru.has('b')).toBe(true)
	expect(lru.has('c')).toBe(true)

	lru.set('d', 4)
	lru.set('e', 5)
	lru.peek('c') // Peek doesn't change order
	lru.evict(2) // Should evict 'b' and 'c' (oldest)

	expect(lru.has('b')).toBe(false)
	expect(lru.has('c')).toBe(false)
	expect(lru.has('d')).toBe(true)
	expect(lru.has('e')).toBe(true)
})

test('.evict() with fractional and edge numeric values', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	for (let i = 0; i < 5; i++) {
		lru.set(i, i)
	}

	// Fractional values
	lru.evict(2.7) // Should truncate to 2
	expect(lru.size).toBe(3)

	lru.set(10, 10)
	lru.set(11, 11)

	// Negative infinity
	lru.evict(Number.NEGATIVE_INFINITY)
	expect(lru.size).toBe(5) // Should be no-op

	// Very small positive number
	lru.evict(0.1) // Should truncate to 0, no-op
	expect(lru.size).toBe(5)

	// Scientific notation
	lru.evict(2e2) // 200, should evict all but one
	expect(lru.size).toBe(1)
})

test('.evict() callback execution order and state', () => {
	const events = []
	const lru = new QuickLRU({
		maxSize: 5,
		onEviction(key, value) {
			// Record the state when callback is called
			events.push({
				type: 'eviction',
				key,
				value,
				cacheSize: lru.size, // This should be the OLD size
				cacheHasKey: lru.has(key), // Should still exist during callback
			})
		},
	})

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	lru.evict(2)

	expect(events.length).toBe(2)
	expect(events[0]).toEqual({
		type: 'eviction',
		key: 'a',
		value: 1,
		cacheSize: 3, // Size before eviction
		cacheHasKey: true, // Item still exists during callback
	})
	expect(events[1]).toEqual({
		type: 'eviction',
		key: 'b',
		value: 2,
		cacheSize: 3,
		cacheHasKey: true,
	})

	// After eviction, items should be gone
	expect(lru.has('a')).toBe(false)
	expect(lru.has('b')).toBe(false)
	expect(lru.has('c')).toBe(true)
})

test('.evict() interaction with all iterator methods', () => {
	const lru = new QuickLRU({ maxSize: 6 })

	for (let i = 0; i < 6; i++) {
		lru.set(i, `value${i}`)
	}

	// Test with keys()
	const keysBeforeEvict = [...lru.keys()]
	lru.evict(2)
	const keysAfterEvict = [...lru.keys()]

	expect(keysBeforeEvict.length).toBe(6)
	expect(keysAfterEvict.length).toBe(4)
	expect(keysAfterEvict.includes(0)).toBe(false)
	expect(keysAfterEvict.includes(1)).toBe(false)

	// Test with values()
	const values = [...lru.values()]
	expect(values.length).toBe(4)
	expect(values.includes('value2')).toBe(true)
	expect(values.includes('value5')).toBe(true)

	// Test with entries()
	const entries = [...lru.entries()]
	expect(entries.length).toBe(4)
	expect(entries[0]).toEqual([2, 'value2'])

	// Test with entriesAscending()
	const ascending = [...lru.entriesAscending()]
	expect(ascending.length).toBe(4)
	expect(ascending[0]).toEqual([2, 'value2'])

	// Test with entriesDescending()
	const descending = [...lru.entriesDescending()]
	expect(descending.length).toBe(4)
	expect(descending[0]).toEqual([5, 'value5'])
})

test('.evict() with forEach method interaction', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	for (let i = 0; i < 5; i++) {
		lru.set(i, i * 10)
	}

	lru.evict(2)

	const forEachResults = []
	for (const [key, value] of lru) {
		forEachResults.push({ key, value, isThisCorrect: true })
	}

	expect(forEachResults.length).toBe(3)
	expect(forEachResults[0]).toEqual({ key: 2, value: 20, isThisCorrect: true })
	expect(forEachResults[1]).toEqual({ key: 3, value: 30, isThisCorrect: true })
	expect(forEachResults[2]).toEqual({ key: 4, value: 40, isThisCorrect: true })
})

test('.evict() concurrent with cache capacity triggers', () => {
	const evicted = []
	const lru = new QuickLRU({
		maxSize: 3,
		onEviction(key, value) {
			evicted.push({ key, value })
		},
	})

	// Fill cache
	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	// Manual evict
	lru.evict(1)

	// Should have one manual eviction
	expect(evicted.length).toBe(1)

	// Add more items - these won't trigger auto-eviction since cache isn't at capacity
	lru.set('d', 4)
	expect(lru.size).toBe(3) // Still at capacity
	expect(evicted.length).toBe(1) // No new evictions

	// Force auto-eviction by filling beyond maxSize
	lru.set('e', 5)
	lru.set('f', 6) // This should trigger auto-eviction

	// Should now have more evictions from auto-eviction
	expect(evicted.length > 1).toBe(true)
})

test('.evict() with peek interactions preserves LRU order', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)
	lru.set('d', 4)
	lru.set('e', 5)

	// Peek doesn't change LRU order
	expect(lru.peek('a')).toBe(1)
	expect(lru.peek('b')).toBe(2)

	// Evict should still remove 'a' first (oldest)
	lru.evict(1)

	expect(lru.has('a')).toBe(false)
	expect(lru.has('b')).toBe(true)
	expect(lru.has('c')).toBe(true)
	expect(lru.has('d')).toBe(true)
	expect(lru.has('e')).toBe(true)
})

test('.evict() maintains consistency with size property', () => {
	const lru = new QuickLRU({ maxSize: 10 })

	// Fill with varying operations
	for (let i = 0; i < 8; i++) {
		lru.set(i, i)
	}

	lru.delete(3)
	lru.delete(5)
	expect(lru.size).toBe(6)

	lru.evict(3)
	expect(lru.size).toBe(3)

	// Add items back
	lru.set('new1', 'val1')
	lru.set('new2', 'val2')
	expect(lru.size).toBe(5)

	// Size should always match actual iteration count
	const iterationCount = [...lru].length
	expect(lru.size).toBe(iterationCount)
})

test('.evict() edge case: exactly maxSize items with expiry', async () => {
	const lru = new QuickLRU({ maxSize: 3 })

	// Fill exactly to maxSize with mixed expiry
	lru.set('temp1', 1, { maxAge: 5 }) // Will expire
	lru.set('temp2', 2, { maxAge: 5 }) // Will expire
	lru.set('perm', 3) // Will not expire

	await delay(10)

	// All temp items expired, only perm remains
	// But cache thinks it has 3 items (size property)
	lru.evict(1)

	// Should handle gracefully
	expect(lru.size <= 1).toBe(true)
	expect(lru.has('perm')).toBe(true)
})

test('.evict() type coercion with special objects', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	for (let i = 0; i < 5; i++) {
		lru.set(i, i)
	}

	// Test with Date object - Number(new Date(2)) is 2
	lru.evict(new Date(2)) // Should coerce to 2
	expect(lru.size).toBe(3)

	lru.set(10, 10)
	lru.set(11, 11)

	// Test with object with valueOf
	const customObject = {
		valueOf() {
			return 1
		},
	}
	lru.evict(customObject) // Should coerce to 1
	expect(lru.size).toBe(4)

	// Test with array
	lru.evict([1]) // Should coerce to 1
	expect(lru.size).toBe(3)
})

test('.evict() performance with large maxAge and many expired items', async () => {
	const lru = new QuickLRU({ maxSize: 100 })

	// Add many items with short expiry
	for (let i = 0; i < 50; i++) {
		lru.set(`expired${i}`, i, { maxAge: 1 })
	}

	// Add some permanent items
	for (let i = 0; i < 10; i++) {
		lru.set(`perm${i}`, i)
	}

	await delay(10) // Let expired items expire

	// Performance test: should be fast even with many expired items
	const start = Date.now()
	lru.evict(5)
	const duration = Date.now() - start

	expect(duration < 50).toBe(true) // Should be very fast
	expect(lru.size <= 10).toBe(true) // Should have evicted some permanent items too
})

test('.evict() boundary: evict count equals live items minus one', () => {
	const lru = new QuickLRU({ maxSize: 5 })

	lru.set('a', 1)
	lru.set('b', 2)
	lru.set('c', 3)

	// Evict exactly size - 1 (should leave 1 item)
	lru.evict(2)

	expect(lru.size).toBe(1)
	expect(lru.has('c')).toBe(true) // Most recent should remain
})

test('.evict() with custom maxAge and global maxAge interaction', async () => {
	const lru = new QuickLRU({ maxSize: 5, maxAge: 100 }) // Global maxAge

	lru.set('global1', 1) // Uses global maxAge
	lru.set('custom1', 2, { maxAge: 5 }) // Custom short maxAge
	lru.set('global2', 3) // Uses global maxAge
	lru.set('custom2', 4, { maxAge: 5 }) // Custom short maxAge
	lru.set('noglobal', 5) // Uses global maxAge

	await delay(10) // Custom items expire

	lru.evict(2)

	// Should evict oldest live items
	expect(lru.size).toBe(1)
	expect(lru.has('noglobal')).toBe(true) // Most recent should remain
})
