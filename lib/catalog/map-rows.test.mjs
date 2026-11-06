import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { map_sheet_row, map_sheet_rows } from './map-rows.mjs';

function sample_row(overrides = {}) {
  const row = [
    '1',
    '=IMAGE("https://drive.google.com/file/d/coverid/view")',
    'Solo Leveling\nHunter vs monsters',
    '',
    '200',
    '=HYPERLINK("https://drive.google.com/file/d/fileid/view","tải")',
    'Full',
    'MangaDex',
    '9.2',
    'Chugong',
    'Action, Fantasy',
    '2026-01-15',
  ];
  for (const [index, value] of Object.entries(overrides)) {
    row[Number(index)] = value;
  }
  return row;
}

describe('map_sheet_row', () => {
  it('maps catalog columns to a card item', () => {
    const catalog_item = map_sheet_row(sample_row(), 0);
    assert.equal(catalog_item.title, 'Solo Leveling');
    assert.equal(catalog_item.description, 'Hunter vs monsters');
    assert.equal(catalog_item.qty, '200');
    assert.equal(catalog_item.status, 'Full');
    assert.equal(catalog_item.source, 'MangaDex');
    assert.equal(catalog_item.rate, '9.2');
    assert.equal(catalog_item.author, 'Chugong');
    assert.deepEqual(catalog_item.genre_parts, ['Action', 'Fantasy']);
    assert.equal(catalog_item.updated_at, '15/01/2026');
    assert.equal(
      catalog_item.download_url,
      'https://drive.google.com/file/d/fileid/view',
    );
    assert.equal(
      catalog_item.cover_url,
      'https://drive.google.com/thumbnail?id=coverid&sz=w800',
    );
  });

  it('skips empty title rows', () => {
    const catalog_item = map_sheet_row(sample_row({ 2: '   ' }), 0);
    assert.equal(catalog_item, null);
  });
});

describe('map_sheet_rows', () => {
  it('drops blank rows and keeps stable ids', () => {
    const catalog_items = map_sheet_rows([sample_row(), ['', '', ''], sample_row({ 2: 'One Piece' })]);
    assert.equal(catalog_items.length, 2);
    assert.equal(catalog_items[0].id, '0');
    assert.equal(catalog_items[1].title, 'One Piece');
    assert.equal(catalog_items[1].id, '2');
  });
});
