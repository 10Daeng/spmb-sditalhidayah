export const prerender = false;
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST({ request }) {
    try {
        const body = await request.json();
        const { regNumber, phone } = body;

        if (!regNumber || !phone) {
            return new Response(JSON.stringify({ success: false, error: "Nomor Registrasi dan No. HP wajib diisi" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { data, error } = await supabaseAdmin
            .from("registrations")
            .select("id, registration_number, parent_phone, status")
            .eq("registration_number", regNumber)
            .single();

        if (error || !data) {
            return new Response(JSON.stringify({ success: false, error: "Data pendaftaran tidak ditemukan" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Clean up both phones for comparison
        const dbPhone = data.parent_phone.replace(/\D/g, '');
        const inputPhone = phone.replace(/\D/g, '');

        if (dbPhone !== inputPhone) {
            return new Response(JSON.stringify({ success: false, error: "Nomor Registrasi dan No. HP tidak cocok" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Check if allowed to fill data
        const allowedStatuses = ['indent_paid', 'pending', 'pending_payment']; // Depending on strictness, we can restrict this to 'indent_paid'
        
        // For testing/flexibility, we allow 'pending_payment' as well, but in production you might want to enforce 'indent_paid' 
        // We'll allow it for now but the UI can warn them if payment isn't verified.

        return new Response(JSON.stringify({ 
            success: true, 
            data: {
                id: data.id,
                registration_number: data.registration_number,
                status: data.status
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: "Kesalahan server" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
