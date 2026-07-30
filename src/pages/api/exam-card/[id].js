
export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

export async function GET({ params }) {
    const { id } = params;

    try {
        // 1. Fetch Data
        const { data: registration, error } = await supabaseAdmin
            .from('registrations')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !registration) {
            return new Response('Data not found', { status: 404 });
        }
        
        // Fetch student for details
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('profile_photo_url, gender, date_of_birth, place_of_birth')
            .eq('registration_id', registration.registration_number)
            .single();

        // 1.5 Generate QR Code
        const qrUrl = `https://www.sditalhidayahsumenep.sch.id/admin/verifikasi?search=${registration.registration_number}`;
        const qrImageDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 80 });

        // 2. Create PDF
        const doc = new PDFDocument({ size: 'A5', margin: 30 });
        
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        
        return new Promise((resolve) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(new Response(pdfBuffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="Kartu_Ujian_${registration.registration_number}.pdf"`,
                    }
                }));
            });

            // --- PDF Content ---
            // LOGO (Check if exists in public)
            const logoPath = path.resolve('./public/logo-sdit.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 30, 30, { width: 50 });
            }

            // HEADER
            doc.font('Helvetica-Bold').fontSize(14).text('SDIT AL-HIDAYAH SUMENEP', 90, 35);
            doc.fontSize(10).font('Helvetica').text('Jl. Siwalan - Pangarangan - Sumenep', 90, 52);
            doc.text('Telp: (0328) 662589 | Web: https://www.sditalhidayahsumenep.sch.id', 90, 65);
            
            // LINE
            doc.moveDown(1);
            doc.moveTo(30, 85).lineTo(390, 85).stroke();
            doc.moveDown(0.5);

            // TITLE
            doc.font('Helvetica-Bold').fontSize(16).text('KARTU PESERTA SELEKSI SPMB', { align: 'center' });
            doc.fontSize(12).text('TAHUN PELAJARAN 2026/2027', { align: 'center' });
            doc.moveDown(1);

            // PHOTO BOX (Centered)
            const photoW = 80;
            const photoH = 100;
            const photoX = (doc.page.width - photoW) / 2; // Center horizontally
            let currentY = doc.y;

            doc.rect(photoX, currentY, photoW, photoH).stroke();
            doc.fontSize(8).font('Helvetica').text('FOTO 3x4', photoX, currentY + 45, { width: photoW, align: 'center' });
            
            // Move Y down past the photo
            currentY += photoH + 20;
            
            // INFO (Below Photo)
            const labelX = 50;
            const valueX = 160;
            const lineHeight = 18;

            doc.fontSize(11).font('Helvetica');

            // No Pendaftaran
            doc.text('No. Pendaftaran', labelX, currentY);
            doc.text(':', 145, currentY);
            doc.font('Helvetica-Bold').text(registration.registration_number, valueX, currentY);
            currentY += lineHeight;

            // Nama Lengkap
            doc.font('Helvetica').text('Nama Lengkap', labelX, currentY);
            doc.text(':', 145, currentY);
            doc.font('Helvetica-Bold').text(registration.student_full_name, valueX, currentY);
            currentY += lineHeight;

            // TTL
            const ttl = student ? `${student.place_of_birth || ''}, ${student.date_of_birth || ''}` : '-';
            doc.font('Helvetica').text('Tempat, Tgl Lahir', labelX, currentY);
            doc.text(':', 145, currentY);
            doc.text(ttl, valueX, currentY);
            currentY += lineHeight;

            // Jenis Kelamin
            const jk = student?.gender === 'L' ? 'Laki-laki' : 'Perempuan';
            doc.font('Helvetica').text('Jenis Kelamin', labelX, currentY);
            doc.text(':', 145, currentY);
            doc.text(jk, valueX, currentY);
            currentY += lineHeight;

             // Orang Tua
            doc.font('Helvetica').text('Nama Orang Tua', labelX, currentY);
            doc.text(':', 145, currentY);
            doc.text(registration.parent_name, valueX, currentY);
            currentY += lineHeight;

            // TAHAPAN SELEKSI
            currentY += 20;
            doc.font('Helvetica-Bold').fontSize(11).text('TAHAPAN SELEKSI:', labelX, currentY);
            currentY += lineHeight;
            
            doc.rect(labelX, currentY, 320, 115).stroke();
            doc.font('Helvetica').fontSize(10);
            
            const tahapanX = labelX + 15;
            let tahapanY = currentY + 10;
            const tahapanLineHeight = 14;

            doc.text('1. Pendaftaran', tahapanX, tahapanY); tahapanY += tahapanLineHeight;
            doc.text('2. Pembayaran', tahapanX, tahapanY); tahapanY += tahapanLineHeight;
            doc.text('3. Verifikasi Data', tahapanX, tahapanY); tahapanY += tahapanLineHeight;
            doc.text('4. Penetapan Calon Peserta', tahapanX, tahapanY); tahapanY += tahapanLineHeight;
            doc.text('5. Assesment (Psikologis, Observasi)', tahapanX, tahapanY); tahapanY += tahapanLineHeight;
            doc.text('6. Wawancara Orangtua', tahapanX, tahapanY); tahapanY += tahapanLineHeight;
            doc.text('7. Pengumuman', tahapanX, tahapanY); tahapanY += tahapanLineHeight;

            // FOOTER / SIGNATURE
            currentY += 135;
            
            // Signature Block
            doc.fontSize(10).text('Sumenep, ......................', 250, currentY);
            doc.text('Panitia SPMB,', 250, currentY + 15);
            doc.text('( ................................. )', 250, currentY + 60);

            // QR Code (Bottom Left)
            // Need to convert dataUrl to buffer to embed
            if (qrImageDataUrl) {
                const base64Data = qrImageDataUrl.replace(/^data:image\/png;base64,/, "");
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, 30, currentY, { width: 70 });
                doc.fontSize(7).text('Scan untuk verifikasi', 30, currentY + 75, { width: 70, align: 'center' });
            }

            doc.end();
        });

    } catch (err) {
        console.error('PDF Gen Error:', err);
        return new Response('Failed to generate PDF', { status: 500 });
    }
}
