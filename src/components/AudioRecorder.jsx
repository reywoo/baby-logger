import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { playStartChime, playStopChime } from '../utils/audioChimes';

export default function AudioRecorder({ onAudioProcessed, lang, apiKey, t }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg('');
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process audio with backend & Gemini 1.5 Flash
        await sendAudioToGemini(audioBlob, mimeType || 'audio/webm');
      };

      playStartChime();
      mediaRecorder.start(200); // Collect data every 200ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMsg(lang === 'zh' ? '无法访问麦克风，请检查浏览器权限。' : 'Microphone access denied. Please allow mic permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      playStopChime();
      if (timerRef.current) clearInterval(timerRef.current);
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
      const passcode = localStorage.getItem('APP_PASSCODE');
      if (passcode) {
        headers['x-app-passcode'] = passcode;
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
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
              🔴 {t.recording} ({formatTimer(recordingSeconds)}) - {t.tapToStop}
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
    </div>
  );
}
