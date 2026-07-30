export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const paymentType = url.searchParams.get('type');
    const registrationId = url.searchParams.get('registration_id');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        id, payment_type, amount, paid_amount, status,
        payment_method, bank_name, proof_image_url,
        confirmed_by, confirmed_at, confirmation_notes,
        due_date, paid_at, created_at,
        registration:registrations(id, registration_number, student_full_name, parent_name, parent_phone, parent_email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (paymentType) query = query.eq('payment_type', paymentType);
    if (registrationId) query = query.eq('registration_id', registrationId);

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ data: [], error: error.message, total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const summary = { total: 0, pending: 0, paid: 0, partial: 0, total_tunai: 0, total_transfer: 0 };
    try {
      const { data: allPayments } = await supabaseAdmin
        .from('payments')
        .select('status, amount, paid_amount, payment_method');
      if (allPayments) {
        allPayments.forEach(p => {
          summary.total += 1;
          summary[p.status] = (summary[p.status] || 0) + 1;
          if (p.status === 'paid' || p.status === 'partial') {
            if (p.payment_method?.toLowerCase() === 'tunai') summary.total_tunai += (p.paid_amount || 0);
            else if (p.payment_method?.toLowerCase() === 'transfer') summary.total_transfer += (p.paid_amount || 0);
          }
        });
      }
    } catch (e) {}

    return new Response(JSON.stringify({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
      summary
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Payments fetch error:', err);
    return new Response(JSON.stringify({ data: [], error: err.message, total: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { registration_id, payment_type, amount, due_date, payment_method, bank_name } = body;

    if (!registration_id || !payment_type || !amount) {
      return new Response(JSON.stringify({ error: 'Data pembayaran wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        registration_id,
        payment_type,
        amount: parseFloat(amount),
        due_date: due_date || null,
        payment_method: payment_method || null,
        bank_name: bank_name || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Payment create error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, action, paid_amount, confirmation_notes, status, payment_method } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID pembayaran wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let updateData = {};

    if (action === 'confirm') {
      updateData = {
        status: status || 'paid',
        confirmed_by: auth.user?.id,
        confirmed_at: new Date().toISOString(),
        confirmation_notes: confirmation_notes || null,
        paid_at: new Date().toISOString()
      };
      if (paid_amount) updateData.paid_amount = parseFloat(paid_amount);
      if (payment_method) updateData.payment_method = payment_method;
    } else {
      if (paid_amount !== undefined) updateData.paid_amount = parseFloat(paid_amount);
      if (status) updateData.status = status;
      if (confirmation_notes) updateData.confirmation_notes = confirmation_notes;
      if (payment_method) updateData.payment_method = payment_method;
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Payment update error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Pembayaran dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Payment delete error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}