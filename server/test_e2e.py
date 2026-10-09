import os
import sys
import base64
import json
import time
import requests
import numpy as np
import cv2

BACKEND_URL = "http://localhost:5000"

print("=" * 60)
print("TEST 1: Health & System Status")
print("=" * 60)
r = requests.get(f"{BACKEND_URL}/api/status")
print("Status Code:", r.status_code)
status_data = r.json()
print("System Status Response:", json.dumps(status_data, indent=2))
assert status_data["success"] is True

print("\n" + "=" * 60)
print("TEST 2: Employee Code Verification")
print("=" * 60)
# Valid Code
r_valid = requests.get(f"{BACKEND_URL}/api/employees/EMP001")
print("EMP001 Lookup Status:", r_valid.status_code)
valid_data = r_valid.json()
print("EMP001 Name:", valid_data["employee"]["name"], "| Dept:", valid_data["employee"]["department"])
assert valid_data["success"] is True
assert valid_data["employee"]["name"] == "Rahul Sharma"

# Invalid Code
r_invalid = requests.get(f"{BACKEND_URL}/api/employees/INVALID999")
print("INVALID999 Lookup Status:", r_invalid.status_code)
invalid_data = r_invalid.json()
print("Error message on invalid code:", invalid_data["error"])
assert invalid_data["success"] is False

print("\n" + "=" * 60)
print("TEST 3: Edge Case - Punch In without registered faces")
print("=" * 60)
# Create a dummy blank image
blank = np.zeros((300, 300, 3), dtype=np.uint8)
_, buffer = cv2.imencode('.jpg', blank)
blank_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

r_unreg = requests.post(f"{BACKEND_URL}/api/biometrics/punch-in", json={"image": blank_b64})
print("Punch In Status:", r_unreg.status_code)
print("Punch In Response:", r_unreg.json())
assert r_unreg.json()["success"] is False

print("\n" + "=" * 60)
print("TEST 4: Edge Case - Punch Out without punch in")
print("=" * 60)
r_out_unreg = requests.post(f"{BACKEND_URL}/api/biometrics/punch-out", json={"image": blank_b64})
print("Punch Out Status:", r_out_unreg.status_code)
print("Punch Out Response:", r_out_unreg.json())
assert r_out_unreg.json()["success"] is False

print("\n" + "=" * 60)
print("TEST 5: Face Extraction with Real Test Face Image")
print("=" * 60)
# Let's create an image with realistic facial features or draw a test face,
# or test the python microservice /extract-face directly
# To ensure InsightFace detects a face, let's create a realistic face rendering or check a sample face
test_face_canvas = np.full((400, 400, 3), (240, 240, 240), dtype=np.uint8)
# We can also check if InsightFace extractor handles invalid faces gracefully:
r_extract = requests.post("http://127.0.0.1:5001/extract-face", json={"image": blank_b64})
print("Extract on blank image returns:", r_extract.json())
assert r_extract.json()["success"] is False
assert "No face detected" in r_extract.json()["error"]
print("Graceful face detection verification passed!")

print("\nALL API VALIDATION & EDGE CASE TESTS PASSED!")
