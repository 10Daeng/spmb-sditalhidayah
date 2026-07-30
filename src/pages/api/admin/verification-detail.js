export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu', 'tim_media', 'keuangan', 'panitia_spmb', 'guru', 'walas']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const regNo = url.searchParams.get('reg_no');

    if (!id && !regNo) {
      return new Response(JSON.stringify({ error: 'ID atau reg_no wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch registration
    let regQuery = supabaseAdmin.from('registrations').select('*');
    if (id) regQuery = regQuery.eq('id', id);
    else regQuery = regQuery.eq('registration_number', regNo);

    const { data: registration, error: regError } = await regQuery.single();
    if (regError || !registration) {
      return new Response(JSON.stringify({ error: 'Pendaftaran tidak ditemukan' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch payments
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('registration_id', registration.id)
      .order('created_at', { ascending: false });

    // Fetch student detail (by registration_number)
    const { data: student } = await supabaseAdmin
      .from('students')
      .select(`
        *,
        student_backgrounds (*),
        student_guardians (*)
      `)
      .eq('registration_id', registration.registration_number)
      .single();

    // Fetch activity logs for this registration
    const { data: logs } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('entity_id', registration.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate document completeness
    const docUrls = student?.document_urls || {};
    const requiredDocs = ['kk', 'akte', 'foto', 'ijazah'];
    const uploadedDocs = Object.keys(docUrls).filter(k => docUrls[k]);
    const docComplete = requiredDocs.every(d => uploadedDocs.includes(d));

    // Calculate payment status
    const totalDue = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalPaid = (payments || []).reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
    const allPaid = totalPaid >= totalDue && totalDue > 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        registration,
        student: student || null,
        payments: payments || [],
        logs: logs || [],
        summary: {
          document_completeness: {
            uploaded: uploadedDocs.length,
            required: requiredDocs.length,
            complete: docComplete,
            missing: requiredDocs.filter(d => !uploadedDocs.includes(d))
          },
          payment_summary: {
            total_due: totalDue,
            total_paid: totalPaid,
            remaining: Math.max(0, totalDue - totalPaid),
            status: allPaid ? 'lunas' : totalPaid > 0 ? 'partial' : 'belum_bayar'
          }
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Verification detail error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}