import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { admin_dashboard_href, resolve_admin_dashboard_tab } from './dashboard-tabs.mjs';

describe('resolve_admin_dashboard_tab', () => {
  it('defaults to overview when tab is missing or unknown', () => {
    assert.equal(resolve_admin_dashboard_tab(undefined), 'overview');
    assert.equal(resolve_admin_dashboard_tab('nope'), 'overview');
  });

  it('keeps a known tab including event settings', () => {
    assert.equal(resolve_admin_dashboard_tab('revenue'), 'revenue');
    assert.equal(resolve_admin_dashboard_tab('event'), 'event');
  });
});

describe('admin_dashboard_href', () => {
  it('omits the query for overview and unknown tabs', () => {
    assert.equal(admin_dashboard_href('overview'), '/admin');
    assert.equal(admin_dashboard_href('nope'), '/admin');
  });

  it('writes a tab query for users revenue and event', () => {
    assert.equal(admin_dashboard_href('users'), '/admin?tab=users');
    assert.equal(admin_dashboard_href('revenue'), '/admin?tab=revenue');
    assert.equal(admin_dashboard_href('event'), '/admin?tab=event');
  });
});
