import base64
import json
import time
import requests

BACKEND_URL = "http://localhost:5000"

with open("sample_face_rahul.jpg", "rb") as f:
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

print("=" * 65)
print("STAGE 1: Register Face Biometrics for EMP001 (Rahul Sharma)")
print("=" * 65)

reg_res = requests.post(f"{BACKEND_URL}/api/biometrics/register", json={
    "employeeCode": "EMP001",
    "image": img_b64
})
print("Registration Status:", reg_res.status_code)
reg_data = reg_res.json()
print("Registration Response:", json.dumps(reg_data, indent=2))
assert reg_data["success"] is True
assert reg_data["employee"]["employeeCode"] == "EMP001"
print(">>> STAGE 1 PASSED: Face biometric enrolled in PostgreSQL!")

time.sleep(1)

print("\n" + "=" * 65)
print("STAGE 2: Biometric Punch In (Via Face Recognition)")
print("=" * 65)

punch_in_res = requests.post(f"{BACKEND_URL}/api/biometrics/punch-in", json={
    "image": img_b64
})
print("Punch In Status:", punch_in_res.status_code)
in_data = punch_in_res.json()
print("Punch In Response:", json.dumps(in_data, indent=2))
assert in_data["success"] is True
assert in_data["employee"]["employeeCode"] == "EMP001"
assert in_data["confidencePercent"] > 80.0
print(f">>> STAGE 2 PASSED: Face recognized as {in_data['employee']['name']} with {in_data['confidencePercent']}% confidence! Punch In recorded.")

time.sleep(1)

print("\n" + "=" * 65)
print("STAGE 3: Edge Case Test - Duplicate Punch In while On Duty")
print("=" * 65)

dup_in_res = requests.post(f"{BACKEND_URL}/api/biometrics/punch-in", json={
    "image": img_b64
})
print("Duplicate Punch In Status:", dup_in_res.status_code)
dup_data = dup_in_res.json()
print("Duplicate Punch In Response:", json.dumps(dup_data, indent=2))
assert dup_data["success"] is False
assert dup_data["alreadyPunchedIn"] is True
print(">>> STAGE 3 PASSED: Duplicate Punch In blocked cleanly by edge case validation!")

time.sleep(2)

print("\n" + "=" * 65)
print("STAGE 4: Biometric Punch Out (Via Face Recognition)")
print("=" * 65)

punch_out_res = requests.post(f"{BACKEND_URL}/api/biometrics/punch-out", json={
    "image": img_b64
})
print("Punch Out Status:", punch_out_res.status_code)
out_data = punch_out_res.json()
print("Punch Out Response:", json.dumps(out_data, indent=2))
assert out_data["success"] is True
assert out_data["employee"]["employeeCode"] == "EMP001"
assert "totalWorkFormatted" in out_data
print(f">>> STAGE 4 PASSED: Punch Out recorded! Total work time: {out_data['totalWorkFormatted']}")

time.sleep(1)

print("\n" + "=" * 65)
print("STAGE 5: Edge Case Test - Duplicate Punch Out after shift ended")
print("=" * 65)

dup_out_res = requests.post(f"{BACKEND_URL}/api/biometrics/punch-out", json={
    "image": img_b64
})
print("Duplicate Punch Out Status:", dup_out_res.status_code)
dup_out_data = dup_out_res.json()
print("Duplicate Punch Out Response:", json.dumps(dup_out_data, indent=2))
assert dup_out_data["success"] is False
assert dup_out_data["alreadyPunchedOut"] is True
print(">>> STAGE 5 PASSED: Duplicate Punch Out blocked cleanly!")

print("\n" + "=" * 65)
print("STAGE 6: Verify Today's Attendance Session in PostgreSQL")
print("=" * 65)

att_res = requests.get(f"{BACKEND_URL}/api/attendance/today")
att_data = att_res.json()
print("Today's Attendances Count:", len(att_data["attendances"]))
print("Latest Record:", json.dumps(att_data["attendances"][0], indent=2))
assert len(att_data["attendances"]) >= 1
assert att_data["attendances"][0]["status"] == "Completed"
print(">>> STAGE 6 PASSED: Attendance record verified with Completed status!")

print("\n[SUCCESS] ALL 6 STAGES OF THE BIOMETRIC FACE LIFECYCLE PASSED WITH 100% SUCCESS!")
