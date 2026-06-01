const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DEVICES, buildQuery } = require('../devices');

describe('devices', () => {
  it('has 11 device types', () => {
    assert.equal(Object.keys(DEVICES).length, 11);
  });

  it('each device has brands and categories', () => {
    for (const [id, dev] of Object.entries(DEVICES)) {
      assert.ok(dev.brands.length > 0, `${id} has no brands`);
      assert.ok(Object.keys(dev.categories).length > 0, `${id} has no categories`);
    }
  });

  it('buildQuery replaces all placeholders', () => {
    const q = buildQuery('laptop', 'Dell', 'XPS 15', 'battery');
    assert.ok(q.includes('PC Laptop'));
    assert.ok(q.includes('Dell'));
    assert.ok(q.includes('XPS 15'));
  });

  it('buildQuery handles unknown device gracefully', () => {
    const q = buildQuery('unknown', 'Foo', 'Bar', 'test');
    assert.ok(q.includes('Foo'));
    assert.ok(q.includes('Bar'));
  });

  it('all category queries have {device}, {brand}, {model}', () => {
    for (const [id, dev] of Object.entries(DEVICES)) {
      for (const [cid, cat] of Object.entries(dev.categories)) {
        const q = cat.query;
        assert.ok(q.includes('{device}'), `${id}/${cid} missing {device}`);
        assert.ok(q.includes('{brand}'), `${id}/${cid} missing {brand}`);
        assert.ok(q.includes('{model}'), `${id}/${cid} missing {model}`);
      }
    }
  });

  it('smartwatch device has correct structure', () => {
    const sw = DEVICES.smartwatch;
    assert.equal(sw.name, 'Smartwatch');
    assert.equal(sw.brands.length, 9);
    assert.ok(sw.categories.troubleshooting);
    assert.ok(sw.categories.software);
  });

  it('camera device has correct structure', () => {
    const cam = DEVICES.camera;
    assert.equal(cam.name, 'Camera');
    assert.equal(cam.brands.length, 9);
    assert.ok(cam.categories.lens);
    assert.ok(cam.categories.sensor);
  });

  it('router device has correct structure', () => {
    const r = DEVICES.router;
    assert.equal(r.name, 'Router');
    assert.equal(r.brands.length, 10);
    assert.ok(r.categories.firmware);
    assert.ok(r.categories.configuration);
  });

  it('ereader device has correct structure', () => {
    const e = DEVICES.ereader;
    assert.equal(e.name, 'E-Reader');
    assert.equal(e.brands.length, 5);
    assert.ok(e.categories.connectivity);
    assert.ok(e.categories.software);
  });
});
