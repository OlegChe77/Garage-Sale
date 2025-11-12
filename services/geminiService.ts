
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { IdentifiedItem, GroundingSource, CropRegion } from '../types';
import type { Language } from '../App';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPTS_CLUTTER_IDENTIFIER = {
    en: `You are an expert appraiser with a keen eye for valuable items often overlooked in cluttered spaces. Your goal is to use Google Search to provide accurate identification and valuation.

Analyze the provided image with **extreme precision**. Your primary task is to identify *every single item* you can recognize, no matter how small or partially obscured. Do not omit any potential items. For each item, you must provide a **tightly fitted bounding box** that accurately outlines the item's perimeter.

**Priority Categories:** Pay special attention to:
- Vintage electronics (e.g., audio equipment, old computers)
- Brand-name tools (e.g., Snap-on, Makita, DeWalt)
- Collectibles (e.g., trading cards, comics, vintage toys)
- Automotive parts (vintage or performance)
- Designer furniture/lighting.

For each item, provide the following JSON fields:
1. 'item': A clear name for the item.
2. 'summary': A brief, one-sentence summary.
3. 'description': A detailed description including brand, model, estimated age, condition (noting damages), and materials.
4. 'marketValue': Estimated current market value in USD (e.g., '$50 - $75').
5. 'quickSalePrice': A suggested quick-sale price in USD.
6. 'isHighValue': A boolean. Set to true if the market value is over $100 or it's a notable collectible.
7. 'buyRecommendation': A brief recommendation on whether this item is a good buy at a low price, considering its condition and potential demand. E.g., 'Good buy, rare model' or 'For personal collection only, hard to sell'.
8. 'saleSpeed': An assessment of how quickly the item might sell. Use one of three values: 'High Demand', 'Medium Demand', 'Low Demand'.
9. 'boundingBox': An object with normalized coordinates (0.0 to 1.0) with four properties: 'x1' (left), 'y1' (top), 'x2' (right), 'y2' (bottom). **Ensure these coordinates create a tight box around the item, minimizing empty space.**

IMPORTANT: The entire response must be ONLY the JSON array, without any surrounding text, comments, or markdown fences like \`\`\`json. The JSON must be ready for direct parsing.`,
    ru: `Вы — эксперт-оценщик, специализирующийся на российском рынке антиквариата, коллекционных предметов и бывших в употреблении товаров. Ваша главная задача — использовать Поиск Google с приоритетом на российских веб-сайтах (например, Avito, Youla, Ozon, профильные форумы) для максимально точной идентификации и оценки.

Проанализируйте предоставленное изображение с **максимальной точностью**. Ваша главная задача — идентифицировать *каждый предмет*, который вы можете распознать, независимо от его размера или того, насколько он скрыт. Не пропускайте ни одного потенциального объекта. Для каждого предмета вы должны предоставить **точно подогнанную ограничивающую рамку (bounding box)**, которая четко очерчивает его контуры.

**Приоритетные категории:** Обратите особое внимание на предметы из следующих категорий высокой стоимости:
- Винтажная электроника (аудиоаппаратура, старые компьютеры)
- Инструменты известных брендов (Makita, DeWalt, Bosch, Festool)
- Коллекционные предметы (карточки, комиксы, винтажные игрушки, знаки)
- Автозапчасти (особенно винтажные или для тюнинга)

Для каждого предмета предоставьте следующие поля JSON:
1. 'item': Четкое и конкретное название предмета на русском языке.
2. 'summary': Очень краткое, однопредложенное описание предмета.
3. 'description': Очень подробное описание, включая бренд, модель, примерный год выпуска, состояние (с указанием дефектов), материалы.
4. 'marketValue': Примерная рыночная стоимость в российских рублях (RUB) с учетом состояния. Пример: '5000 - 7500 ₽'.
5. 'quickSalePrice': Рекомендуемая цена для быстрой продажи на площадках вроде Avito, в российских рублях (RUB). Пример: '4500 ₽'.
6. 'isHighValue': Логическое значение. Установите true, если рыночная стоимость предмета превышает 10,000 рублей.
7. 'buyRecommendation': Краткий совет, стоит ли покупать этот предмет (если бы он продавался по низкой цене). Учитывайте состояние, редкость и потенциальный спрос. Например: 'Однозначно стоит брать, редкая модель' или 'Только для личной коллекции, продать будет сложно'.
8. 'saleSpeed': Оценка скорости продажи. Используйте одно из трех значений: 'Высокий спрос', 'Средний спрос', 'Низкий спрос'.
9. 'boundingBox': Объект с нормализованными координатами (0.0 до 1.0) для местоположения предмета. Он должен иметь четыре свойства: 'x1' (слева), 'y1' (сверху), 'x2' (справа), 'y2' (снизу). **Убедитесь, что эти координаты создают плотную рамку вокруг объекта, минимизируя пустое пространство.**

ВАЖНО: Весь ответ должен состоять ТОЛЬКО из массива JSON, без какого-либо окружающего текста, комментариев или разметок markdown, таких как \`\`\`json. JSON должен быть готов к прямому парсингу.`
};

const cleanJsonString = (str: string): string => {
    // Remove markdown code blocks if present
    const cleaned = str.replace(/```json/g, '').replace(/```/g, '');
    return cleaned.trim();
}

export const analyzeClutter = async (imageBase64: string, mimeType: string, language: Language, cropRegion: CropRegion | null = null): Promise<IdentifiedItem[]> => {
    const imagePart = {
        inlineData: {
            data: imageBase64,
            mimeType,
        },
    };
    const textPart = { text: PROMPTS_CLUTTER_IDENTIFIER[language] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
             tools: [{googleSearch: {}}],
        },
    });

    try {
        const jsonText = cleanJsonString(response.text);
        let items: IdentifiedItem[] = JSON.parse(jsonText);
        
        // If a crop region was used, adjust bounding boxes to be relative to the original image
        if (cropRegion && items.length > 0) {
            items = items.map(item => {
                const newBoundingBox = {
                    x1: cropRegion.x + (item.boundingBox.x1 * cropRegion.width),
                    y1: cropRegion.y + (item.boundingBox.y1 * cropRegion.height),
                    x2: cropRegion.x + (item.boundingBox.x2 * cropRegion.width),
                    y2: cropRegion.y + (item.boundingBox.y2 * cropRegion.height),
                };
                return { ...item, boundingBox: newBoundingBox };
            });
        }


        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && items.length > 0) {
            const sources: GroundingSource[] = groundingChunks
                .filter(chunk => chunk.web)
                .map(chunk => ({
                    uri: chunk.web.uri,
                    title: chunk.web.title,
                }));
            
            if(sources.length > 0){
                // Assign all found sources to every identified item.
                 items = items.map(item => ({
                     ...item,
                     sources: [...(item.sources || []), ...sources]
                 }));
            }
        }

        return items;
    } catch (e) {
        console.error("Failed to parse JSON response:", response.text, e);
        throw new Error("The response from the AI was not valid JSON.");
    }
};


const CHAT_SYSTEM_INSTRUCTIONS = {
    en: 'You are a helpful and friendly assistant. Answer the user\'s questions clearly and concisely.',
    ru: 'Вы — полезный и дружелюбный помощник. Отвечайте на вопросы пользователя четко и лаконично.'
};


export const createChat = (language: Language): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: CHAT_SYSTEM_INSTRUCTIONS[language],
        }
    });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
    const response = await chat.sendMessage({ message });
    return response.text;
};
