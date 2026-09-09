from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import io
import torch
import torch.nn as nn
# PERBAIKAN: Menambahkan 'models' pada impor torchvision
from torchvision import transforms, models 
from PIL import Image

app = FastAPI(title="Image Classification API")

# 1. Konfigurasi CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500", 
        "http://localhost:5500"
    ], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Definisikan Arsitektur Model (ConvNeXt Tiny)
def get_convnext_model():
    # Panggil arsitektur dasar
    model = models.convnext_tiny()
    
    # Ambil jumlah fitur input dari classifier bawaan sebelum diganti
    num_features_convnext = model.classifier[-1].in_features
    
    # Ganti classifier terakhir agar sesuai dengan output saat training (2 kelas)
    model.classifier[-1] = nn.Linear(num_features_convnext, 2)
    
    return model

# 3. Load Model
MODEL_PATH = "models/convnext_skripsi.pth"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None

# Urutan kelas SESUAI ABJAD dari nama folder (ai dan real)
CLASS_NAMES = ["AI", "Real"] 

try:
    model = get_convnext_model()
    
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device, weights_only=True))
    
    model.to(device)
    model.eval()
    print("Model ConvNeXt berhasil dimuat!")
except Exception as e:
    print(f"Gagal memuat model: {e}")
    print(f"Pastikan file {MODEL_PATH} ada di dalam direktori yang benar.")

# 4. Transformasi Gambar
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# 5. Endpoint Prediksi
@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model tidak tersedia di server.")

    # Validasi tipe file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File harus berupa gambar.")

    try:
        # Membaca isi file menjadi bytes
        contents = await file.read()
        
        # Buka sebagai gambar menggunakan Pillow
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Terapkan transformasi (resize, tensor, normalize)
        input_tensor = transform(image).unsqueeze(0) 
        input_tensor = input_tensor.to(device)

        # Matikan kalkulasi gradien untuk inferensi
        with torch.no_grad():
            outputs = model(input_tensor)
            
            # Hitung probabilitas menggunakan Softmax
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
            
            # Ambil nilai probabilitas tertinggi dan indeksnya
            confidence, predicted_idx = torch.max(probabilities, 0)
            
            predicted_class = CLASS_NAMES[predicted_idx.item()]
            confidence_percentage = round(confidence.item() * 100, 2)

        return JSONResponse({
            "class": predicted_class,
            "confidence": f"{confidence_percentage}%"
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat memproses gambar: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)