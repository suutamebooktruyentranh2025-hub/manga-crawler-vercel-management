import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { header_avatar_initial, should_show_home_back_cue, should_show_register_cta } from './header-nav.mjs';

describe('should_show_register_cta', () => {
  it('shows the home register CTA for guests', () => {
    assert.equal(should_show_register_cta(null), true);
  });

  it('shows the home register CTA for non-admin members', () => {
    assert.equal(should_show_register_cta({ is_admin: false, user_type: 'Member' }), true);
  });

  it('hides the home register CTA for admin', () => {
    assert.equal(should_show_register_cta({ is_admin: true, user_type: 'Admin' }), false);
  });
});

describe('header_avatar_initial', () => {
  it('uses the first letter of the email in uppercase', () => {
    assert.equal(header_avatar_initial('alex@example.com'), 'A');
  });

  it('falls back to a question mark when email is missing', () => {
    assert.equal(header_avatar_initial(''), '?');
    assert.equal(header_avatar_initial(null), '?');
  });
});

describe('should_show_home_back_cue', () => {
  it('hides the back cue on the home catalog', () => {
    assert.equal(should_show_home_back_cue('/'), false);
  });

  it('shows the back cue on account and other inner pages', () => {
    assert.equal(should_show_home_back_cue('/account'), true);
    assert.equal(should_show_home_back_cue('/admin'), true);
    assert.equal(should_show_home_back_cue('/admin/settings'), true);
  });
});
