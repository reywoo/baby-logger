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

/**
 * Service to process multimodal audio input or natural text with Gemini
 */
export async function processAudioWithGemini(audioBuffer, mimeType, userApiKey, subCategoriesMap = null, hasBirthDate = true) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in environment or settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = audioBuffer.toString('base64');
  const currentIso = new Date().toISOString();

  const subCatRules = formatSubCategoryRules(subCategoriesMap, hasBirthDate);
  const categoriesList = hasBirthDate
    ? '"feeding", "sleep", "diaper", "growth", "health", "activity", or "other"'
    : '"feeding", "sleep", "diaper", "health", "activity", or "other" (NOTE: "growth" is DISABLED because baby birthday is not set)';

  const prompt = `You are a helpful family assistant & baby activity logger. Current ISO time is: ${currentIso}.
Listen carefully to the audio clip provided. The speaker may be using Chinese (Mandarin), English, or a mix of both.

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
5. Provide a clear, natural English summary ("summaryEn") of what happened.
6. Provide the exact Chinese text or transcript ("originalZh") corresponding to what was said (translated to natural Chinese if spoken in English).
7. Extract notes or extra details.

Return ONLY a valid JSON object matching this exact structure:
{
  "category": "${hasBirthDate ? 'feeding | sleep | diaper | growth | health | activity | other' : 'feeding | sleep | diaper | health | activity | other'}",
  "subCategory": "one of the fixed subcategory strings for the chosen category",
  "amount": "120 ml, 36.8 C, or null",
  "duration": "1 hr or null",
  "startTime": "ISO 8601 string",
  "endTime": "ISO 8601 string",
  "summaryEn": "English description of the log entry",
  "originalZh": "Chinese transcript or equivalent description",
  "notes": "Additional details or null"
}`;

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
export async function processTextWithGemini(textInput, userApiKey, subCategoriesMap = null, hasBirthDate = true) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in environment or settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const currentIso = new Date().toISOString();
  const subCatRules = formatSubCategoryRules(subCategoriesMap, hasBirthDate);
  const categoriesList = hasBirthDate
    ? '"feeding", "sleep", "diaper", "growth", "health", "activity", or "other"'
    : '"feeding", "sleep", "diaper", "health", "activity", or "other" (NOTE: "growth" is DISABLED because baby birthday is not set)';

  const prompt = `You are a family assistant & baby log parser. Current ISO time is: ${currentIso}.
Parse this user log entry: "${textInput}". The text may be in Chinese, English, or mixed.

Extract timing & category details:
- CRITICAL SINGLE EVENT RULE: Each input text MUST produce exactly ONE single log entry. If the user text mentions multiple actions or events (e.g. "changed diaper and baby drank 120ml milk"), ONLY extract and parse the FIRST clearly identifiable action and ignore all subsequent actions. Do NOT attempt to output multiple records or combine multiple events.
- "category": ${categoriesList}
${!hasBirthDate ? '- CRITICAL: Baby birth date is NOT set. You MUST NOT categorize into "growth". Use "other" or another suitable category.\n' : ''}- "subCategory": MUST be chosen from one of these fixed allowed subcategories for each category:
${subCatRules}
  - CRITICAL: You MUST choose one of the exact subcategories listed above for the chosen category. Do NOT invent or output new custom subcategories.
- "startTime": ISO timestamp of when action started.
- "endTime": ISO timestamp of when action ended. For instant categories ("diaper", "growth", and "health"), ALWAYS set "endTime" equal to "startTime" and set "duration" to null.

Return ONLY a valid JSON object:
{
  "category": "${hasBirthDate ? 'feeding | sleep | diaper | growth | health | activity | other' : 'feeding | sleep | diaper | health | activity | other'}",
  "subCategory": "one of the fixed subcategory strings for the chosen category",
  "amount": "e.g. 120 ml, 36.8 C, or null",
  "duration": "e.g. 1 hr or null",
  "startTime": "ISO 8601 string",
  "endTime": "ISO 8601 string",
  "summaryEn": "Clear English summary",
  "originalZh": "Original text or natural Chinese translation",
  "notes": "Any extra notes or null"
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




