import sys
import insightface
from insightface.app import FaceAnalysis

print("Initializing FaceAnalysis...")
try:
    app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(320, 320))
    print("SUCCESS: FaceAnalysis prepared successfully!")
except Exception as e:
    print("ERROR:", e)
