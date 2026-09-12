import React, { useEffect, useRef, useState } from 'react';

// Reusable webcam capture modal -- used by both the "+Add New Case" and
// "Add Evidence" dropzones (see CaseFilesPage.jsx). This component's ONLY
// job is turning a live camera frame into a plain File object; it hands
// that File to the exact same handleFilesPicked/handleEvidenceFilesPicked
// functions a manually-picked file already goes through via onCapture([file])
// -- there is no separate webcam upload call anywhere. By the time the rest
// of the app (and the backend) sees this file, it's indistinguishable from
// one chosen through the OS file picker.
export default function WebcamCaptureModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (cancelled) return;
        // Two failure modes an officer will actually hit in the field: no
        // permission granted, or no camera hardware present at all -- a
        // clear message either way, never a raw DOMException / a crash.
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access was denied. Allow camera permission for this site in your browser and try again, or use "Choose Files" instead.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera was found on this device. Use "Choose Files" instead.');
        } else {
          setError(`Could not access the camera: ${err.message || err.name || 'unknown error'}. Use "Choose Files" instead.`);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
  };

  const handleUsePhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `webcam-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    // The single integration point with the rest of the app -- an array
    // containing one File is exactly what Array.from() already produces
    // from a real <input type="file"> FileList, so the caller's existing
    // handler needs no changes at all to accept this.
    onCapture([file]);
    handleClose();
  };

  const handleClose = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="tactical-modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--stamp-red)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'IBM Plex Mono, monospace' }}>
              ● WEBCAM DOCUMENT CAPTURE
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
              Capture a Physical Document
            </h3>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', fontSize: '18px', cursor: 'pointer', padding: '2px 6px' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', padding: '10px 12px', borderRadius: '3px', fontSize: '11.5px', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {!error && (
          <div style={{ position: 'relative', background: '#000', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px', aspectRatio: '4 / 3' }}>
            {capturedUrl ? (
              <img src={capturedUrl} alt="Captured document preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="add-case-form-actions">
          {error ? (
            <button type="button" className="add-case-cancel-btn" onClick={handleClose}>
              Close
            </button>
          ) : capturedUrl ? (
            <>
              <button type="button" className="add-case-submit-btn" onClick={handleUsePhoto}>
                Use Photo
              </button>
              <button type="button" className="add-case-cancel-btn" onClick={handleRetake}>
                Retake
              </button>
            </>
          ) : (
            <>
              <button type="button" className="add-case-submit-btn" onClick={handleCapture}>
                📸 Capture
              </button>
              <button type="button" className="add-case-cancel-btn" onClick={handleClose}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
