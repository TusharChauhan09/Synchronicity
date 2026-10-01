import DodoPayments from 'dodopayments';

export type DodoEnvironment = 'live_mode' | 'test_mode';

export const dodoEnvironment: DodoEnvironment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';

export function getDodoConfig() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('DODO_PAYMENTS_API_KEY is not set');
  }

  return {
    bearerToken: apiKey,
    environment: dodoEnvironment,
    returnUrl:
      process.env.DODO_PAYMENTS_RETURN_URL ?? 'http://localhost:3000/checkout/success',
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? '',
    productId: process.env.DODO_PAYMENTS_PRODUCT_ID?.trim() ?? '',
    productIdPlus: process.env.DODO_PAYMENTS_PRODUCT_ID_PLUS?.trim() ?? '',
    productIdPro: process.env.DODO_PAYMENTS_PRODUCT_ID_PRO?.trim() ?? '',
  };
}

export function resolveProductIdForPlan(plan: 'plus' | 'pro'): string {
  const dodo = getDodoConfig();
  if (plan === 'plus' && dodo.productIdPlus) return dodo.productIdPlus;
  if (plan === 'pro' && dodo.productIdPro) return dodo.productIdPro;
  if (dodo.productId) return dodo.productId;
  throw new Error(`Dodo product id for ${plan} is not configured`);
}

export function createDodoClient() {
  const dodo = getDodoConfig();
  return new DodoPayments({
    bearerToken: dodo.bearerToken,
    environment: dodo.environment,
  });
}

let cachedProductId: string | null = null;

export async function resolveProductId(client: DodoPayments): Promise<string> {
  const fromEnv = getDodoConfig().productId;
  if (fromEnv) {
    cachedProductId = fromEnv;
    return fromEnv;
  }

  if (cachedProductId) {
    return cachedProductId;
  }

  const products = await client.products.list();
  const productId = products.items[0]?.product_id;
  if (!productId) {
    throw new Error(
      'No Dodo product found. Run: npm run dodo:create-product -w @repo/api',
    );
  }

  cachedProductId = productId;
  process.env.DODO_PAYMENTS_PRODUCT_ID = productId;
  return productId;
}
