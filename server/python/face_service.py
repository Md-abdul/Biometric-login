import os
import sys
import base64
import json
import logging
import numpy as np
import cv2
from flask import Flask, request, jsonify
import insightface
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("InsightFaceService")

# Initialize Flask app
app = Flask(__name__)

# Initialize InsightFace FaceAnalysis Model
MODEL_NAME = os.getenv("INSIGHTFACE_MODEL", "buffalo_sc")
logger.info(f"Loading InsightFace model: {MODEL_NAME}...")

try:
    face_app = FaceAnalysis(name=MODEL_NAME, providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=0, det_size=(320, 320))
    logger.info("InsightFace FaceAnalysis engine initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize FaceAnalysis: {e}")
    sys.exit(1)


def decode_base64_image(base64_str):
    """Decodes a base64 or data URL image string into an OpenCV BGR numpy image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Image decode error: {e}")
        return None


def normalize_embedding(emb):
    """Ensures embedding is L2 normalized."""
    norm = np.linalg.norm(emb)
    if norm == 0:
        return emb
    return emb / norm


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "InsightFace Face Biometrics Microservice",
        "model": MODEL_NAME,
        "framework": "InsightFace + ONNX Runtime (CPU)",
        "version": insightface.__version__
    })


@app.route("/extract-face", methods=["POST"])
def extract_face():
    """
    Extracts face embedding and bounding box from an image.
    Enforces that exactly ONE face is present in the frame.
    """
    data = request.get_json(force=True, silent=True)
    if not data or "image" not in data:
        return jsonify({"success": False, "error": "No image payload provided"}), 400

    img = decode_base64_image(data["image"])
    if img is None:
        return jsonify({"success": False, "error": "Invalid image data. Could not decode."}), 400

    try:
        faces = face_app.get(img)
    except Exception as e:
        logger.error(f"Error during face detection: {e}")
        return jsonify({"success": False, "error": f"Face detection error: {str(e)}"}), 500

    if len(faces) == 0:
        return jsonify({
            "success": False,
            "faceCount": 0,
            "error": "No face detected in the image. Please position your face clearly in the center and ensure good lighting."
        }), 422

    if len(faces) > 1:
        return jsonify({
            "success": False,
            "faceCount": len(faces),
            "error": f"Multiple faces ({len(faces)}) detected. Please ensure only one person is in front of the camera."
        }), 422

    target_face = faces[0]
    raw_emb = target_face.embedding
    norm_emb = normalize_embedding(raw_emb)

    bbox = [int(coord) for coord in target_face.bbox]
    det_score = float(target_face.det_score)

    age = int(getattr(target_face, 'age', 0)) if hasattr(target_face, 'age') and target_face.age is not None else None
    gender = int(getattr(target_face, 'gender', 0)) if hasattr(target_face, 'gender') and target_face.gender is not None else None

    return jsonify({
        "success": True,
        "faceCount": 1,
        "detScore": round(det_score, 4),
        "bbox": bbox,
        "embedding": norm_emb.tolist(),
        "age": age,
        "gender": gender,
        "message": "Face detected and biometric feature vector extracted successfully."
    })


@app.route("/match-face", methods=["POST"])
def match_face():
    """
    Extracts face from the incoming image and matches against a list of registered employees.
    """
    data = request.get_json(force=True, silent=True)
    if not data or "image" not in data:
        return jsonify({"success": False, "error": "No image payload provided"}), 400

    registered_employees = data.get("registeredEmployees", [])
    if not registered_employees:
        return jsonify({
            "success": False,
            "error": "No registered employees found in the database. Please register an employee face first."
        }), 400

    threshold = float(data.get("threshold", 0.50))

    img = decode_base64_image(data["image"])
    if img is None:
        return jsonify({"success": False, "error": "Invalid image data. Could not decode."}), 400

    try:
        faces = face_app.get(img)
    except Exception as e:
        logger.error(f"Error during face matching detection: {e}")
        return jsonify({"success": False, "error": f"Face detection error: {str(e)}"}), 500

    if len(faces) == 0:
        return jsonify({
            "success": False,
            "faceCount": 0,
            "error": "No face detected in the image. Please position your face clearly in the camera frame."
        }), 422

    if len(faces) > 1:
        return jsonify({
            "success": False,
            "faceCount": len(faces),
            "error": f"Multiple faces ({len(faces)}) detected. Please ensure only one person is in front of the camera."
        }), 422

    target_face = faces[0]
    query_emb = normalize_embedding(target_face.embedding)
    bbox = [int(coord) for coord in target_face.bbox]
    det_score = float(target_face.det_score)

    best_match = None
    best_similarity = -1.0

    for emp in registered_employees:
        emp_emb = emp.get("embedding")
        if not emp_emb:
            continue

        try:
            reg_vec = np.array(emp_emb, dtype=np.float32)
            reg_vec = normalize_embedding(reg_vec)
            similarity = float(np.dot(query_emb, reg_vec))

            if similarity > best_similarity:
                best_similarity = similarity
                best_match = emp
        except Exception as e:
            logger.warning(f"Error computing similarity for {emp.get('employeeCode')}: {e}")
            continue

    if best_match and best_similarity >= threshold:
        confidence_pct = round(best_similarity * 100, 2)
        return jsonify({
            "success": True,
            "matched": True,
            "employeeCode": best_match.get("employeeCode"),
            "employeeName": best_match.get("name"),
            "department": best_match.get("department"),
            "designation": best_match.get("designation"),
            "similarity": round(best_similarity, 4),
            "confidencePercent": confidence_pct,
            "bbox": bbox,
            "detScore": round(det_score, 4),
            "message": f"Biometric match confirmed with {confidence_pct}% confidence."
        })
    else:
        return jsonify({
            "success": True,
            "matched": False,
            "similarity": round(best_similarity, 4) if best_similarity >= 0 else 0,
            "threshold": threshold,
            "bbox": bbox,
            "error": "Face not recognized. Biometric profile does not match any registered employee."
        })


if __name__ == "__main__":
    port = int(os.getenv("PYTHON_SERVICE_PORT", 5001))
    logger.info(f"Starting InsightFace microservice on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
