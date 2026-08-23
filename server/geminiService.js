import { GoogleGenAI } from '@google/genai';

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const FALLBACK_GEMINI_MODEL = 'gemini-flash-lite-latest';

async function generateWithGemini(ai, contents, config) {
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  try {
    return await ai.models.generateContent({
      model: primaryModel,
      contents,
      config,
    });
  } catch (err) {
    if (primaryModel !== FALLBACK_GEMINI_MODEL) {
      console.warn(`Primary model ${primaryModel} failed (${err.status || err.message}), retrying with fallback model ${FALLBACK_GEMINI_MODEL}...`);
      return await ai.models.generateContent({
        model: FALLBACK_GEMINI_MODEL,
        contents,
        config,
      });
    }
    throw err;
  }
}

function formatSubCategoryRules(subCategoriesMap, hasBirthDate = true) {
  const defaultRules = {
    feeding: ["formula", "breastmilk", "solids"],
    sleep: ["nap", "night_sleep"],
    diaper: ["wet", "dirty", "both"],
    health: ["medicine", "temperature", "vaccine", "symptom", "doctor"],
    activity: ["tummy_time", "play", "outdoor", "bath", "reading"],
    other: ["other"],
  };

  if (hasBirthDate) {
    defaultRules.growth = ["weight", "height"];
  }

  if (subCategoriesMap && typeof subCategoriesMap === 'object') {
    Object.entries(subCategoriesMap).forEach(([cat, subs]) => {
      if (cat === 'growth' && !hasBirthDate) return;
      if (Array.isArray(subs) && subs.length > 0) {
        defaultRules[cat] = subs;
      }
    });
  }

  return Object.entries(defaultRules)
    .map(([cat, subs]) => `   - ${cat}: ${subs.map(s => `"${s}"`).join(', ')}`)
    .join('\n');
}

function extractJsonObject(text) {
  if (!text) throw new Error('Empty response from Gemini AI');
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      console.warn('Regex JSON match parse failed, falling back to string clean:', e.message);
    }
  }
  const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}

function formatBabyProfileContext(babyProfile) {
  if (!babyProfile || typeof babyProfile !== 'object') return '';
  const names = [
    babyProfile.nickname,
    babyProfile.firstName,
    babyProfile.name !== 'Baby' ? babyProfile.name : null,
    babyProfile.lastName && babyProfile.firstName ? `${babyProfile.firstName} ${babyProfile.lastName}` : null,
    babyProfile.lastName && babyProfile.firstName ? `${babyProfile.lastName}${babyProfile.firstName}` : null,
  ].filter(Boolean);
  
  const uniqueNames = [...new Set(names)];
  const nameDesc = uniqueNames.length > 0 ? uniqueNames.map(n => `"${n}"`).join(', ') : '"Baby" / "宝宝"';
  const genderDesc = babyProfile.gender === 'boy' ? 'Boy (男宝)' : babyProfile.gender === 'girl' ? 'Girl (女宝)' : (babyProfile.gender || 'Not specified');
  const birthDateDesc = babyProfile.birthDate || 'Not set';

  return `
BABY PROFILE CONTEXT:
- Baby's Name / Nickname(s): ${nameDesc}
- Gender: ${genderDesc}
- Birth Date: ${birthDateDesc}
- IMPORTANT NAME UNDERSTANDING:
  * When the speaker mentions any of the baby's names (${nameDesc}), nicknames, pronouns ("he", "she", "him", "her", "他", "她"), or general terms ("baby", "宝宝", "小宝", "崽崽", "儿子", "女儿", "妹妹", "弟弟"), they are referring to this baby.
  * If no name is mentioned at all (e.g. "换了尿布", "drank 120ml milk", "睡觉了"), it also pertains to this baby by default.
`;
}

/**
 * Service to process multimodal audio input or natural text with Gemini
 */
export async function processAudioWithGemini(audioBuffer, mimeType, userApiKey, subCategoriesMap = null, babyProfile = null) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in environment or settings.');
  }

  const hasBirthDate = typeof babyProfile === 'boolean' ? babyProfile : !!(babyProfile && babyProfile.birthDate);
  const babyContext = formatBabyProfileContext(babyProfile);

  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = audioBuffer.toString('base64');
  const currentIso = new Date().toISOString();

  const subCatRules = formatSubCategoryRules(subCategoriesMap, hasBirthDate);
  const categoriesList = hasBirthDate
    ? '"feeding", "sleep", "diaper", "growth", "health", "activity", or "other"'
    : '"feeding", "sleep", "diaper", "health", "activity", or "other" (NOTE: "growth" is DISABLED because baby birthday is not set)';

  const prompt = `You are a helpful family assistant & baby activity logger. Current ISO time is: ${currentIso}.
Listen carefully to the audio clip provided. The speaker may be using Chinese (Mandarin), English, or a mix of both.
${babyContext}
Extract and structure the activity log into a clean JSON object.
Follow these guidelines strictly:
0. CRITICAL SINGLE EVENT RULE: Each audio recording MUST produce exactly ONE single log entry. If the speaker mentions multiple actions, events, or categories in one recording (for example: "changed diaper and baby drank 120ml milk and went to sleep"), ONLY extract and parse the FIRST clearly identifiable action and ignore all subsequent actions. Do NOT attempt to output multiple records or combine multiple events.
1. Identify the category: ${categoriesList}.
${!hasBirthDate ? '   - CRITICAL: Baby birth date is NOT set. You MUST NOT categorize any input into "growth". Use "other" or appropriate category instead.\n' : ''}2. Identify subCategory ONLY from these fixed allowed subcategories for each category:
${subCatRules}
   - CRITICAL: You MUST choose one of the exact subcategories listed above for the chosen category. Do NOT invent or output new custom subcategories.
3. Identify any amounts (e.g. 120 ml, 4 oz, 5.2 kg, 60 cm, 36.8 C), duration (e.g. 45 mins, 1.5 hrs), or status.
4. Identify action timing:
   - "startTime": ISO timestamp when the action started (e.g., if mentioned "at 2pm" or "30 mins ago", calculate against current ISO time. Otherwise default to current ISO time).
   - "endTime": ISO timestamp when the action ended. CRITICAL: For instant categories ("diaper", "growth", and "health"), ALWAYS set "endTime" equal to "startTime", and set "duration" to null.
   - For interval categories ("feeding", "sleep", "activity", "other"), set "endTime" and "duration" when mentioned or calculated.
5. "summaryEn" (English Description): Provide a clean, natural, slightly formatted and corrected English sentence reflecting what the speaker said in audio (fix mumbling, hesitations, or disfluencies into clear natural sentences).
6. "originalZh" (Chinese Description): Provide a clean, natural, slightly formatted and corrected Chinese sentence reflecting what the speaker said in audio (fix mumbling, hesitations, or disfluencies into clear natural sentences).
7. "notes": Extract any extra specific details or remarks mentioned, or null if nothing extra was noted.

Return ONLY a valid JSON object matching this exact structure:
{
  "category": "${hasBirthDate ? 'feeding | sleep | diaper | growth | health | activity | other' : 'feeding | sleep | diaper | health | activity | other'}",
  "subCategory": "one of the fixed subcategory strings for the chosen category",
  "amount": "120 ml, 36.8 C, or null",
  "duration": "1 hr or null",
  "startTime": "ISO 8601 string",
  "endTime": "ISO 8601 string",
  "summaryEn": "Formatted English description of what was spoken",
  "originalZh": "Formatted Chinese description of what was spoken",
  "notes": "Additional details or null"
} `;

  try {
    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType || 'audio/webm',
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ];
    const config = { responseMimeType: 'application/json' };

    const response = await generateWithGemini(ai, contents, config);
    return extractJsonObject(response.text);
  } catch (error) {
    console.error('Gemini Audio Processing Error:', error);
    throw new Error(`Failed to process audio with Gemini: ${error.message}`);
  }
}

/**
 * Process text prompt fallback with Gemini
 */
export async function processTextWithGemini(textInput, userApiKey, subCategoriesMap = null, babyProfile = null) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in environment or settings.');
  }

  const hasBirthDate = typeof babyProfile === 'boolean' ? babyProfile : !!(babyProfile && babyProfile.birthDate);
  const babyContext = formatBabyProfileContext(babyProfile);

  const ai = new GoogleGenAI({ apiKey });
  const currentIso = new Date().toISOString();
  const subCatRules = formatSubCategoryRules(subCategoriesMap, hasBirthDate);
  const categoriesList = hasBirthDate
    ? '"feeding", "sleep", "diaper", "growth", "health", "activity", or "other"'
    : '"feeding", "sleep", "diaper", "health", "activity", or "other" (NOTE: "growth" is DISABLED because baby birthday is not set)';

  const prompt = `You are a family assistant & baby log parser. Current ISO time is: ${currentIso}.
${babyContext}
Parse this user log text entry: "${textInput}". The text may be in Chinese, English, or mixed.

Extract timing & category details:
- CRITICAL SINGLE EVENT RULE: Each input text MUST produce exactly ONE single log entry. If the user text mentions multiple actions or events (e.g. "changed diaper and baby drank 120ml milk"), ONLY extract and parse the FIRST clearly identifiable action and ignore all subsequent actions. Do NOT attempt to output multiple records or combine multiple events.
- "category": ${categoriesList}
${!hasBirthDate ? '- CRITICAL: Baby birth date is NOT set. You MUST NOT categorize into "growth". Use "other" or another suitable category.\n' : ''}- "subCategory": MUST be chosen from one of these fixed allowed subcategories for each category:
${subCatRules}
  - CRITICAL: You MUST choose one of the exact subcategories listed above for the chosen category. Do NOT invent or output new custom subcategories.
- "startTime": ISO timestamp of when action started.
- "endTime": ISO timestamp of when action ended. For instant categories ("diaper", "growth", and "health"), ALWAYS set "endTime" equal to "startTime" and set "duration" to null.
- Note: Since this input is text-based (not audio), set "summaryEn" to "N/A" and "originalZh" to "N/A".
- "notes": Put the user's entered text or any extra notes here.

Return ONLY a valid JSON object:
{
  "category": "${hasBirthDate ? 'feeding | sleep | diaper | growth | health | activity | other' : 'feeding | sleep | diaper | health | activity | other'}",
  "subCategory": "one of the fixed subcategory strings for the chosen category",
  "amount": "e.g. 120 ml, 36.8 C, or null",
  "duration": "e.g. 1 hr or null",
  "startTime": "ISO 8601 string",
  "endTime": "ISO 8601 string",
  "summaryEn": "N/A",
  "originalZh": "N/A",
  "notes": "${textInput.replace(/"/g, "'")}"
}`;

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const config = { responseMimeType: 'application/json' };

    const response = await generateWithGemini(ai, contents, config);
    return extractJsonObject(response.text);
  } catch (error) {
    console.error('Gemini Text Processing Error:', error);
    throw new Error(`Failed to process text with Gemini: ${error.message}`);
  }
}

/**
 * Generate or translate notes into pure Chinese and pure English versions using Gemini
 */
export async function generateOrTranslateNotesWithGemini(logData, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  const userNotes = (logData?.notes || '').trim();
  const category = logData?.category || 'other';
  const subCategory = logData?.subCategory || 'other';
  const amount = logData?.amount || '';
  const duration = logData?.duration || '';
  const descZh = logData?.originalZh && logData.originalZh !== 'N/A' ? logData.originalZh.trim() : '';
  const descEn = logData?.summaryEn && logData.summaryEn !== 'N/A' ? logData.summaryEn.trim() : '';

  // Fallback defaults if no API key or AI call fails
  const fallbackChinese = userNotes || descZh || `${category} ${subCategory} ${amount || duration}`.trim();
  const fallbackEnglish = userNotes || descEn || `${category} ${subCategory} ${amount || duration}`.trim();

  if (!apiKey) {
    return {
      notesZh: fallbackChinese,
      notesEn: fallbackEnglish,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  let prompt = '';
  if (userNotes) {
    // Case 1: User manually entered notes (may be Chinese, English, or mixed)
    prompt = `You are a professional multilingual translator and baby log formatter.
The user manually entered the following notes for a baby activity log (which may be in Chinese, English, or mixed):
"${userNotes}"

Context of the log:
- Category: ${category}
- SubCategory: ${subCategory}
- Amount: ${amount || 'N/A'}
- Duration: ${duration || 'N/A'}

Your task: Convert and translate these notes into TWO distinct, pure-language versions:
1. "notesZh": A natural, clean Chinese note containing primarily Chinese characters and numbers/units.
   - PROPER NOUNS & HARD-TO-TRANSLATE NAMES RULE: For nouns that are hard to translate or specific to a locale (such as place names, park names, street names, hospitals, doctor/person names, brand/clinic names), you can allow the original English name in parentheses/brackets after or alongside the Chinese translation.
     Examples:
     * English: "Body temperature was taken at Mill Pond Park" -> Chinese: "在米尔池塘公园(Mill Pond Park)量的体温"
     * English: "Body temperature was taken by Dr. McNaughton" -> Chinese: "麦克诺顿医生(Dr. McNaughton)给量的体温"
     * English: "Prescription from Seattle Children's Hospital" -> Chinese: "西雅图儿童医院(Seattle Children's Hospital)开的处方"
2. "notesEn": A natural, clean English note containing ONLY English words and numbers/units (NO mixed Chinese characters).

Return ONLY valid JSON matching this exact structure:
{
  "notesZh": "Chinese notes",
  "notesEn": "English notes"
}`;
  } else {
    // Case 2: Notes field was left empty -> generate short concise summary from description or parameters
    prompt = `You are a baby log assistant. A log record is being saved without custom notes.
Record details:
- Category: ${category}
- SubCategory: ${subCategory}
- Amount: ${amount || 'N/A'}
- Duration: ${duration || 'N/A'}
- Chinese Audio Description: ${descZh || 'N/A'}
- English Audio Description: ${descEn || 'N/A'}

Your task: Generate a short, concise summary note of what happened in both pure Chinese and pure English:
- If Audio Description is available and not 'N/A', summarize it into a concise note.
- If Audio Description is 'N/A', generate a natural concise note based on the category, subcategory, and amount/duration (e.g. '配方奶 120ml' / 'Formula 120ml', or '换小便尿布' / 'Pee diaper change').
- "notesZh": A concise, natural Chinese summary. For hard-to-translate proper nouns (place names, street names, doctor/person names, clinics), original English names in parentheses/brackets are allowed (e.g. "米尔池塘公园(Mill Pond Park)", "麦克诺顿医生(Dr. McNaughton)").
- "notesEn": A concise, natural English summary (ONLY English).

Return ONLY valid JSON matching this exact structure:
{
  "notesZh": "concise Chinese summary note",
  "notesEn": "concise English summary note"
}`;
  }

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const config = { responseMimeType: 'application/json' };

    const response = await generateWithGemini(ai, contents, config);
    const parsed = extractJsonObject(response.text);

    return {
      notesZh: parsed.notesZh ? String(parsed.notesZh).trim() : fallbackChinese,
      notesEn: parsed.notesEn ? String(parsed.notesEn).trim() : fallbackEnglish,
    };
  } catch (error) {
    console.error('Gemini Notes Summarization/Translation Error:', error);
    return {
      notesZh: fallbackChinese,
      notesEn: fallbackEnglish,
    };
  }
}

/**
 * Sanity check and format validation for log input fields using Gemini
 */
export async function validateAndFormatLogWithGemini(logData, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  const fallbackFormattedAmount = (logData?.amount || '').replace(/\s+/g, ' ').trim();
  const fallbackFormattedDuration = (logData?.duration || '').replace(/\s+/g, ' ').trim();

  if (!apiKey) {
    return {
      isValid: true,
      reason: null,
      suggestedAmount: logData?.amount || '',
      suggestedDuration: logData?.duration || '',
      formattedAmount: fallbackFormattedAmount,
      formattedDuration: fallbackFormattedDuration,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a strict data sanity checker & standardizer for a baby activity logger.
Analyze this user input data before saving:
- Category: "${logData?.category || ''}"
- SubCategory: "${logData?.subCategory || ''}"
- Amount Input: "${logData?.amount || ''}"
- Duration Input: "${logData?.duration || ''}"
- Chinese Text/Summary: "${logData?.originalZh || ''}"
- English Summary: "${logData?.summaryEn || ''}"
- Notes: "${logData?.notes || ''}"

Perform TWO checks:

1. SANITY & MANDATORY UNIT CHECK:
Determine if the Amount or Duration inputs make realistic physical sense AND obey mandatory unit rules for a baby log:

MANDATORY UNIT RULES (isValid = false if violated):
- Rule 1 - Feeding (All subcategories): Amount MUST ALWAYS be treated in "ml". Plain numbers without units (e.g. "25", "120") are VALID and MUST automatically be formatted as "25 ml", "120 ml". Using non-ml units like grams ("350g"), liters ("120L"), ounces ("4 oz") is INVALID (isValid = false, suggest in ml e.g. "350 ml").
- Rule 2 - Health (Temperature / Temp Check): Body temperature checks MUST ALWAYS be in Celsius (°C). Plain numbers (e.g. "36.8") are VALID and automatically formatted as "36.8 °C". If given in Fahrenheit (e.g. "98.6°F", "98.6F") or invalid units, set isValid = false and set suggestedAmount converted to Celsius (e.g. "37.0 °C").

GENERAL PHYSICAL SANITY RULES (isValid = false if violated):
- Feeding amount: Single feeding > 500ml or negative number makes NO sense for a baby. "120L" or "5L" makes NO sense.
- Temperature value: Normal baby body temperature is ~35.5 °C to 40.5 °C. Values like "100 °C", "50 °C", "10 °C" make NO sense.
- Duration: A single feed > 4 hours, or sleep/activity > 24 hours makes NO sense.
- Empty or blank amount/duration is VALID.

If any sanity or unit rule is violated:
- Set "isValid": false
- Provide clear explanation in "reason" (in English and Chinese).
- Provide "suggestedAmount" (e.g. "350 ml", "37.0 °C") and/or "suggestedDuration" if you can infer/convert the intended value.

2. FORMATTING / STANDARDIZATION CHECK:
Format the valid / accepted values cleanly and consistently:
- Remove extra spaces (e.g. "120    ml" -> "120 ml", "15   mins" -> "15 mins").
- Temperature: always format as "X.X °C" (e.g. "36.8" -> "36.8 °C", "37" -> "37.0 °C").
- Feeding amount: always format as "X ml" (e.g. "25" -> "25 ml", "120" -> "120 ml").
- Time duration: standardize format (e.g. "15m" -> "15 mins", "1.5h" -> "1 hr 30 mins").
- Medicine dosage / other health value: clean up spacing, leave unit as provided if non-standard (e.g. "2.5 ml", "1 drop").

Return ONLY a valid JSON object with this exact structure:
{
  "isValid": true,
  "reason": "explanation if invalid, else null",
  "suggestedAmount": "350 ml or null",
  "suggestedDuration": "15 mins or null",
  "formattedAmount": "cleanly formatted amount string",
  "formattedDuration": "cleanly formatted duration string"
}`;

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const config = { responseMimeType: 'application/json' };

    const response = await generateWithGemini(ai, contents, config);
    const parsed = extractJsonObject(response.text);

    return {
      isValid: typeof parsed.isValid === 'boolean' ? parsed.isValid : true,
      reason: parsed.reason || null,
      suggestedAmount: parsed.suggestedAmount || null,
      suggestedDuration: parsed.suggestedDuration || null,
      formattedAmount: parsed.formattedAmount ?? fallbackFormattedAmount,
      formattedDuration: parsed.formattedDuration ?? fallbackFormattedDuration,
    };
  } catch (error) {
    console.error('Gemini Validation Error:', error);
    return {
      isValid: true,
      reason: null,
      suggestedAmount: logData?.amount || '',
      suggestedDuration: logData?.duration || '',
      formattedAmount: fallbackFormattedAmount,
      formattedDuration: fallbackFormattedDuration,
    };
  }
}




