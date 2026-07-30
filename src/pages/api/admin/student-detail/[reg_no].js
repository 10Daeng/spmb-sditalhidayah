export const prerender = false;

import { supabaseAdmin } from "../../../../lib/supabase";
import { requireAuth } from "../../../../lib/auth";

export async function GET({ request, params }) {
    const auth = await requireAuth(request, ['super_admin', 'admin_tu', 'guru']);
    if (!auth.authorized) return auth.response;

    const { reg_no } = params;

    try {
        const { data, error } = await supabaseAdmin
            .from('students')
            .select(`
                *,
                student_backgrounds (*)
            `)
            .eq('registration_id', reg_no)
            .single();

        if (error) throw error;

        return new Response(JSON.stringify({ data }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}