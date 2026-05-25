import io
import zipfile
from pypdf import PdfReader
import docx2txt

def extract_text_from_pdf(file_stream) -> str:
    """
    Ekstraksi teks dari berkas PDF menggunakan library pypdf.
    """
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Gagal memproses file PDF: {str(e)}")

def extract_text_from_docx(file_stream) -> str:
    """
    Ekstraksi teks dari berkas Word (.docx) menggunakan library docx2txt.
    """
    try:
        # docx2txt membutuhkan file path atau stream objek bertipe bytes
        text = docx2txt.process(file_stream)
        return text.strip()
    except Exception as e:
        raise ValueError(f"Gagal memproses file DOCX: {str(e)}")

def extract_texts_from_zip(file_stream) -> list:
    """
    Ekstraksi teks dari semua berkas PDF, DOCX, dan TXT di dalam file kompresi ZIP.
    Mengembalikan daftar kamus data berisi nama file dan konten teksnya.
    """
    documents = []
    try:
        with zipfile.ZipFile(file_stream) as archive:
            for file_info in archive.infolist():
                # Abaikan direktori kosong
                if file_info.is_dir():
                    continue
                
                filename = file_info.filename
                # Filter tipe file yang didukung
                ext = filename.split('.')[-1].lower()
                
                if ext not in ['txt', 'pdf', 'docx']:
                    continue
                
                # Baca file ke dalam memori
                with archive.open(file_info) as file_data:
                    file_bytes = io.BytesIO(file_data.read())
                    text = ""
                    
                    if ext == 'txt':
                        text = file_bytes.getvalue().decode('utf-8', errors='ignore')
                    elif ext == 'pdf':
                        text = extract_text_from_pdf(file_bytes)
                    elif ext == 'docx':
                        text = extract_text_from_docx(file_bytes)
                        
                    if text.strip():
                        documents.append({
                            "filename": filename,
                            "text": text.strip()
                        })
        return documents
    except Exception as e:
        raise ValueError(f"Gagal memproses arsip ZIP: {str(e)}")

def parse_file(file_storage) -> list:
    """
    Mendeteksi ekstensi file upload dari Flask FileStorage,
    melakukan parsing, dan mengembalikan daftar berkas teks.
    """
    filename = file_storage.filename
    ext = filename.split('.')[-1].lower()
    
    file_bytes = io.BytesIO(file_storage.read())
    
    if ext == 'txt':
        text = file_bytes.getvalue().decode('utf-8', errors='ignore')
        return [{"filename": filename, "text": text.strip()}]
    elif ext == 'pdf':
        text = extract_text_from_pdf(file_bytes)
        return [{"filename": filename, "text": text}]
    elif ext == 'docx':
        text = extract_text_from_docx(file_bytes)
        return [{"filename": filename, "text": text}]
    elif ext == 'zip':
        return extract_texts_from_zip(file_bytes)
    else:
        raise ValueError(f"Tipe file .{ext} tidak didukung! Gunakan .txt, .pdf, .docx, atau .zip")


def parse_file_from_bytes(file_bytes_data: bytes, filename: str) -> list:
    """
    Mendeteksi ekstensi file dari data bytes mentah dan nama filenya,
    melakukan parsing, dan mengembalikan daftar berkas teks.
    """
    ext = filename.split('.')[-1].lower()
    file_bytes = io.BytesIO(file_bytes_data)
    
    if ext == 'txt':
        text = file_bytes.getvalue().decode('utf-8', errors='ignore')
        return [{"filename": filename, "text": text.strip()}]
    elif ext == 'pdf':
        text = extract_text_from_pdf(file_bytes)
        return [{"filename": filename, "text": text}]
    elif ext == 'docx':
        text = extract_text_from_docx(file_bytes)
        return [{"filename": filename, "text": text}]
    elif ext == 'zip':
        return extract_texts_from_zip(file_bytes)
    else:
        raise ValueError(f"Tipe file .{ext} tidak didukung! Gunakan .txt, .pdf, .docx, atau .zip")
