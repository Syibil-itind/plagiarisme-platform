import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_plagiarism_alert_email(student_email, student_name, teacher_email, assignment_title, class_name, max_score, threshold=70.0):
    """
    Mengirimkan notifikasi email otomatis saat analisis plagiarisme selesai.
    Jika kredensial SMTP dikonfigurasi di .env, email nyata akan dikirimkan.
    Jika tidak, detail email akan dicatat di log console / stdout untuk debugging lokal.
    """
    subject = f"[Pemberitahuan] Analisis Plagiarisme Selesai: {assignment_title}"
    
    # Menghitung batas warning setengah dari threshold
    warning_threshold = threshold * 0.5

    # Template HTML Konten Email 
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background-color: #4f46e5; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Laporan Analisis Plagiarisme</h2>
        </div>
        <div style="padding: 20px;">
          <p>Halo <strong>{student_name}</strong>,</p>
          <p>Analisis deteksi plagiarisme untuk pengumpulan tugas Anda telah selesai diproses.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Kelas:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">{class_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Sesi Tugas:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">{assignment_title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Batas Toleransi:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569;">{threshold:.1f}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Tingkat Kemiripan Maksimal:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: { '#e11d48' if max_score >= threshold else '#d97706' if max_score >= warning_threshold else '#059669' };">
                {max_score:.1f}%
              </td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0;">
            <h4 style="margin: 0 0 5px 0; color: #1e1b4b;">Rekomendasi / Status:</h4>
            <p style="margin: 0; font-size: 13px; color: #475569;">
              {
                f"Indikasi plagiarisme sangat tinggi (melebihi batas toleransi dosen sebesar {threshold}%). Silakan hubungi dosen pengampu untuk melakukan klarifikasi." if max_score >= threshold
                else f"Ditemukan beberapa kecocokan tingkat menengah (mendekati batas toleransi {threshold}%). Pastikan penulisan kutipan dan sitasi Anda sudah benar." if max_score >= warning_threshold
                else "Tingkat kesamaan aman. Tugas Anda menunjukkan integritas akademik yang sangat baik."
              }
            </p>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 30px;">
            Laporan ini dibuat secara otomatis oleh sistem deteksi plagiarisme.
          </p>
        </div>
      </body>
    </html>
    """

    print("\n" + "="*50)
    print("MOCK EMAIL OUTBOX (Lokal/Console Logging)")
    print(f"Kepada: {student_email} (Dosen CC: {teacher_email})")
    print(f"Subjek: {subject}")
    print(f"Skor Maksimal: {max_score:.1f}% (Batas Toleransi Dosen: {threshold:.1f}%)")
    print("="*50 + "\n")

    # Ambil konfigurasi SMTP dari env
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = os.getenv('SMTP_PORT', '587')
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASSWORD')
    smtp_from = os.getenv('SMTP_FROM', 'no-reply@plagiarismchecker.edu')

    if smtp_server and smtp_user and smtp_pass:
        try:
            # Bangun email MIME
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_from
            msg['To'] = student_email
            msg['Cc'] = teacher_email

            part = MIMEText(html_content, 'html')
            msg.attach(part)

            # Kirim lewat server SMTP
            server = smtplib.SMTP(smtp_server, int(smtp_port))
            server.starttls()
            server.login(smtp_user, smtp_pass)
            
            # Kumpulkan seluruh penerima (To + Cc)
            recipients = [student_email, teacher_email]
            server.sendmail(smtp_from, recipients, msg.as_string())
            server.quit()
            print("[Email] Email notifikasi nyata berhasil terkirim melalui SMTP!")
            return True
        except Exception as e:
            print(f"[Email ERROR] Gagal mengirim email nyata melalui SMTP: {str(e)}")
            return False
    else:
        print("[Email] Kredensial SMTP tidak lengkap. Notifikasi dikirim ke Log Console saja.")
        return True
