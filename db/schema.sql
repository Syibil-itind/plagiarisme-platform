-- Mengaktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('dosen', 'mahasiswa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL CLASSES
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    code VARCHAR(10) UNIQUE NOT NULL, -- Kode unik bagi mahasiswa untuk bergabung ke kelas
    dosen_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL CLASS ENROLLMENTS (Relasi Many-to-Many Mahasiswa <-> Kelas)
CREATE TABLE class_enrollments (
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    mahasiswa_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (class_id, mahasiswa_id)
);

-- 4. TABEL ASSIGNMENTS
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL SUBMISSIONS
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    mahasiswa_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL, -- Menyimpan URL file dokumen di Supabase Storage
    file_name VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABEL SIMILARITY RESULTS
CREATE TABLE similarity_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_a_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    submission_b_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    similarity_score NUMERIC(5, 2) NOT NULL CHECK (similarity_score >= 0.00 AND similarity_score <= 100.00),
    overlap_details JSONB, -- Menyimpan detail penemuan kecocokan teks (misal indeks kata/kalimat yang mirip)
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_different_submissions CHECK (submission_a_id <> submission_b_id)
);

-- INDEXES UNTUK OPTIMALISASI PENCARIAN & PERFORMANCE
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_classes_dosen ON classes(dosen_id);
CREATE INDEX idx_class_enrollments_mahasiswa ON class_enrollments(mahasiswa_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_mahasiswa ON submissions(mahasiswa_id);
CREATE INDEX idx_similarity_submissions ON similarity_results(submission_a_id, submission_b_id);
CREATE INDEX idx_similarity_score ON similarity_results(similarity_score);
