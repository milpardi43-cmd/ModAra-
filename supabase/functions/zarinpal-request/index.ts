import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID') ?? '';
const sandbox = (Deno.env.get('ZARINPAL_SANDBOX') ?? 'true').toLowerCase() === 'true';
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

const gatewayHost = sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
const startPayHost = sandbox ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function getUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !merchantId) {
    return json({ error: 'Payment service is not configured' }, 503);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);
  const accessToken = authHeader.replace('Bearer ', '');
  const authClient = getUserClient(accessToken);
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Invalid session' }, 401);

  let body: { address?: string; phone?: string; return_to_app?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const address = body.address?.trim();
  const phone = body.phone?.trim();
  if (!address || !phone) return json({ error: 'Address and phone are required' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: cartItems, error: cartError } = await adminClient
    .from('cart_items')
    .select('product_id, quantity, product:products(id, price, stock, name)')
    .eq('user_id', authData.user.id);

  if (cartError) return json({ error: 'Could not load cart' }, 500);
  if (!cartItems?.length) return json({ error: 'Cart is empty' }, 400);

  const validItems = cartItems.filter((item) => item.product && item.quantity > 0 && item.quantity <= item.product.stock);
  if (validItems.length !== cartItems.length) return json({ error: 'One or more cart items are no longer available' }, 409);

  const total = validItems.reduce((sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 1000) return json({ error: 'Invalid order total' }, 400);

  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .insert({ user_id: authData.user.id, total, status: 'pending', address, phone })
    .select('id, total')
    .single();
  if (orderError || !order) return json({ error: 'Could not create order' }, 500);

  const orderItems = validItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: Number(item.product?.price ?? 0),
  }));
  const { error: itemError } = await adminClient.from('order_items').insert(orderItems);
  if (itemError) {
    await adminClient.from('orders').delete().eq('id', order.id);
    return json({ error: 'Could not create order items' }, 500);
  }

  const callbackUrl = new URL('/functions/v1/zarinpal-callback', supabaseUrl);
  callbackUrl.searchParams.set('order_id', order.id);
  if (body.return_to_app === true) callbackUrl.searchParams.set('platform', 'native');

  const gatewayResponse = await fetch(`${gatewayHost}/pg/v4/payment/request.json`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      merchant_id: merchantId,
      amount: total,
      currency: 'IRT',
      description: `سفارش ${order.id}`,
      callback_url: callbackUrl.toString(),
      metadata: { mobile: phone },
    }),
  });
  const gatewayPayload = await gatewayResponse.json().catch(() => null);
  const authority = gatewayPayload?.data?.authority;
  const gatewayCode = gatewayPayload?.data?.code;
  if (!gatewayResponse.ok || gatewayCode !== 100 || !authority) {
    await adminClient.from('orders').update({ status: 'failed' }).eq('id', order.id);
    return json({ error: 'Could not initialize payment', gateway_code: gatewayCode ?? null }, 502);
  }

  await adminClient
    .from('orders')
    .update({ payment_gateway: 'zarinpal', payment_authority: authority })
    .eq('id', order.id);

  return json({
    order_id: order.id,
    payment_url: `${startPayHost}/pg/StartPay/${authority}`,
  });
});
