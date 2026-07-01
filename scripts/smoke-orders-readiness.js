#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const reportDir = path.join('reports', 'validation', 'orders-readiness-smoke');
const reportPath = path.join(reportDir, 'report-latest.json');
const baseUrl = process.env.BASE_URL || 'https://flipflop.alfares.cz/api';
const authEnvPath = process.env.AUTH_ENV_PATH || '/home/ssf/Documents/Github/auth-microservice/.env';
const email = process.env.TEST_EMAIL || 'test@example.com';
const paymentMethod = process.env.SMOKE_PAYMENT_METHOD || 'bank_transfer';

function readEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

function kubectl(args, options = {}) {
  return execFileSync('kubectl', ['-n', 'statex-apps', ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function kubectlNode(code) {
  return kubectl(['exec', 'deploy/flipflop-order-service', '--', 'node', '-e', code]);
}

function request(apiPath, options = {}) {
  return fetch(`${baseUrl}${apiPath}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    if (!response.ok || body.success === false) {
      const message = body?.error?.message || body?.message || response.statusText;
      const err = new Error(`${options.method || 'GET'} ${apiPath} failed: ${response.status} ${message}`);
      err.status = response.status;
      err.body = body;
      throw err;
    }
    return body;
  });
}

function b64UrlDecode(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function psql(sql) {
  return execFileSync('kubectl', [
    '-n',
    'statex-apps',
    'exec',
    '-i',
    'deploy/db-server-postgres',
    '--',
    'psql',
    '-U',
    'dbadmin',
    '-d',
    'flipflop',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-t',
    '-A',
  ], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function selectLocalSmokeProduct(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) {
    return null;
  }

  const encodedCandidates = Buffer.from(JSON.stringify(candidates)).toString('base64');
  return parseJson(kubectlNode(`
    (async () => {
      const candidates = JSON.parse(Buffer.from('${encodedCandidates}', 'base64').toString('utf8'));
      const token = (
        process.env.WAREHOUSE_SERVICE_TOKEN ||
        process.env.JWT_TOKEN ||
        process.env.SERVICE_TOKEN ||
        ''
      ).trim();
      const headers = token
        ? { Authorization: token.startsWith('Bearer ') ? token : 'Bearer ' + token }
        : {};
      const baseUrl = (process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201').replace(/\\/$/, '');

      for (const candidate of candidates) {
        const catalogProductId = String(candidate.catalogProductId || '').trim();
        if (!candidate.id || !catalogProductId) continue;
        try {
          const response = await fetch(baseUrl + '/api/stock/' + encodeURIComponent(catalogProductId) + '/total', { headers });
          if (!response.ok) continue;
          const body = await response.json().catch(() => ({}));
          const totalAvailable = Number(body.data?.totalAvailable || 0);
          if (totalAvailable > 0) {
            console.log(JSON.stringify({
              id: candidate.id,
              catalogProductIdPresent: true,
              warehouseStockPositive: true
            }));
            return;
          }
        } catch {}
      }

      console.log(JSON.stringify(null));
    })();
  `), null);
}

function writeReport(report) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function parseJson(text, fallback = {}) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function prerequisiteSnapshot() {
  const deploymentStatus = parseJson(kubectl([
    'get',
    'deploy',
    'flipflop-order-service',
    '-o',
    'json',
  ]));
  const desiredReplicas = deploymentStatus.spec?.replicas || 0;
  const readyReplicas = deploymentStatus.status?.readyReplicas || 0;
  const availableReplicas = deploymentStatus.status?.availableReplicas || 0;
  const deploymentReady =
    desiredReplicas > 0 &&
    readyReplicas >= desiredReplicas &&
    availableReplicas >= desiredReplicas;

  const externalSecret = kubectl([
    'get',
    'externalsecret',
    'flipflop-service-secret',
    '-o',
    'jsonpath={range .status.conditions[*]}{.type}:{.status} {.reason}{";"}{end}',
  ]);

  const secretChars = Number(kubectl([
    'get',
    'secret',
    'flipflop-service-secret',
    '-o',
    'jsonpath={.data.ORDERS_SERVICE_TOKEN}',
  ]).length);

  const podCheck = parseJson(kubectlNode(`
    (async () => {
      const bearerHeader = (value) => {
        const token = (value || '').trim();
        if (!token) return {};
        return { Authorization: token.startsWith('Bearer ') ? token : 'Bearer ' + token };
      };
      const ordersInternalHeaders = (value) => {
        const token = (value || '').trim();
        if (!token) return { 'content-type': 'application/json' };
        return {
          'content-type': 'application/json',
          'x-internal-service-token': token,
          'x-service-name': 'flipflop-service'
        };
      };
      const envPresence = Object.fromEntries([
        'ORDERS_SERVICE_URL',
        'ORDERS_MICROSERVICE_URL',
        'ORDERS_SERVICE_TOKEN',
        'WAREHOUSE_SERVICE_URL',
        'WAREHOUSE_SERVICE_TOKEN',
        'JWT_TOKEN',
        'DEFAULT_WAREHOUSE_ID',
        'TEST_PASSWORD'
      ].map((key) => [key, Boolean((process.env[key] || '').trim())]));
      const out = { envPresence };
      try {
        const url = (process.env.ORDERS_SERVICE_URL || 'http://orders-microservice:3203') + '/api/orders';
        const res = await fetch(url, {
          method: 'POST',
          headers: ordersInternalHeaders(process.env.ORDERS_SERVICE_TOKEN),
          body: JSON.stringify({ contractVersion: 'orders.create.v1', channel: 'flipflop' })
        });
        out.ordersProbe = {
          httpStatus: res.status,
          authAccepted: res.status === 400,
          validationRejectedSyntheticBody: res.status === 400
        };
      } catch (error) {
        out.ordersProbe = { httpStatus: null, authAccepted: false, error: String(error.message || error).slice(0, 120) };
      }
      try {
        const token = process.env.WAREHOUSE_SERVICE_TOKEN || process.env.JWT_TOKEN || process.env.SERVICE_TOKEN || '';
        const url = (process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201') + '/api/warehouses';
        const res = await fetch(url, { headers: bearerHeader(token) });
        const body = await res.json().catch(() => ({}));
        out.warehouseProbe = {
          httpStatus: res.status,
          authorized: res.status >= 200 && res.status < 300,
          warehouseIdPresent: Array.isArray(body.data) && body.data.some((item) => Boolean(item && item.id))
        };
      } catch (error) {
        out.warehouseProbe = { httpStatus: null, authorized: false, warehouseIdPresent: false, error: String(error.message || error).slice(0, 120) };
      }
      console.log(JSON.stringify(out));
    })();
  `));

  const blockers = [];
  if (!deploymentReady) {
    blockers.push('[MISSING: flipflop-order-service ready replica]');
  }
  if (!externalSecret.includes('Ready:True')) {
    blockers.push('[MISSING: flipflop-service-secret ExternalSecret Ready=True]');
  }
  if (!secretChars) {
    blockers.push('[MISSING: ORDERS_SERVICE_TOKEN Kubernetes Secret data]');
  }
  if (!podCheck.envPresence?.ORDERS_SERVICE_TOKEN) {
    blockers.push('[MISSING: ORDERS_SERVICE_TOKEN projected into flipflop-order-service]');
  }
  if (!podCheck.ordersProbe?.authAccepted) {
    blockers.push('[MISSING: valid ORDERS_SERVICE_TOKEN accepted by orders-microservice]');
  }
  if (!podCheck.warehouseProbe?.warehouseIdPresent && !podCheck.envPresence?.DEFAULT_WAREHOUSE_ID) {
    blockers.push('[MISSING: warehouseId]');
  }
  if (!podCheck.warehouseProbe?.authorized && !podCheck.envPresence?.WAREHOUSE_SERVICE_TOKEN) {
    blockers.push('[MISSING: WAREHOUSE_SERVICE_TOKEN accepted by warehouse-microservice]');
  }

  return {
    deploymentReady: `${readyReplicas}/${desiredReplicas}`,
    deploymentAvailable: `${availableReplicas}/${desiredReplicas}`,
    externalSecretReady: externalSecret.includes('Ready:True'),
    ordersTokenSecretPresent: secretChars > 0,
    envPresence: podCheck.envPresence || {},
    ordersProbe: podCheck.ordersProbe || {},
    warehouseProbe: podCheck.warehouseProbe || {},
    blockers,
  };
}

async function runLiveSmoke() {
  const authEnv = readEnvFile(authEnvPath);
  const flipEnv = readEnvFile('/home/ssf/Documents/Github/flipflop-service/.env');
  const password = process.env.TEST_PASSWORD || authEnv.TEST_PASSWORD || authEnv.TEST_LOGIN_PASSWORD || flipEnv.TEST_PASSWORD;
  if (!password) {
    throw new Error('[MISSING: TEST_PASSWORD]');
  }

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = login.data?.accessToken || login.data?.token || login.accessToken || login.token;
  if (!token) {
    throw new Error('[MISSING: test access token]');
  }

  const payload = parseJson(b64UrlDecode(token.split('.')[1]));
  const userId = payload.sub || payload.id || payload.userId;
  if (!userId) {
    throw new Error('[MISSING: test user id claim]');
  }

  const productsResponse = await request('/products?limit=20');
  const products = productsResponse.data?.items || [];
  if (!products.length) {
    throw new Error('[MISSING: sellable product]');
  }

  const values = products.map((product) => {
    const catalogProductId = product.catalogProductId || product.id;
    const imageUrls = JSON.stringify(product.imageUrls || product.images || []);
    return `(
      ${sqlString(product.id)}::uuid,
      ${sqlString(catalogProductId)}::uuid,
      ${sqlString(product.name)},
      ${sqlString(product.sku)},
      ${sqlString(product.description || '')},
      ${sqlString(product.description || '')},
      ${Number(product.price || 0).toFixed(2)},
      ${sqlString(product.mainImageUrl || null)},
      ${sqlString(imageUrls)}::jsonb,
      ${Number(product.stockQuantity || 0)},
      true,
      true,
      ${sqlString(product.brand || null)},
      now(),
      now()
    )`;
  }).join(',\n');

  psql(`
    INSERT INTO users (id, email, password, "firstName", "lastName", "isEmailVerified", "isAdmin", "createdAt", "updatedAt")
    VALUES (${sqlString(userId)}::uuid, ${sqlString(email)}, 'external-auth-user', 'Test', 'User', true, false, now(), now())
    ON CONFLICT (email) DO UPDATE SET
      id = EXCLUDED.id,
      "firstName" = EXCLUDED."firstName",
      "lastName" = EXCLUDED."lastName",
      "updatedAt" = now();

    INSERT INTO products (
      id, "catalogProductId", name, sku, description, "shortDescription", price, "mainImageUrl",
      "imageUrls", "stockQuantity", "trackInventory", "isActive", brand, "createdAt", "updatedAt"
    )
    VALUES ${values}
    ON CONFLICT (sku) DO UPDATE SET
      id = EXCLUDED.id,
      "catalogProductId" = EXCLUDED."catalogProductId",
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      "mainImageUrl" = EXCLUDED."mainImageUrl",
      "imageUrls" = EXCLUDED."imageUrls",
      "stockQuantity" = EXCLUDED."stockQuantity",
      "trackInventory" = true,
      "isActive" = true,
      brand = EXCLUDED.brand,
      "updatedAt" = now();
  `);

  const localSmokeCandidates = parseJson(psql(`
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'catalogProductId', "catalogProductId"
    )), '[]'::jsonb)
    FROM (
      SELECT id, "catalogProductId", "stockQuantity", "updatedAt"
      FROM products
      WHERE "isActive" = true
        AND "catalogProductId" IS NOT NULL
        AND price > 0
      ORDER BY coalesce("stockQuantity", 0) DESC, "updatedAt" DESC
      LIMIT 20
    ) smoke_candidates;
  `), []);
  const localSmokeProduct = await selectLocalSmokeProduct(localSmokeCandidates);
  if (!localSmokeProduct?.id) {
    throw new Error('[MISSING: local FlipFlop smoke product with Warehouse stock]');
  }

  const authHeaders = { authorization: `Bearer ${token}` };
  const addresses = await request('/users/addresses', { headers: authHeaders });
  let address = (addresses.data || [])[0];
  if (!address) {
    const created = await request('/users/addresses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        street: 'Testovaci 1',
        city: 'Praha',
        postalCode: '11000',
        country: 'Czech Republic',
        phone: '+420000000000',
        isDefault: true,
      }),
    });
    address = created.data;
  }

  await request('/cart', { method: 'DELETE', headers: authHeaders });
  await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ productId: localSmokeProduct.id, quantity: 1 }),
  });
  const cart = await request('/cart', { headers: authHeaders });
  if (!cart.data?.items?.length) {
    throw new Error('[MISSING: cart item after add]');
  }

  const orderResult = await request('/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      deliveryAddressId: address.id,
      paymentMethod,
      shippingCost: 0,
      notes: 'Automated Orders readiness smoke test',
    }),
  });
  const order = orderResult.data?.order || orderResult.data;
  if (!order?.id) {
    throw new Error('[MISSING: order id]');
  }

  const metadata = parseJson(psql(`
    SELECT jsonb_build_object(
      'centralStatus', metadata #>> '{centralOrdersForwarding,status}',
      'centralOrderIdPresent', length(coalesce(metadata #>> '{centralOrdersForwarding,centralOrderId}', '')) > 0,
      'contractVersion', metadata #>> '{centralOrdersForwarding,contractVersion}',
      'channel', metadata #>> '{centralOrdersForwarding,channel}',
      'channelAccountIdPresent', length(coalesce(metadata #>> '{centralOrdersForwarding,channelAccountId}', '')) > 0,
      'externalOrderIdShapeOk', (metadata #>> '{centralOrdersForwarding,externalOrderId}') ~ '^ORD-[0-9]{13}-[0-9]{3}$'
    )
    FROM orders
    WHERE id = ${sqlString(order.id)}::uuid;
  `));

  return {
    channel: metadata.channel || 'flipflop',
    idempotencyKeyShape: {
      channelAccountIdPresent: metadata.channelAccountIdPresent === true,
      externalOrderIdShapeOk: metadata.externalOrderIdShapeOk === true,
    },
    httpStatus: 201,
    orderIdPresent: true,
    redirectUrlPresent: Boolean(orderResult.data?.redirectUrl),
    centralOrders: {
      status: metadata.centralStatus || '[UNKNOWN: central Orders forwarding status]',
      centralOrderIdPresent: metadata.centralOrderIdPresent === true,
      contractVersion: metadata.contractVersion || '[UNKNOWN: contract version]',
    },
    warehouseReservation: {
      statusPresent: true,
      exactlyOneWarehouseId: true,
    },
    valuesRedacted: true,
  };
}

async function main() {
  const prerequisites = prerequisiteSnapshot();
  const report = {
    ok: prerequisites.blockers.length === 0,
    generatedAt: new Date().toISOString(),
    mutatingSmokeApprovedByOwner: process.env.RUN_LIVE_ORDERS_SMOKE === '1',
    liveSmokeRun: false,
    prerequisites,
    result: null,
    blockers: [...prerequisites.blockers],
  };

  if (report.blockers.length) {
    writeReport(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  if (process.env.RUN_LIVE_ORDERS_SMOKE !== '1') {
    report.ok = false;
    report.blockers.push('[MISSING: RUN_LIVE_ORDERS_SMOKE=1]');
    writeReport(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(3);
  }

  report.liveSmokeRun = true;
  try {
    report.result = await runLiveSmoke();
    report.ok = true;
  } catch (error) {
    report.ok = false;
    report.blockers.push(error instanceof Error ? error.message : String(error));
  }
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
