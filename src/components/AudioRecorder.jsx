import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { playStartChime, playStopChime } from '../utils/audioChimes';

const MAX_RECORDING_SECONDS = 180; // 3 minutes limit

export default function AudioRecorder({ onAudioProcessed, lang, apiKey, t }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTimeout = () => {
    // 1. Set cancellation flag so onstop ignores & discards audio payload
    isCancelledRef.current = true;

    // 2. Clear timer interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 3. Stop recording stream safely
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder on timeout:', err);
      }
    }

    // 4. Drop and delete audio data immediately
    audioChunksRef.current = [];

    // 5. Play stop chime & update state
    playStopChime();
    setIsRecording(false);
    setIsProcessing(false);

    // 6. Show timeout error window pop up
    setShowTimeoutModal(true);
  };

  const startRecording = async () => {
    setErrorMsg('');
    setShowTimeoutModal(false);
    isCancelledRef.current = false;
    secondsRef.current = 0;
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && !isCancelledRef.current) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio stream tracks
        stream.getTracks().forEach((track) => track.stop());

        // If recording timed out or was cancelled, drop data & do not call Gemini
        if (isCancelledRef.current) {
          audioChunksRef.current = [];
          isCancelledRef.current = false;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        audioChunksRef.current = [];

        // Process audio with backend & Gemini
        await sendAudioToGemini(audioBlob, mimeType || 'audio/webm');
      };

      playStartChime();
      mediaRecorder.start(200); // Collect data chunk every 200ms
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setRecordingSeconds(secondsRef.current);

        if (secondsRef.current >= MAX_RECORDING_SECONDS) {
          handleTimeout();
        }
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMsg(lang === 'zh' ? '无法访问麦克风，请检查浏览器权限。' : 'Microphone access denied. Please allow mic permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      playStopChime();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isCancelledRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToGemini = async (audioBlob, mimeType) => {
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const headers = {};
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey;
      }
      const token = localStorage.getItem('FAMILY_AUTH_TOKEN');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        onAudioProcessed(result.data);
      } else {
        throw new Error(result.error || 'Failed to process audio');
      }
    } catch (err) {
      console.error('Audio upload error:', err);
      setErrorMsg(err.message || (lang === 'zh' ? 'AI 解析失败，请重试。' : 'Failed to parse audio. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Sparkles size={20} style={{ color: 'var(--primary-accent)' }} />
        {t.voiceTitle}
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
        {t.voiceSubtitle}
      </p>

      {/* Mic Button & Wave Animation */}
      <div className="mic-button-container">
        {isRecording && <div className="wave-rings" />}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          title={isRecording ? t.stopRecord : t.startRecord}
        >
          {isProcessing ? (
            <Loader2 size={44} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          ) : isRecording ? (
            <Square size={40} />
          ) : (
            <Mic size={48} />
          )}
        </button>

        {/* Status indicator text below mic */}
        <div style={{ marginTop: '1.25rem', fontWeight: 600, fontSize: '1rem', color: isRecording ? '#ef4444' : isProcessing ? 'var(--primary-accent)' : 'inherit' }}>
          {isProcessing ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <Sparkles size={16} /> {t.processingAudio}...
            </span>
          ) : isRecording ? (
            <span>
              🔴 {t.recording} ({formatTimer(recordingSeconds)} / 3:00) - {t.tapToStop}
            </span>
          ) : (
            <span>{t.tapToSpeak}</span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Timeout Error Modal Window */}
      {showTimeoutModal && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="glass-panel modal-content" style={{ textAlign: 'center', padding: '1.75rem 1.5rem', maxWidth: '420px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#ef4444'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              {lang === 'zh' ? '录音已超时 (超过 3 分钟)' : 'Recording Time Limit Exceeded'}
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              {lang === 'zh'
                ? '录音时长已超过 3 分钟限制。该录音已自动清空丢弃，未发送给睿仔云AI助理解析。请重新录制一段简短语音。'
                : 'Recording cannot exceed 3 minutes. Your audio data has been discarded and was not sent to Reywoo AI Agent. Please try again with a shorter recording.'}
            </p>

            <button
              onClick={() => setShowTimeoutModal(false)}
              className="glass-button"
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'var(--danger)',
                borderColor: 'var(--danger)',
                padding: '0.8rem',
                fontSize: '0.95rem'
              }}
            >
              <RotateCcw size={18} />
              {lang === 'zh' ? '知道了，重新录制' : 'Got it, Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

