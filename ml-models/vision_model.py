"""
EcoSpark - AI Vision Verification Model (Mock)
This module simulates the backend Python infrastructure for processing image submissions
and determining if an eco-task was successfully completed.

In production, this interfaces with Google Gemini Vision API to analyze user uploads
for sustainability metrics (CO2 saved, water saved, waste reduced).
"""

import os
import json
import random
import time
from datetime import datetime

class EcoSparkVisionModel:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.5-flash"
        self.confidence_threshold = 0.65
        
        # Load pre-trained weights (simulated)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading {self.model_name} weights for EcoSpark verification...")
        time.sleep(1.5)
        print("Model loaded successfully.")

    def analyze_submission(self, image_path, task_category):
        """
        Analyzes an image submission against the task category criteria.
        Returns a JSON string containing approval status and confidence score.
        """
        print(f"Processing image: {image_path} for category: {task_category}")
        
        # Simulated analysis delay
        time.sleep(2.0)
        
        # Simulate AI analysis based on category
        confidence = random.uniform(0.4, 0.99)
        
        if confidence >= self.confidence_threshold:
            result = {
                "approved": True,
                "confidence": round(confidence, 2),
                "reason": f"Image clearly shows activity related to {task_category}.",
                "metrics": self._calculate_impact(task_category)
            }
        else:
            result = {
                "approved": False,
                "confidence": round(confidence, 2),
                "reason": "Image quality is too low or does not clearly match the task criteria.",
                "metrics": {"co2": 0, "water": 0, "waste": 0}
            }
            
        return json.dumps(result, indent=2)

    def _calculate_impact(self, category):
        """Calculates environmental impact based on the task category."""
        impact_factors = {
            "planting": {"co2": 2.5, "water": 0, "waste": 0},
            "recycling": {"co2": 0.5, "water": 0, "waste": 1.2},
            "energy_saving": {"co2": 1.5, "water": 0, "waste": 0},
            "water_conservation": {"co2": 0, "water": 5.0, "waste": 0}
        }
        return impact_factors.get(category, {"co2": 0.5, "water": 0.5, "waste": 0.5})

# --- Example Usage (For Evaluator Testing) ---
if __name__ == "__main__":
    verifier = EcoSparkVisionModel()
    
    test_image = "uploads/user_123_tree_planting.jpg"
    print("\n--- Running Test Submission ---")
    response_json = verifier.analyze_submission(test_image, "planting")
    
    print("\nAI Response:")
    print(response_json)
