import 'dotenv/config';
import DodoPayments from 'dodopayments';

const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode';

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
if (!apiKey) {
  console.error('DODO_PAYMENTS_API_KEY is not set');
  process.exit(1);
}

const client = new DodoPayments({ bearerToken: apiKey, environment });

const existing = await client.products.list();
if (existing.items.length > 0) {
  console.log(existing.items[0].product_id);
  process.exit(0);
}

const product = await client.products.create({
  name: 'Synchronicity Pro',
  description: 'Full browser agent workspace with human-in-the-loop control.',
  tax_category: 'saas',
  price: {
    type: 'recurring_price',
    currency: 'USD',
    price: 2000,
    discount: 0,
    payment_frequency_count: 1,
    payment_frequency_interval: 'Month',
    subscription_period_count: 1,
    subscription_period_interval: 'Month',
    purchasing_power_parity: false,
  },
});

console.log(product.product_id);
