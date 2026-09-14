document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const uploadZone = document.getElementById('uploadZone');
    const uploadLabel = uploadZone ? uploadZone.querySelector('label') : null;
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const submitBtn = document.getElementById('submitBtn');
    
    const resultContainer = document.getElementById('resultContainer');
    const resultClass = document.getElementById('resultClass');
    // const resultConfidence = document.getElementById('resultConfidence');
    const errorMessage = document.getElementById('errorMessage');

    // Endpoint FastAPI
    const API_URL = 'https://farhanangga89-ai-image-detection.hf.space/predict';

    // Fungsi terpusat untuk memproses dan menampilkan preview gambar
    function processFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            
            // Reset area hasil setiap kali gambar baru dipilih
            resultContainer.classList.add('hidden');
            errorMessage.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }

    // Event Listener untuk memunculkan preview gambar saat file dipilih lewat tombol
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        processFile(file);
    });

    // Implementasi Fitur Drag & Drop
    if (uploadLabel) {
        // Efek visual saat file diseret di atas area upload
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadLabel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadLabel.classList.add('border-indigo-500', 'bg-slate-800/60');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadLabel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadLabel.classList.remove('border-indigo-500', 'bg-slate-800/60');
            }, false);
        });

        // Tangani event drop file
        uploadLabel.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    // Sync dengan elemen input file
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    imageInput.files = dataTransfer.files;

                    processFile(file);
                }
            }
        });
    }

    // Cegah perilaku default browser (membuka gambar di tab baru saat dropped di luar dropzone)
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    // Event Listener untuk mengganti dan menghapus gambar
    const changeImageBtn = document.getElementById('changeImageBtn');
    const clearImageBtn = document.getElementById('clearImageBtn');

    if (changeImageBtn) {
        changeImageBtn.addEventListener('click', () => {
            imageInput.click();
        });
    }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', () => {
            imageInput.value = '';
            previewContainer.classList.add('hidden');
            resultContainer.classList.add('hidden');
            errorMessage.classList.add('hidden');
        });
    }

    // Event Listener saat form disubmit
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah halaman reload

        const file = imageInput.files[0];
        if (!file) return;

        // Siapkan objek FormData untuk dikirim sebagai multipart/form-data
        const formData = new FormData();
        formData.append('file', file); // 'file' adalah key yang akan dibaca oleh FastAPI

        // Ubah state tombol menjadi loading
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-3 inline-block text-white" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Memproses...
        `;

        try {
            // Melakukan request HTTP POST ke FastAPI
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parsing respons JSON dari FastAPI
            const data = await response.json();

            // Tampilkan hasil
            resultContainer.classList.remove('hidden');
            errorMessage.classList.add('hidden');
            
            // Asumsi respons FastAPI berbentuk: {"class": "Real", "confidence": "98.5%"}
            // Sesuaikan properti JSON ini dengan format yang Anda return di main.py nanti
            resultClass.textContent = data.class;
            // resultConfidence.textContent = data.confidence;

        } catch (error) {
            console.error('Error saat melakukan prediksi:', error);
            
            // Tampilkan error di UI
            resultContainer.classList.remove('hidden');
            resultClass.textContent = '-';
            // resultConfidence.textContent = '-';
            errorMessage.textContent = 'Gagal menghubungi server. Pastikan backend FastAPI sedang berjalan.';
            errorMessage.classList.remove('hidden');
        } finally {
            // Kembalikan tombol ke state semula
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
});