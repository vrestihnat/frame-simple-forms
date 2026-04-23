// @ts-check
const { test, expect } = require('@playwright/test');

const ATYP_URL = '/p/ekp-k-atyp';
// wait helpers tied to init.js debounce + AJAX resolve
const INIT_MS = 4000;
const DEBOUNCE_MS = 600;

async function waitForConfigurator(page) {
  // init.js injects the form into a snippet after fetching config/template — wait for it
  await page.waitForSelector('#size-a', { state: 'visible', timeout: 10000 });
  await page.waitForSelector('#size-b', { state: 'visible' });
  await page.waitForSelector('#buy_btn', { state: 'visible' });
  await page.waitForTimeout(INIT_MS);
}

async function setSizes(page, a, b) {
  // use jQuery.trigger('keyup') — init.js listens on keyup, not input
  await page.evaluate(([a, b]) => {
    const A = document.getElementById('size-a');
    const B = document.getElementById('size-b');
    A.value = String(a);
    window.jQuery(A).trigger('keyup');
    B.value = String(b);
    window.jQuery(B).trigger('keyup');
  }, [a, b]);
  await page.waitForTimeout(DEBOUNCE_MS + 1500); // debounce + network round-trip
}

test.describe('Euroklip konfigurátor', () => {
  test('loads the configurator with product types', async ({ page }) => {
    await page.goto(ATYP_URL);
    await waitForConfigurator(page);

    const types = await page.$$eval('#frame-type option', opts => opts.map(o => o.textContent.trim()));
    expect(types.length).toBeGreaterThanOrEqual(4);
    expect(types.some(t => t.includes('PLEXI'))).toBeTruthy();
    expect(types.some(t => t.includes('SKLO'))).toBeTruthy();

    // Buy button starts disabled (no sizes)
    await expect(page.locator('#buy_btn')).toBeDisabled();
  });

  test('enters atyp dimensions and gets a valid price', async ({ page }) => {
    await page.goto(ATYP_URL);
    await waitForConfigurator(page);

    await setSizes(page, 15, 20);

    const code = await page.locator('#product-code').textContent();
    expect(code).toMatch(/EKP_K_atyp\|\d+x\d+/);

    const price = await page.locator('.price-value').first().textContent();
    expect(price).toMatch(/\d+,\d{2}\s*Kč/);
    expect(price).not.toMatch(/^0,00/);

    await expect(page.locator('#buy_btn')).toBeEnabled();
  });

  test('debounces rapid keyup events to a single resolve request', async ({ page }) => {
    await page.goto(ATYP_URL);
    await waitForConfigurator(page);

    // Count resolve calls during typing burst
    const calls = [];
    page.on('request', req => {
      if (req.url().includes('/api/euroclip/resolve')) calls.push(req.url());
    });

    await page.evaluate(() => {
      const A = document.getElementById('size-a');
      const B = document.getElementById('size-b');
      A.value = '1'; window.jQuery(A).trigger('keyup');
      setTimeout(() => { A.value = '15'; window.jQuery(A).trigger('keyup'); }, 80);
      setTimeout(() => { B.value = '2'; window.jQuery(B).trigger('keyup'); }, 200);
      setTimeout(() => { B.value = '20'; window.jQuery(B).trigger('keyup'); }, 280);
    });

    await page.waitForTimeout(DEBOUNCE_MS + 1500);

    // 4 keystrokes → debounce collapses to one call
    expect(calls.length).toBe(1);
  });

  test('buy button redirects with correct addtocart query and productnote', async ({ page, context }) => {
    await page.goto(ATYP_URL);
    await waitForConfigurator(page);
    // 13x21 is not in the standard catalogue → atyp → productnote is included
    await setSizes(page, 13, 21);

    // Block the addtocart navigation so we don't mutate the live cart; capture the URL
    let cartUrl = null;
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('addtocart=1')) {
        cartUrl = url;
        return route.abort();
      }
      return route.continue();
    });

    await page.locator('#buy_btn').click().catch(() => {});
    await page.waitForFunction(() => false, null, { timeout: 3000 }).catch(() => {});

    expect(cartUrl).not.toBeNull();
    expect(cartUrl).toContain('addtocart=1');
    expect(cartUrl).toContain('quantity=1');
    expect(cartUrl).toContain('return=');
    expect(cartUrl).toContain('productnote=');
    expect(cartUrl).toMatch(/\/p\/[a-z0-9-]+\?/i);
  });

  test('shows cart-added toast when sessionStorage flag is present', async ({ page }) => {
    await page.goto(ATYP_URL);
    await waitForConfigurator(page);

    // set flag and reload — init.js should pick it up and show toast
    await page.evaluate(() => sessionStorage.setItem('euroclip_cart_added', '1'));
    await page.reload();

    // toast is created ~after init.js defines showCartSuccess (~immediately after load)
    const toast = page.locator('.ecf-toast-success');
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/košík|košíka|koszyka/i);

    // flag was consumed
    const remaining = await page.evaluate(() => sessionStorage.getItem('euroclip_cart_added'));
    expect(remaining).toBeNull();
  });
});
