const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const scraper = require('../scraper');

describe('scraper', () => {
  it('getEngineHealth returns expected structure', () => {
    const h = scraper.getEngineHealth();
    assert.ok(h.engines);
    assert.ok(['Bing', 'Google', 'YouTube', 'DuckDuckGo'].every(e => e in h.engines));
    assert.equal(typeof h.totalSearches, 'number');
    assert.equal(h.engineCount, 4);
    for (const engine of Object.values(h.engines)) {
      assert.ok('status' in engine);
      assert.ok('errorCount' in engine);
      assert.ok('consecutiveFails' in engine);
    }
  });

  it('getCacheStats returns expected structure', () => {
    const s = scraper.getCacheStats();
    assert.ok(s.total >= 0);
    assert.ok(s.max > 0);
    assert.equal(typeof s.ttlHours, 'number');
    assert.ok(s.ttlHours > 0);
  });

  it('getDeviceCategories returns array for valid device', () => {
    const cats = scraper.getDeviceCategories('laptop');
    assert.ok(Array.isArray(cats));
    assert.ok(cats.length > 0);
    assert.ok(cats[0].id);
    assert.ok(cats[0].label);
  });

  it('getDeviceCategories returns empty for invalid device', () => {
    assert.deepEqual(scraper.getDeviceCategories('invalid_device'), []);
  });

  it('getDeviceCategories works for all 11 devices', () => {
    const ids = ['laptop','phone','tablet','console','desktop','monitor','printer','smartwatch','camera','router','ereader'];
    for (const id of ids) {
      const cats = scraper.getDeviceCategories(id);
      assert.ok(cats.length > 0, `${id} has no categories`);
    }
  });

  it('getSourceUrls returns source links', () => {
    const urls = scraper.getSourceUrls('PC Laptop', 'Dell', 'XPS 15', 'Battery');
    assert.ok(urls.length >= 4);
    for (const u of urls) {
      assert.ok(u.title);
      assert.ok(u.link.startsWith('http'));
      assert.ok(u.source);
      assert.ok(u.type);
      assert.equal(u.isSearchShortcut, true);
    }
  });

  it('buildContextQueryFragment keeps useful keywords only', () => {
    const fragment = scraper.buildContextQueryFragment('Started after an update and now it only charges at an angle with a loose port');
    assert.ok(fragment.includes('update'));
    assert.ok(fragment.includes('charges'));
    assert.ok(fragment.includes('angle'));
    assert.ok(!fragment.includes('after'));
  });

  it('getSourceUrls results can be decorated with thumbnails', () => {
    const urls = scraper.getSourceUrls('Phone', 'Apple iPhone', 'iPhone 14', 'Screen');
    const decorated = urls.map(scraper.ensureResultThumbnail);
    for (const result of decorated) {
      assert.ok(result.thumbnail);
      assert.ok(result.thumbnail.startsWith('data:image/svg+xml') || result.thumbnail.startsWith('https://'));
    }
  });
});
