import { GoogleGenAI } from '@google/genai';

function formatSubCategoryRules(subCategoriesMap) {

  if (!subCategoriesMap || typeof subCategoriesMap !== 'object') {
    return `   - feeding: "formula", "breastmilk", "solids"\n   - sleep: "nap", "night_sleep"\n   - diaper: "wet", "dirty", "both"\n   - health: "medicine", "temperature", "vaccine", "symptom", "doctor"\n   - activity: "tummy_time", "play", "outdoor", "bath", "reading"\n   - other: "other"`;
  }

  return Object.entries(subCategoriesMap)
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
 * Service to process multimodal audio input or natural text with Gemini 2.5 Flash
 */
export async function processAudioWithGemini(audioBuffer, mimeType, userApiKey, subCategoriesMap = null) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in environment or settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = audioBuffer.toString('base64');
  const currentIso = new Date().toISOString();

  const subCatRules = formatSubCategoryRules(subCategoriesMap);

  const prompt = `You are a helpful family assistant & baby activity logger. Current ISO time is: ${currentIso}.
Listen carefully to the audio clip provided. The speaker may be using Chinese (Mandarin), English, or a mix of both.

Extract and structure the activity log into a clean JSON object.
Follow these guidelines strictly:
1. Identify the category: "feeding", "sleep", "diaper", "health", "activity", or "other".
2. Identify subCategory ONLY from these fixed allowed subcategories for each category:
${subCatRules}
   - CRITICAL: You MUST choose one of the exact subcategories listed above for the chosen category. Do NOT invent or output new custom subcategories.
3. Identify any amounts (e.g. 120 ml, 4 oz, 36.8 C), duration (e.g. 45 mins, 1.5 hrs), or status.
4. Identify action timing:
   - "startTime": ISO timestamp when the action started (e.g., if mentioned "at 2pm" or "30 mins ago", calculate against current ISO time. Otherwise default to current ISO time).
   - "endTime": ISO timestamp when the action ended. CRITICAL: For instant categories ("diaper" and "health"), ALWAYS set "endTime" equal to "startTime", and set "duration" to null.
   - For interval categories ("feeding", "sleep", "activity", "other"), set "endTime" and "duration" when mentioned or calculated.
5. Provide a clear, natural English summary ("summaryEn") of what happened.
6. Provide the exact Chinese text or transcript ("originalZh") corresponding to what was said (translated to natural Chinese if spoken in English).
7. Extract notes or extra details.

Return ONLY a valid JSON object matching this exact structure:
{
  "category": "feeding | sleep | diaper | health | activity | other",
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
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
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
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    return extractJsonObject(response.text);
  } catch (error) {
    console.error('Gemini Audio Processing Error:', error);
    throw new Error(`Failed to process audio with Gemini: ${error.message}`);
  }
}

/**
 * Process text prompt fallback with Gemini 2.5 Flash
 */
export async function processTextWithGemini(textInput, userApiKey, subCategoriesMap = null) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in environment or settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const currentIso = new Date().toISOString();
  const subCatRules = formatSubCategoryRules(subCategoriesMap);

  const prompt = `You are a family assistant & baby log parser. Current ISO time is: ${currentIso}.
Parse this user log entry: "${textInput}". The text may be in Chinese, English, or mixed.

Extract timing & category details:
- "category": "feeding | sleep | diaper | health | activity | other"
- "subCategory": MUST be chosen from one of these fixed allowed subcategories for each category:
${subCatRules}
  - CRITICAL: You MUST choose one of the exact subcategories listed above for the chosen category. Do NOT invent or output new custom subcategories.
- "startTime": ISO timestamp of when action started.
- "endTime": ISO timestamp of when action ended. For instant categories ("diaper" and "health"), ALWAYS set "endTime" equal to "startTime" and set "duration" to null.

Return ONLY a valid JSON object:
{
  "category": "feeding | sleep | diaper | health | activity | other",
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
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    return extractJsonObject(response.text);
  } catch (error) {
    console.error('Gemini Text Processing Error:', error);
    throw new Error(`Failed to process text with Gemini: ${error.message}`);
  }
}

/**
 * Sanity check and format validation for log input fields using Gemini Flash
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
- Rule 1 - Feeding (Formula & Breastmilk): Formula ("formula") and Breastmilk ("breastmilk") feeding amounts MUST ALWAYS be in "ml" (or "mL"). Using grams ("350g", "350 g"), liters ("120L"), ounces ("4 oz"), or other units is STRICTLY INVALID. If given e.g. "350g", "350 g", "4 oz", set isValid = false, set reason to explain that formula/breastmilk feeding must be in ml (e.g. "Formula and breastmilk feeding amount must be in ml, '350g' is an inconsistent unit / 配方奶与母乳喂养单位必须使用 ml"), and set suggestedAmount to the value in ml (e.g. "350 ml").
- Rule 2 - Health (Temperature / Temp Check): Body temperature checks MUST ALWAYS be in Celsius (°C). If given in Fahrenheit (e.g. "98.6°F", "98.6F", "100 F") or invalid units, set isValid = false, set reason to explain that temperature must be in Celsius (°C), and set suggestedAmount converted to Celsius (e.g. "37.0 °C").

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
- Temperature: always format as "X.X °C" (e.g. "36.8" -> "36.8 °C", "37C" -> "37.0 °C").
- Feeding amount (formula/breastmilk): always format as "X ml" (e.g. "120" -> "120 ml").
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
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

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



