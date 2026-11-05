import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID') ?? '';
const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'http://localhost:5173/';
const sandbox = (Deno.env.get('ZARINPAL_SANDBOX') ?? 'true').toLowerCase() === 'true';
const gatewayHost = sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function redirect(
  result: 'success' | 'cancelled' | 'failed',
  orderId: string | null,
  refId?: string,
  nativeReturn = false,
) {
  let url = new URL(publicSiteUrl);
  if (nativeReturn) {
    const configured = Deno.env.get('MOBILE_RETURN_URL') ?? 'com.modara.app://payment-callback';
    try {
      const appUrl = new URL(configured);
      if (!appUrl.protocol.startsWith('com.') || appUrl.hostname !== 'payment-callback') {
        throw new Error('MOBILE_RETURN_URL must use the configured app scheme');
      }
      url = appUrl;
    } catch {
      url = new URL('com.modara.app://payment-callback');
    }
  }
  url.searchParams.set('payment', 'zarinpal');
  url.searchParams.set('result', result);
  if (orderId) url.searchParams.set('order_id', orderId);
  if (refId) url.searchParams.set('ref_id', refId);
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async (request) => {
  if (!supabaseUrl || !serviceRoleKey || !merchantId) {
    return new Response('Payment service is not configured', { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const status = params.get('Status');
  const authority = params.get('Authority');
  const orderId = params.get('order_id');
  const nativeReturn = params.get('platform') === 'native';
  if (!orderId) return redirect('failed', null, undefined, nativeReturn);
  if (status !== 'OK' || !authority) return redirect('cancelled', orderId, undefined, nativeReturn);

  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('id, total, status, payment_authority')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError || !order || order.payment_authority !== authority) {
    return redirect('failed', orderId, undefined, nativeReturn);
  }

  if (order.status === 'paid') return redirect('success', orderId, undefined, nativeReturn);

  const verifyResponse = await fetch(`${gatewayHost}/pg/v4/payment/verify.json`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      merchant_id: merchantId,
      amount: Number(order.total),
      currency: 'IRT',
      authority,
    }),
  });
  const verifyPayload = await verifyResponse.json().catch(() => null);
  const code = verifyPayload?.data?.code;
  const refId = verifyPayload?.data?.ref_id ? String(verifyPayload.data.ref_id) : undefined;
  const verified = code === 100 || code === 101;

  if (!verified) {
    await adminClient.from('orders').update({ status: 'failed', payment_error: `zarinpal:${code ?? 'unknown'}` }).eq('id', order.id).eq('status', 'pending');
    return redirect('failed', order.id, undefined, nativeReturn);
  }

  const { data: markedOrder, error: updateError } = await adminClient
    .from('orders')
    .update({
      status: 'paid',
      payment_ref_id: refId ?? null,
      payment_verified_at: new Date().toISOString(),
      payment_error: null,
    })
    .eq('id', order.id)
    .in('status', ['pending', 'paid'])
    .select('id')
    .maybeSingle();

  if (updateError || !markedOrder) return redirect('failed', order.id, undefined, nativeReturn);
  return redirect('success', order.id, refId, nativeReturn);
});
