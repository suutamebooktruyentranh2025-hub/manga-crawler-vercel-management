import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apply_catalog_filters, collect_filter_options } from './filters.mjs';

const catalog_items = [
  {
    title: 'Solo Leveling',
    description: 'Hunter',
    author: 'Chugong',
    genre_parts: ['Action', 'Fantasy'],
    status: 'Full',
    source: 'MangaDex',
    rate: '9.2',
    qty: '200',
  },
  {
    title: 'One Piece',
    description: 'Pirates',
    author: 'Oda',
    genre_parts: ['Adventure'],
    status: 'Ongoing',
    source: 'MangaPlus',
    rate: '9.8',
    qty: '1100',
  },
  {
    title: 'Shoujo manga',
    description: '',
    author: 'A-author',
    genre_parts: ['Romance'],
    status: 'Full',
    source: 'MangaDex',
    rate: '7.1',
    qty: '12',
  },
];

describe('apply_catalog_filters', () => {
  it('searches title author and genre', () => {
    const filtered_items = apply_catalog_filters(catalog_items, 'oda adventure', {});
    assert.equal(filtered_items.length, 1);
    assert.equal(filtered_items[0].title, 'One Piece');
  });

  it('does not match hidden source names', () => {
    const filtered_items = apply_catalog_filters(catalog_items, 'MangaDex', {});
    assert.equal(filtered_items.length, 0);
  });

  it('applies genre and rate filters together', () => {
    const filtered_items = apply_catalog_filters(catalog_items, '', {
      genre: { kind: 'set', values: ['Action'] },
      rate: { kind: 'rateCompare', op: 'gte', value: 9 },
    });
    assert.equal(filtered_items.length, 1);
    assert.equal(filtered_items[0].title, 'Solo Leveling');
  });
});

describe('collect_filter_options', () => {
  it('collects distinct genres and status', () => {
    const filter_options = collect_filter_options(catalog_items);
    assert.ok(filter_options.genre.includes('Action'));
    assert.ok(filter_options.genre.includes('Romance'));
    assert.deepEqual(filter_options.status, ['Full', 'Ongoing']);
  });
});
