-- Mengaktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('dosen', 'mahasiswa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL CLASSES
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    code VARCHAR(10) UNIQUE NOT NULL, -- Kode unik bagi mahasiswa untuk bergabung ke kelas
    dosen_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL CLASS ENROLLMENTS (Relasi Many-to-Many Mahasiswa <-> Kelas)
CREATE TABLE IF NOT EXISTS class_enrollments (
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    mahasiswa_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (class_id, mahasiswa_id)
);

-- 4. TABEL ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    mahasiswa_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL, -- Menyimpan URL file dokumen di Supabase Storage
    file_name VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABEL SIMILARITY RESULTS
CREATE TABLE IF NOT EXISTS similarity_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_a_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    submission_b_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    similarity_score NUMERIC(5, 2) NOT NULL CHECK (similarity_score >= 0.00 AND similarity_score <= 100.00),
    overlap_details JSONB, -- Menyimpan detail penemuan kecocokan teks (misal indeks kata/kalimat yang mirip)
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_different_submissions CHECK (submission_a_id <> submission_b_id)
);

-- INDEXES UNTUK OPTIMALISASI PENCARIAN & PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_classes_dosen ON classes(dosen_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_mahasiswa ON class_enrollments(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_mahasiswa ON submissions(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_similarity_submissions ON similarity_results(submission_a_id, submission_b_id);
CREATE INDEX IF NOT EXISTS idx_similarity_score ON similarity_results(similarity_score);

-- MENONAKTIFKAN RLS AGAR TIDAK MEMBLOKIR AKSEK DARI BACKEND
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_results DISABLE ROW LEVEL SECURITY;

-- 7. KONFIGURASI STORAGE BUCKET TUGAS-MAHASISWA & POLICY STORAGE OBJECTS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tugas-mahasiswa', 'tugas-mahasiswa', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public upload tugas-mahasiswa" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select tugas-mahasiswa" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update tugas-mahasiswa" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete tugas-mahasiswa" ON storage.objects;

CREATE POLICY "Allow public upload tugas-mahasiswa" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tugas-mahasiswa');
CREATE POLICY "Allow public select tugas-mahasiswa" ON storage.objects FOR SELECT USING (bucket_id = 'tugas-mahasiswa');
CREATE POLICY "Allow public update tugas-mahasiswa" ON storage.objects FOR UPDATE USING (bucket_id = 'tugas-mahasiswa');
CREATE POLICY "Allow public delete tugas-mahasiswa" ON storage.objects FOR DELETE USING (bucket_id = 'tugas-mahasiswa');
