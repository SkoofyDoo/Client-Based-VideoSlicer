// components/VideoSlicer.jsx
import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function VideoSlicer({
    videoFile,
    onSlicingComplete,
    selection,
    onError,
    onCancel,
    onDownloadComplete,
}) {
    // Speichern der extrahierten Bilder
    const [images, setImages] = useState([]);
    // Fortschrittsanzeige
    const [progress, setProgress] = useState(0);
    // Ladeanzeige
    const [loadingMessage, setLoadingMessage] = useState('');
    // Referenz für Fehlermeldungen
    const messageRef = useRef(null);
    // Referenz für das Videoelement
    const videoRef = useRef(null);
    // Virtuelles Canvas
    const canvasRef = useRef(document.createElement('canvas'));
    const { t } = useTranslation();

    // Konfiguration
    const FRAME_QUALITY = 0.5;
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    const SEEK_TIMEOUT = 15000;

    // Einstellungen für max.Anzahl der Frames pro Auswahltyp
    const frameSettings = {
        CID: 200,
        CIDface: 200,
        CIDhand: 100,
        CIDarm: 100,
        CIDtorso: 100,
        CIDleg: 100,
        CIDfoot: 200,
        CID1rot: 100,
        CID2rot: 200,
        CID3rot: 300,
    };

    // Anzahl der maximalen Frames begrenzen
    const maxFrames = frameSettings[selection] || 300;

    // Hilfsfunktion: Meldung anzeigen (verschwindet nach 5 Sekunden)
    const showMessage = (message) => {
        if (!messageRef.current) return;
        messageRef.current.innerHTML = message;
        setTimeout(() => {
            if (messageRef.current) messageRef.current.innerHTML = '';
        }, 5000);
    };

    // Hauptfunktion: Extrahiert Frames aus einem Video
    const extractFrames = async (file) => {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            const msg = t('Dateigröße überschreitet 500 MB');
            showMessage(msg);
            onError?.(new Error(msg));
            return;
        }

        try {
            // Video-Element erstellen und Datei laden
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.playsInline = true;
            video.muted = true;
            video.preload = 'auto';
            videoRef.current = video;

            // Warten bis Metadaten geladen sind (Breite, Höhe, Dauer)
            await new Promise((resolve) => {
                video.onloadedmetadata = () => resolve();
            });

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const { videoWidth, videoHeight, duration } = video;

            // Canvas-Größe anpassen (auf max. 1024px Breite)
            const maxW = 1024;
            const aspect = videoWidth / videoHeight;
            canvas.width = maxW;
            canvas.height = Math.round(maxW / aspect);

            const interval = duration / maxFrames;
            const frames = [];

            setLoadingMessage(t('Extrahierung...'));
            setProgress(0);

            // Einzelnes Frame zu bestimmter Zeit extrahieren
            const captureFrame = (time) =>
                new Promise((resolve, reject) => {
                    let timerId;
                    const onSeeked = () => {
                        try {
                            // Frame auf Canvas zeichnen
                            ctx.drawImage(
                                video,
                                0,
                                0,
                                canvas.width,
                                canvas.height
                            );
                            // Canvas als JPEG exportieren
                            canvas.toBlob(
                                (blob) => {
                                    if (blob && blob.size > 1000) {
                                        const url = URL.createObjectURL(blob);
                                        frames.push({
                                            url,
                                            blob,
                                            index: frames.length + 1,
                                        });
                                        setProgress(
                                            (100 * frames.length) / maxFrames
                                        );
                                        clearTimeout(timerId);
                                        video.onseeked = null;
                                        resolve();
                                    } else {
                                        clearTimeout(timerId);
                                        video.onseeked = null;
                                        reject(new Error('Empty frame'));
                                    }
                                },
                                'image/jpeg',
                                FRAME_QUALITY
                            );
                        } catch (e) {
                            clearTimeout(timerId);
                            video.onseeked = null;
                            reject(e);
                        }
                    };
                    // Video zu gewünschter Zeit springen lassen
                    video.pause();
                    video.onseeked = onSeeked;
                    video.currentTime = Math.min(
                        Math.max(time, 0),
                        duration - 0.01
                    );
                    // Timeout falls das Springen hängen bleibt
                    timerId = setTimeout(() => {
                        video.onseeked = null;
                        reject(new Error('TIMEOUT'));
                    }, SEEK_TIMEOUT);
                });

            // Schleife: Frames der Reihe nach extrahieren
            for (let i = 0; i < maxFrames; i++) {
                try {
                    await captureFrame(i * interval);
                } catch {
                    /* пропускаем проблемные таймкоды */
                }
            }
            // Ergebnis speichern und Callback auslösen
            setImages(frames);
            setLoadingMessage('');
            onSlicingComplete(frames);
            onDownloadComplete?.();
        } catch (err) {
            setLoadingMessage('');
            setProgress(0);
            onError?.(err);
        }
    };

    // Aufräumen: Speicher freigeben
    const cleanup = () => {
        images.forEach(({ url }) => URL.revokeObjectURL(url));
        setImages([]);
        if (videoRef.current) {
            URL.revokeObjectURL(videoRef.current.src);
            videoRef.current.src = '';
            videoRef.current = null;
        }
    };

    // Effekt: Starte Extraktion sobald neue Datei vorhanden ist
    useEffect(() => {
        if (videoFile) extractFrames(videoFile);
        return () => {
            cleanup();
            onCancel?.();
        };

        // Um die UseEffect-Regel zu ignorieren
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoFile, selection]);

    // Render: Fortschrittsanzeige + Fehlermeldungen
    return (
        <div style={{ touchAction: 'manipulation', padding: '10px' }}>
            {loadingMessage && (
                <div
                    style={{
                        margin: '10px 0',
                        fontSize: '12px',
                        textAlign: 'center',
                    }}
                >
                    <div>{loadingMessage}</div>
                    <div style={{ marginTop: 5 }}>
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            style={{ animation: 'spin 1s linear infinite' }}
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="#0f7699"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray="15 85"
                            />
                        </svg>
                        <style>{`@keyframes spin {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
                    </div>
                    <progress
                        value={progress}
                        max="100"
                        style={{ width: '100%', marginTop: 5 }}
                    />
                </div>
            )}
            <div
                ref={messageRef}
                style={{ margin: '10px 0', fontSize: 12, color: 'red' }}
            />
        </div>
    );
}

export default VideoSlicer;
