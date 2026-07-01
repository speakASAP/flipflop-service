#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const QRCode = require(path.join(__dirname, '..', 'services', 'frontend', 'node_modules', 'qrcode'));

const baseUrl = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://flipflop.alfares.cz').replace(/\/$/, '');
const evidenceDir = path.join('reports', 'validation', 'guest-checkout-smoke');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function httpOk(url) {
  const response = await fetch(url, { method: 'GET', redirect: 'manual' });
  assert(response.status >= 200 && response.status < 400, `${url} returned HTTP ${response.status}`);
  return response;
}

async function httpInvalidGuestOrderRejected(url) {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(response.status !== 404, `${url} returned HTTP 404; guest order route is not mounted`);
  assert(response.status >= 400 && response.status < 500, `${url} must reject an invalid guest order with a 4xx validation response, got HTTP ${response.status}`);
  return response;
}

async function main() {
  const checkout = read('services/frontend/app/checkout/page.tsx');
  const paymentResult = read('services/frontend/app/payment-result/page.tsx');
  const orderApi = read('services/frontend/lib/api/orders.ts');
  const guestDto = read('services/order-service/src/orders/dto/create-guest-order.dto.ts');
  const orderService = read('services/order-service/src/orders/orders.service.ts');
  const ordersModule = read('services/order-service/src/orders/orders.module.ts');
  const gatewayController = read('services/api-gateway/src/gateway/gateway.controller.ts');
  const configmap = read('k8s/configmap.yaml');
  const externalSecret = read('k8s/external-secret.yaml');
  const envExample = read('.env.example');
  const frontendPackage = JSON.parse(read('services/frontend/package.json'));

  assert(checkout.includes('getGuestCart()'), 'Checkout must load guest cart without requiring login');
  assert(!checkout.includes("router.push('/login"), 'Checkout must not hard-redirect guests to login');
  assert(!checkout.includes('authApi.register'), 'Checkout must not register users before order submission');
  assert(!checkout.includes('type="password"') && !checkout.includes('PasswordField'), 'Checkout must not expose password fields');
  assert(checkout.includes('wantsAccount: form.createAccount'), 'Checkout must pass optional account intent as wantsAccount');
  assert(checkout.includes("const CHECKOUT_DETAILS_PATH = '/checkout?step=details'"), 'Checkout login/register redirect must target the details step');
  assert(checkout.includes("new URLSearchParams(window.location.search).get('step') === 'details'"), 'Checkout must restore the details step from redirect query state');
  assert(checkout.includes('loginRedirectHref') && checkout.includes('registerRedirectHref') && checkout.includes('passwordResetHref'), 'Checkout account prompt must offer login, registration, and access recovery without leaving the details step');
  assert(checkout.includes("marketingConsent: false"), 'Checkout must initialize marketingConsent to false');
  assert(checkout.includes("updateForm('marketingConsent', event.target.checked)"), 'Checkout marketing consent checkbox must update the quoted marketingConsent key');
  assert(!checkout.includes('updateForm(marketingConsent'), 'Checkout must not reference an undefined marketingConsent variable');
  assert(checkout.includes('Chci vytvořit účet'), 'Checkout must expose optional account checkbox copy');
  assert(checkout.includes('Doprava') && checkout.includes('Platba'), 'Checkout must include Czech delivery/payment sections');
  assert(checkout.includes('Chci zboží doručit v jiný den'), 'Checkout must include different delivery day option');
  assert(!checkout.includes('Cena bude přepočítána serverem při odeslání.'), 'Checkout must not include server-price recalculation note');
  assert(!checkout.includes('Standard - jedna zásilka'), 'Checkout must not include standard one-shipment expedition row');
  assert(!checkout.includes('Zálohová faktura'), 'Checkout must not include advance-invoice payment option');
  assert(!checkout.includes('Poděkování operátorům expedice'), 'Checkout must not include operator-tip upsell');
  assert(!checkout.includes('Tentokrát ne'), 'Checkout must not include no-tip option');
  assert(checkout.includes('Souhrn objednávky'), 'Checkout must include order summary');
  assert(checkout.includes('AddressAutocomplete') && checkout.includes('updateBillingAddress') && checkout.includes('updateDeliveryAddress'), 'Checkout must use address autocomplete for billing and delivery addresses');
  assert(fs.existsSync('services/frontend/app/api/address-autocomplete/route.ts'), 'Frontend must expose a server-side address autocomplete proxy route');
  assert(read('services/frontend/app/api/address-autocomplete/route.ts').includes('GOOGLE_PLACES_API_KEY') && read('services/frontend/app/api/address-autocomplete/route.ts').includes('places:autocomplete'), 'Address autocomplete proxy must use a server-side provider key and Google Places autocomplete contract');
  assert(checkout.includes('CheckoutStepButton') && checkout.includes("router.push('/cart')") && checkout.includes('goToDelivery'), 'Checkout must allow returning to previous steps from the stepper');
  assert(checkout.includes('Vrátit se na předchozí krok'), 'Checkout must include an explicit previous-step button');
  assert(!checkout.includes('shippingCost: selectedDelivery.price'), 'Checkout must not send browser-computed shippingCost');

  assert(orderApi.includes('wantsAccount?: boolean'), 'Frontend order API must include wantsAccount');
  assert(guestDto.includes('wantsAccount?: boolean'), 'Guest order DTO must include wantsAccount');
  assert(orderService.includes("accountActivation: dto.wantsAccount === true ? 'magic-link-pending' : 'not-requested'"), 'Order metadata must preserve account activation intent before integrations run');
  assert(orderService.includes("metadataPatch.accountActivation = 'magic-link-sent'") && orderService.includes("metadataPatch.accountActivation = 'magic-link-failed'"), 'Order integrations must record magic-link sent/failed outcomes');
  assert(gatewayController.includes("@Post('orders/guest')"), 'Gateway must expose guest order endpoint');
  assert(ordersModule.includes('GuestOrdersController'), 'Order module must register GuestOrdersController so /orders/guest is mounted');
  assert(orderService.includes('buildGuestOrderItems') && orderService.includes('Product ${productId} is not available'), 'Guest order path must recalculate/validate product items server-side');
  assert(orderService.includes('calculateGuestDeliveryCost') && orderService.includes('normalizeGuestPaymentMethod') && orderService.includes('normalizeGuestOperatorTip'), 'Guest order path must calculate delivery, payment, and tip costs server-side');
  assert(!orderService.includes('const shippingCost = Number.isFinite(Number(dto.shippingCost))'), 'Guest order path must not trust client-provided shippingCost');

  assert(frontendPackage.dependencies && frontendPackage.dependencies.qrcode, 'Frontend must depend on qrcode for local QR rendering');
  assert(paymentResult.includes("import QRCode from 'qrcode'"), 'Payment result must use local qrcode package');
  assert(paymentResult.includes('buildQrPlatbaPayload'), 'Payment result must build QR Platba payload');
  assert(paymentResult.includes('SPD') && paymentResult.includes('X-VS') && paymentResult.includes('CC:CZK'), 'QR payload must include Czech QR Platba fields');
  assert(paymentResult.includes('[MISSING: production IBAN]'), 'Payment result must expose missing production IBAN state');
  assert(orderService.includes('BANK_TRANSFER_ACCOUNT_NUMBER') && orderService.includes('BANK_TRANSFER_ACCOUNT_IBAN'), 'Order service must read bank-transfer account env');
  assert(!configmap.includes('BANK_TRANSFER_ACCOUNT_NUMBER: ""') && !configmap.includes('BANK_TRANSFER_ACCOUNT_IBAN: ""'), 'ConfigMap must not shadow bank-transfer secrets with blank values');
  assert(externalSecret.includes('secretKey: BANK_TRANSFER_ACCOUNT_NUMBER') && externalSecret.includes('property: PAYMENT_ACCOUNT_NUMBER'), 'ExternalSecret must map bank-transfer account number from Vault');
  assert(externalSecret.includes('secretKey: BANK_TRANSFER_ACCOUNT_IBAN') && externalSecret.includes('property: PAYMENT_ACCOUNT_IBAN'), 'ExternalSecret must map bank-transfer IBAN from Vault');
  assert(envExample.includes('BANK_TRANSFER_ACCOUNT_NUMBER=') && envExample.includes('BANK_TRANSFER_ACCOUNT_IBAN='), '.env.example must document bank-transfer env contract');

  const requiredEvidence = [
    '01-delivery-payment.png',
    '02-delivery-details-filled-guest.png',
    '03-post-deploy-delivery-payment.png',
    '04-post-deploy-details-passwordless.png',
    '05-bank-transfer-missing-iban.png',
    '06-bank-transfer-rendered-qr.png',
    'report-post-deploy.json',
    'report-payment-qr.json',
    'report-production-guest-order-smoke.json',
  ];
  for (const file of requiredEvidence) {
    const fullPath = path.join(evidenceDir, file);
    assert(fs.existsSync(fullPath), `Missing validation evidence ${fullPath}`);
    assert(fs.statSync(fullPath).size > 0, `Validation evidence is empty ${fullPath}`);
  }

  const postDeployReport = JSON.parse(read(path.join(evidenceDir, 'report-post-deploy.json')));
  assert(postDeployReport.assertions.noLoginRedirect === true, 'Post-deploy smoke must prove no login redirect');
  assert(postDeployReport.assertions.noCheckoutPasswordInputs === true, 'Post-deploy smoke must prove no checkout password inputs');
  assert(postDeployReport.assertions.finalSubmitButtonEnabledBeforeClick === true, 'Post-deploy smoke must prove final submit button can be enabled');
  assert(postDeployReport.assertions.finalSubmitNotClickedToAvoidProductionOrderMutation === true, 'Post-deploy smoke must remain non-mutating');

  const qrReport = JSON.parse(read(path.join(evidenceDir, 'report-payment-qr.json')));
  assert(qrReport.assertions.missingIbanPlaceholderRendered === true, 'QR smoke must prove missing-IBAN state');
  assert(qrReport.assertions.configuredIbanRendersQrSvg === true, 'QR smoke must prove configured IBAN renders QR SVG');
  assert(qrReport.assertions.qrUsesLocalClientGenerator === true, 'QR smoke must prove local QR generation');

  const productionOrderSmoke = JSON.parse(read(path.join(evidenceDir, 'report-production-guest-order-smoke.json')));
  assert(productionOrderSmoke.ok === true, 'Production guest order smoke must pass');
  assert(productionOrderSmoke.mutatingSmokeApprovedByOwner === true, 'Production guest order smoke must be owner-approved');
  assert(productionOrderSmoke.redirectHasBankAccountNumber === true, 'Production guest order smoke must prove bank account redirect param');
  assert(productionOrderSmoke.redirectHasBankAccountIban === true, 'Production guest order smoke must prove IBAN redirect param');
  assert(productionOrderSmoke.paymentResultHttpStatus >= 200 && productionOrderSmoke.paymentResultHttpStatus < 400, 'Production guest order smoke must prove payment result page loads');
  assert(productionOrderSmoke.databaseEvidence?.checkoutMode === 'guest', 'Production guest order smoke must prove guest checkout metadata');
  assert(productionOrderSmoke.databaseEvidence?.accountActivation === 'magic-link-sent', 'Production guest order smoke must prove optional account magic link');
  assert(productionOrderSmoke.databaseEvidence?.centralOrdersForwardingStatus === 'accepted', 'Production guest order smoke must prove central Orders forwarding');
  assert(productionOrderSmoke.valuesRedacted === true, 'Production guest order smoke must not store bank values');

  const svg = await QRCode.toString('SPD*1.0*ACC:CZ6508000000192000145399*AM:1.00*CC:CZK*X-VS:1*MSG:FlipFlop verifier', { type: 'svg', width: 192 });
  assert(svg.includes('<svg') && svg.length > 1000, 'qrcode package must generate SVG output');

  await httpOk(`${baseUrl}/cart`);
  await httpOk(`${baseUrl}/checkout`);
  await httpOk(`${baseUrl}/payment-result?status=bank-transfer&orderId=verify&orderNumber=FFVERIFY&variableSymbol=1&amount=1`);
  await httpOk(`${baseUrl}/api/products?limit=1`);
  await httpInvalidGuestOrderRejected(`${baseUrl}/api/orders/guest`);

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    nonMutating: true,
    assertions: {
      guestCheckoutSourceContract: true,
      optionalRegistrationPasswordless: true,
      deliveryPaymentSummaryUpsell: true,
      backendGuestOrderContract: true,
      paymentQrContract: true,
      savedBrowserEvidencePresent: true,
      liveEndpointsReachable: true,
      guestOrderRouteMountedAndValidated: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
