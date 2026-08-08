import React, { useState } from 'react';
import { Check, X, Milk, Moon, Baby, HeartPulse, Activity, FileText, Camera, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { playSuccessChime } from '../utils/audioChimes';
import { calculateDurationBetween, calculateEndTimeFromDuration } from '../utils/timeUtils';

const PRESET_SUBCATEGORIES = {
  feeding: [
    { id: 'formula', labelZh: '🍼 配方奶 (Formula)', labelEn: 'Formula' },
    { id: 'breastmilk', labelZh: '🤱 母乳 (Breastmilk)', labelEn: 'Breastmilk' },
    { id: 'solids', labelZh: '🥣 辅食 (Solids)', labelEn: 'Solids' },
  ],
  sleep: [
    { id: 'nap', labelZh: '😴 午睡/小憩 (Nap)', labelEn: 'Nap' },
    { id: 'night_sleep', labelZh: '🌙 夜间睡眠 (Night Sleep)', labelEn: 'Night Sleep' },
  ],
  diaper: [
    { id: 'wet', labelZh: '🟡 小便 (Pee)', labelEn: 'Pee (Wet)' },
    { id: 'dirty', labelZh: '💩 大便/拉屎 (Poop)', labelEn: 'Poop (Dirty)' },
    { id: 'both', labelZh: '🚽 尿+便 (Pee & Poop)', labelEn: 'Pee & Poop' },
  ],
  health: [
    { id: 'medicine', labelZh: '💊 吃药/喂药 (Medicine)', labelEn: 'Medicine' },
    { id: 'temperature', labelZh: '🌡️ 测体温 (Temp Check)', labelEn: 'Temp Check' },
    { id: 'vaccine', labelZh: '💉 打疫苗 (Vaccine)', labelEn: 'Vaccine' },
    { id: 'symptom', labelZh: '🩺 症状观察 (Symptom)', labelEn: 'Symptom' },
    { id: 'doctor', labelZh: '🏥 看医生 (Doctor)', labelEn: 'Doctor' },
  ],
  activity: [
    { id: 'tummy_time', labelZh: '👶 趴卧抬头 (Tummy Time)', labelEn: 'Tummy Time' },
    { id: 'play', labelZh: '🧸 游戏/玩具 (Play)', labelEn: 'Play' },
    { id: 'outdoor', labelZh: '🌳 户外/散步 (Outdoor)', labelEn: 'Outdoor' },
    { id: 'bath', labelZh: '🛁 洗澡/抚触 (Bath & Massage)', labelEn: 'Bath & Massage' },
    { id: 'reading', labelZh: '📖 绘本/早教 (Reading)', labelEn: 'Reading' },
  ],
  other: [
    { id: 'other', labelZh: '📝 其他 (Other)', labelEn: 'Other' },
  ],
};

// Helper to format ISO string or Date to HTML5 datetime-local string (YYYY-MM-DDTHH:MM)
function toDatetimeLocal(isoOrDateStr) {
  const d = isoOrDateStr ? new Date(isoOrDateStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function LogPreviewModal({ data, onSave, onClose, lang, t }) {
  const isEditing = !!data.id;
  const [category, setCategory] = useState(data.category || 'feeding');
  const [subCategory, setSubCategory] = useState(data.subCategory || 'formula');
  const [amount, setAmount] = useState(data.amount || '');

  const presets = PRESET_SUBCATEGORIES[category] || [];
  const subCatMap = new Map();
  presets.forEach((item) => subCatMap.set(item.id, item));
  if (subCategory && !subCatMap.has(subCategory)) {
    subCatMap.set(subCategory, { id: subCategory, labelZh: subCategory, labelEn: subCategory });
  }
  const allSubCategories = Array.from(subCatMap.values());

  // Initial time calculations
  const initialStart = toDatetimeLocal(data.startTime || data.timestamp);
  let initialEnd = data.endTime ? toDatetimeLocal(data.endTime) : null;
  let initialDur = data.duration || '';

  if (!initialEnd && initialDur) {
    initialEnd = toDatetimeLocal(calculateEndTimeFromDuration(initialStart, initialDur));
  } else if (!initialEnd) {
    initialEnd = initialStart;
  }

  if (!initialDur && initialStart !== initialEnd) {
    initialDur = calculateDurationBetween(initialStart, initialEnd);
  }

  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [duration, setDuration] = useState(initialDur);

  const [summaryEn, setSummaryEn] = useState(data.summaryEn || '');
  const [originalZh, setOriginalZh] = useState(data.originalZh || '');
  const [notes, setNotes] = useState(data.notes || '');

  const [existingAttachments, setExistingAttachments] = useState(data.attachments || []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [sanityWarning, setSanityWarning] = useState(null);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'feeding': return <Milk size={18} />;
      case 'sleep': return <Moon size={18} />;
      case 'diaper': return <Baby size={18} />;
      case 'health': return <HeartPulse size={18} />;
      case 'activity': return <Activity size={18} />;
      default: return <FileText size={18} />;
    }
  };

  // Synchronized Handlers for Start Time, End Time & Duration
  const handleStartTimeChange = (newStart) => {
    setStartTime(newStart);
    if (duration && duration.trim()) {
      const calculatedEnd = calculateEndTimeFromDuration(newStart, duration);
      setEndTime(toDatetimeLocal(calculatedEnd));
    } else if (endTime) {
      const computedDur = calculateDurationBetween(newStart, endTime);
      setDuration(computedDur);
    }
  };

  const handleEndTimeChange = (newEnd) => {
    setEndTime(newEnd);
    const computedDur = calculateDurationBetween(startTime, newEnd);
    setDuration(computedDur);
  };

  const handleDurationChange = (newDuration) => {
    setDuration(newDuration);
    if (newDuration && newDuration.trim()) {
      const calculatedEnd = calculateEndTimeFromDuration(startTime, newDuration);
      setEndTime(toDatetimeLocal(calculatedEnd));
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingAttachment = (attId) => {
    setExistingAttachments((prev) => prev.filter((att) => att.id !== attId));
    setRemovedAttachmentIds((prev) => [...prev, attId]);
  };

  const isInstantCategory = category === 'diaper' || category === 'health';

  const handleConfirmSave = async (overrideEntry = null) => {
    setIsSubmitting(true);
    setIsValidating(true);

    try {
      let entryToSave = overrideEntry;

      if (!entryToSave) {
        let startIso;
        const sDate = startTime ? new Date(startTime) : new Date();
        startIso = !isNaN(sDate.getTime()) ? sDate.toISOString() : new Date().toISOString();

        let endIso;
        if (isInstantCategory) {
          endIso = startIso;
        } else if (endTime) {
          const eDate = new Date(endTime);
          endIso = !isNaN(eDate.getTime()) ? eDate.toISOString() : startIso;
        } else {
          endIso = startIso;
        }

        const hasAmount = category === 'feeding' || category === 'health';
        const finalAmount = hasAmount ? amount : '';
        const finalDuration = isInstantCategory ? '' : duration;

        const draftEntry = {
          ...(data.id ? { id: data.id } : {}),
          category,
          subCategory,
          amount: finalAmount,
          duration: finalDuration,
          startTime: startIso,
          endTime: endIso,
          recordedAt: data.recordedAt || new Date().toISOString(),
          summaryEn,
          originalZh,
          notes,
        };

        // Call Gemini Sanity Check & Formatting Validation API
        try {
          const headers = { 'Content-Type': 'application/json' };
          const apiKey = localStorage.getItem('GEMINI_API_KEY');
          if (apiKey) headers['x-gemini-api-key'] = apiKey;
          const passcode = localStorage.getItem('APP_PASSCODE');
          if (passcode) headers['x-app-passcode'] = passcode;

          const res = await fetch('/api/validate-log', {
            method: 'POST',
            headers,
            body: JSON.stringify({ logData: draftEntry }),
          });

          const resData = await res.json();
          if (resData.success && resData.validation) {
            const { isValid, reason, suggestedAmount, suggestedDuration, formattedAmount, formattedDuration } = resData.validation;

            if (!isValid) {
              setSanityWarning({
                reason: reason || (lang === 'zh' ? '数据数值可能不合理，请确认。' : 'The values entered might not make physical sense for a baby log.'),
                suggestedAmount: suggestedAmount || null,
                suggestedDuration: suggestedDuration || null,
                formattedAmount: formattedAmount ?? draftEntry.amount,
                formattedDuration: formattedDuration ?? draftEntry.duration,
                draftEntry,
              });
              setIsSubmitting(false);
              setIsValidating(false);
              return;
            }

            // Apply formatted values if valid
            if (formattedAmount !== undefined && formattedAmount !== null) draftEntry.amount = formattedAmount;
            if (formattedDuration !== undefined && formattedDuration !== null) draftEntry.duration = formattedDuration;
          }
        } catch (valErr) {
          console.warn('Validation check failed, saving draft entry:', valErr);
        }

        entryToSave = draftEntry;
      }

      playSuccessChime();
      await onSave(entryToSave, photos, removedAttachmentIds);
      onClose();
    } catch (err) {
      console.error('Failed to confirm save log:', err);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!sanityWarning) return;
    const { draftEntry, suggestedAmount, suggestedDuration, formattedAmount, formattedDuration } = sanityWarning;
    const updatedEntry = {
      ...draftEntry,
      amount: suggestedAmount || formattedAmount || draftEntry.amount,
      duration: suggestedDuration || formattedDuration || draftEntry.duration,
    };
    setSanityWarning(null);
    handleConfirmSave(updatedEntry);
  };

  const handleCorrectionCancel = () => {
    if (sanityWarning?.suggestedAmount) {
      setAmount(sanityWarning.suggestedAmount);
    }
    if (sanityWarning?.suggestedDuration) {
      setDuration(sanityWarning.suggestedDuration);
    }
    setSanityWarning(null);
  };

  const handleForceSave = () => {
    if (!sanityWarning) return;
    const { draftEntry, formattedAmount, formattedDuration } = sanityWarning;
    const updatedEntry = {
      ...draftEntry,
      amount: formattedAmount !== undefined && formattedAmount !== null ? formattedAmount : draftEntry.amount,
      duration: formattedDuration !== undefined && formattedDuration !== null ? formattedDuration : draftEntry.duration,
    };
    setSanityWarning(null);
    handleConfirmSave(updatedEntry);
  };



  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {getCategoryIcon(category)}{' '}
            {isEditing
              ? (lang === 'zh' ? '编辑日志记录' : 'Edit Log Entry')
              : (t.confirmLogTitle || (lang === 'zh' ? '确认提取的数据' : 'Confirm Extracted Log'))}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>


        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Category selection */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              {t.categoryLabel}
            </label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategory(newCat);
                if (newCat === 'diaper') setSubCategory('wet');
                else if (newCat === 'feeding') setSubCategory('formula');
                else if (newCat === 'sleep') setSubCategory('nap');
                else if (newCat === 'health') setSubCategory('medicine');
                else setSubCategory('other');
              }}
            >
              <option value="feeding">🍼 {lang === 'zh' ? '喂养 (Feeding)' : 'Feeding'}</option>
              <option value="sleep">💤 {lang === 'zh' ? '睡眠 (Sleep)' : 'Sleep'}</option>
              <option value="diaper">🧷 {lang === 'zh' ? '换尿布 (Diaper)' : 'Diaper'}</option>
              <option value="health">💊 {lang === 'zh' ? '健康/用药 (Health)' : 'Health'}</option>
              <option value="activity">🎈 {lang === 'zh' ? '日常/游戏 (Activity)' : 'Activity'}</option>
              <option value="other">📝 {lang === 'zh' ? '其他 (Other)' : 'Other'}</option>
            </select>
          </div>

          {/* Sub-Category Pills for Active Category */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.36rem' }}>
              🏷️ {lang === 'zh' ? '子类别 (Subcategory)' : 'Subcategory'}
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {allSubCategories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSubCategory(item.id)}
                  className="glass-button"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.7rem',
                    background: subCategory === item.id ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
                    borderColor: subCategory === item.id ? 'var(--primary-accent)' : 'var(--card-border)',
                    color: subCategory === item.id ? '#fff' : 'var(--text-main)',
                    fontWeight: subCategory === item.id ? 700 : 500
                  }}
                >
                  {lang === 'zh' ? item.labelZh : item.labelEn}
                </button>
              ))}
            </div>
          </div>




          {/* Start Time & End Time Row */}
          {isInstantCategory ? (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                ⏱️ {lang === 'zh' ? '记录时间 (Event Time)' : 'Event Time'}
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            </div>
          ) : (
            <div className="responsive-grid-2col">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  ⏱️ {lang === 'zh' ? '开始时间 (Start Time)' : 'Start Time'}
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  🏁 {lang === 'zh' ? '结束时间 (End Time)' : 'End Time'}
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Amount & Duration Inputs per category */}
          {category === 'feeding' ? (
            <div className="responsive-grid-2col">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  🍼 {t.amountLabel}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 120 ml"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  ⏳ {t.durationLabel} {lang === 'zh' ? '(基于时间自动计算)' : '(Auto calculated)'}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={lang === 'zh' ? '根据起止时间自动计算' : 'Auto calculated...'}
                  value={duration}
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.03)', cursor: 'not-allowed', opacity: 0.8 }}
                />
              </div>
            </div>
          ) : category === 'health' ? (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                💊 {lang === 'zh' ? '剂量 / 体温数值 (Dosage / Temp Value)' : 'Dosage / Temp Value'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 5 ml, 36.8 °C"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          ) : category === 'sleep' || category === 'activity' || category === 'other' ? (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                ⏳ {t.durationLabel} {lang === 'zh' ? '(基于时间自动计算)' : '(Auto calculated)'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={lang === 'zh' ? '根据起止时间自动计算' : 'Auto calculated...'}
                value={duration}
                readOnly
                style={{ background: 'rgba(255, 255, 255, 0.03)', cursor: 'not-allowed', opacity: 0.8 }}
              />
            </div>
          ) : null}



          {/* Photo Attachments Upload */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              📷 {lang === 'zh' ? '照片附件 (Photo Attachments)' : 'Photo Attachments'}
            </label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {/* Existing uploaded attachments */}
              {existingAttachments.map((att) => (
                <div key={`existing-${att.id}`} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                  <img src={att.url} alt={att.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingAttachment(att.id)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      background: 'rgba(220, 38, 38, 0.85)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                    title={lang === 'zh' ? '删除照片' : 'Delete photo'}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Newly added photos */}
              {photoPreviews.map((src, index) => (
                <div key={`new-${index}`} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                  <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  border: '2px dashed var(--card-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  gap: '0.2rem'
                }}
              >
                <Camera size={18} />
                <span>{lang === 'zh' ? '拍照/选图' : 'Add Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
          </div>


          {/* Chinese Content */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              🇨🇳 {t.chineseTextLabel}
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={originalZh}
              onChange={(e) => setOriginalZh(e.target.value)}
              placeholder="中文记录..."
            />
          </div>

          {/* English Summary */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              🇺🇸 {t.englishTextLabel}
            </label>
            <input
              type="text"
              className="input-field"
              value={summaryEn}
              onChange={(e) => setSummaryEn(e.target.value)}
              placeholder="English summary..."
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              {t.notesLabel}
            </label>
            <input
              type="text"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            onClick={onClose}
            className="glass-button"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={isSubmitting || isValidating}
          >
            <X size={16} /> {t.cancelBtn}
          </button>
          <button
            onClick={() => handleConfirmSave()}
            className="glass-button"
            style={{ flex: 1, justifyContent: 'center', background: 'var(--primary-accent)', borderColor: 'var(--primary-accent)' }}
            disabled={isSubmitting || isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{lang === 'zh' ? 'Gemini 校验中...' : 'Gemini Checking...'}</span>
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{isEditing ? (lang === 'zh' ? '保存修改' : 'Save Changes') : (t.saveBtn || (lang === 'zh' ? '确认保存' : 'Confirm & Save'))}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gemini Validation Loading Spinner Overlay */}
      {isValidating && (
        <div className="modal-overlay" style={{ zIndex: 1150, background: 'rgba(0, 0, 0, 0.75)' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1.75rem', maxWidth: '380px', width: '85%', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary-accent)' }}>
              <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Sparkles size={18} style={{ color: 'var(--primary-accent)' }} />
              {lang === 'zh' ? 'Gemini 智能校验中' : 'Gemini AI Validating'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '正在检查数据合理性与规范格式...' : 'Checking data sanity and standardizing formatting...'}
            </p>
          </div>
        </div>
      )}

      {/* Sanity Check Warning Modal Overlay */}
      {sanityWarning && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="glass-panel modal-content" style={{ maxWidth: '440px', width: '90%', textAlign: 'center', padding: '1.75rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#f59e0b' }}>
              <AlertTriangle size={44} />
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.6rem', color: '#f59e0b' }}>
              {lang === 'zh' ? '数据合理性提醒' : 'Data Sanity Warning'}
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {sanityWarning.reason}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Option 1: Gemini suggestion option */}
              {(sanityWarning.suggestedAmount || sanityWarning.suggestedDuration) && (
                <button
                  type="button"
                  onClick={handleApplySuggestion}
                  className="glass-button"
                  style={{
                    background: 'var(--primary-accent)',
                    borderColor: 'var(--primary-accent)',
                    color: '#fff',
                    fontWeight: 600,
                    justifyContent: 'center',
                    padding: '0.65rem 1rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Sparkles size={16} />
                  <span>
                    {lang === 'zh'
                      ? `你是指 ${sanityWarning.suggestedAmount || sanityWarning.suggestedDuration} 吗？`
                      : `Do you mean ${sanityWarning.suggestedAmount || sanityWarning.suggestedDuration}?`}
                  </span>
                </button>
              )}

              {/* Option 2: Don't Save, will correct by myself */}
              <button
                type="button"
                onClick={handleCorrectionCancel}
                className="glass-button"
                style={{ justifyContent: 'center', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                ✏️ {lang === 'zh' ? '不保存，我亲自修改' : 'Don\'t Save, will correct by myself'}
              </button>

              {/* Option 3: Force Save */}
              <button
                type="button"
                onClick={handleForceSave}
                className="glass-button"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  justifyContent: 'center',
                  padding: '0.65rem 1rem',
                  fontSize: '0.85rem',
                }}
              >
                ⚠️ {lang === 'zh' ? '强制保存' : 'Force Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
