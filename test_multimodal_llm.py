import os
from PIL import Image
from src.multimodal_llm_inference import UnifiedMultimodalLLMPredictor

def test_unified_predictor():
    print("Testing UnifiedMultimodalLLMPredictor...")
    predictor = UnifiedMultimodalLLMPredictor()
    
    # Create a synthetic dummy mammogram image
    img_path = "temp_dummy_mammogram.png"
    img = Image.new('RGB', (224, 224), color = (100, 100, 100))
    img.save(img_path)
    
    clinical_data = {
        "age": 52,
        "family_history": "positive",
        "density_score": 3,
        "symptoms": "palpable lump in left breast"
    }
    
    try:
        res = predictor.predict(img_path, clinical_data)
        print("--- Diagnostic Result ---")
        print(f"Prediction: {res.prediction}")
        print(f"Confidence: {res.confidence}")
        print(f"Reasoning: {res.reasoning}")
        print(f"Recommendations: {res.recommendations}")
        print("TEST PASSED SUCCESSFULLY!")
    finally:
        if os.path.exists(img_path):
            os.remove(img_path)

if __name__ == "__main__":
    test_unified_predictor()
