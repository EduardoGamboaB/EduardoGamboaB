// Carga de face-api.js (offline) y utilidades de cámara/reconocimiento facial.
// Los modelos se sirven localmente desde /models (sin dependencias externas).

let loadingPromise = null;

export function faceReady() {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    if (!window.faceapi) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/vendor/faceapi/face-api.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('No se pudo cargar face-api'));
        document.head.appendChild(s);
      });
    }
    const faceapi = window.faceapi;
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]);
    return faceapi;
  })();
  return loadingPromise;
}

export function hasCamera() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {});
  return stream;
}

export function stopCamera(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

// Detecta un rostro y devuelve { descriptor:[128], detection } o null.
export async function detectFace(source) {
  const faceapi = await faceReady();
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const result = await faceapi.detectSingleFace(source, opts).withFaceLandmarks().withFaceDescriptor();
  if (!result) return null;
  return { descriptor: Array.from(result.descriptor), box: result.detection.box, score: result.detection.score };
}

// Captura un cuadro del video a un data URL JPEG reducido (para foto de referencia).
export function snapshot(videoEl, size = 200) {
  const vw = videoEl.videoWidth || 640, vh = videoEl.videoHeight || 480;
  const side = Math.min(vw, vh);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(videoEl, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.7);
}
