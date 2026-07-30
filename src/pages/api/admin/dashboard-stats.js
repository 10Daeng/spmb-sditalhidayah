export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu', 'tim_media', 'keuangan', 'panitia_spmb', 'guru', 'walas']);
  if (!auth.authorized) return auth.response;

  try {
    // Get overview counts
    const { data: allRegs, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('status, track, created_at');

    if (regError) throw regError;

    const overview = {
      totalPendaftar: allRegs?.length || 0,
      pending: 0,
      verified: 0,
      documentComplete: 0,
      scheduled: 0,
      lulus: 0,
      tidakLulus: 0,
      enrolled: 0,
      rejected: 0,
    };

    allRegs?.forEach(r => {
      const st = r.status || 'pending';
      if (st === 'document_complete') overview.documentComplete++;
      else if (st === 'tidak_lulus') overview.tidakLulus++;
      else if (overview[st] !== undefined) overview[st]++;
    });

    // Get recent registrations (last 10)
    const { data: recentRegistrations } = await supabaseAdmin
      .from('registrations')
      .select('id, registration_number, student_full_name, status, track, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get track distribution
    const trackDist = {};
    allRegs?.forEach(r => {
      const t = r.track || 'murid_baru';
      trackDist[t] = (trackDist[t] || 0) + 1;
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        overview,
        recentRegistrations: recentRegistrations || [],
        trackDistribution: trackDist
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Dashboard stats error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
