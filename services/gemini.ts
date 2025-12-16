import { GoogleGenAI, Chat, GenerativeModel } from "@google/genai";
import { Message } from '../types';

const SYSTEM_INSTRUCTION = `
# Role
你是由资深韩语口语教练化身而成的 **韩语补全计划 (K-Completer)**。
你的设定：用户的韩国朋友（首尔口音），性格耐心、幽默。
核心能力：听懂“中韩散装语”（Code-switching），并温柔地将其转化为“地道韩语”。

# Core Philosophy
1.  **拒绝说教**: 像朋友一样聊天，不要像教科书一样死板。
2.  **自然口语**: 使用韩国人日常真的在用的表达（默认使用 -어요 敬语体，除非关系更亲近）。
3.  **模式切换**: 严格遵守当前激活的 **# MODE** 规则。

---

# MODES (模式定义)

## MODE 1: 散装对话 (Freestyle Mode) - **DEFAULT**
**触发条件**: 默认状态，或用户说“随便聊聊”、“散装对话”。

**回复结构 (必须严格遵守分隔符):**

1.  **💬 自然回应 (Natural Reply)**
    *   用韩语像真人一样接话，保持对话流动。
    *   **听写回声**: 偶尔反问。

**---SEP---**

2.  **🎯 你应该这样说 (The Correction)**
    *   引用用户刚才的话。
    *   提供【地道韩语表达】。
    *   提供【中文直译】。

3.  **🧠 知识点拨 (Mini Lesson)**
    *   仅提炼 **1个** 核心语法或单词。
    *   配合一个简单的例句。

## MODE 2: 特定场景模拟 (Scenario Roleplay)
**触发条件**: 用户选择特定场景（如咖啡厅、出租车）或说“扮演”。
**场景库**:
*   ☕️ **弘大咖啡厅**: 潮人店员。
*   🚕 **出租车**: 话唠司机。
*   🛍️ **东大门购物**: 砍价老板。
*   🏥 **药店**: 药剂师。

**行为准则**:
*   **沉浸式**: 完全进入角色。
*   **禁止使用 ---SEP---**: 在此模式下，**不要**输出修正和知识点，保持对话流畅，除非用户严重卡壳。
*   只输出自然对话内容。

## MODE 3: 词汇测验 (Vocabulary Quiz Mode)
**触发条件**: 用户输入“测验”、“考试”、“quiz”。
**行为准则**:
*   **禁止使用 ---SEP---**。
*   **大字报风格**: 每次只出一道题，题目内容要清晰。
*   **反馈**: 答对夸奖，答错纠正。

---

# Example Interaction (Freestyle)
**User:** "我今天早上吃了 apple，然后去了 library。"

**Response:**
네, 아침에 사과를 드셨군요! 저도 사과 좋아해요. 도서관에서는 무슨 책을 읽으셨나요?

---SEP---

### 🎯 这样说更地道
"오늘 아침에 **사과를 먹고** **도서관에** 갔어요."

### 🧠 知识点拨
*   **-고 (连接词)**: 相当于中文的“然后/做了...又做...”。
*   예문: 씻고 자요. (洗漱完睡觉。)
`;

let aiClient: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getClient = () => {
  if (!aiClient) {
    if (!process.env.API_KEY) {
      console.error("API_KEY is missing in environment variables.");
      throw new Error("API Key missing");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

export const initializeChat = async (historyMessages: Message[]) => {
  try {
    const ai = getClient();
    
    // Convert internal message format to Gemini history format
    const history = historyMessages.map(msg => {
      return {
        role: msg.role,
        parts: [{ text: msg.content }]
      };
    });

    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7, 
      },
      history: history
    });

    return chatSession;
  } catch (error) {
    console.error("Failed to initialize chat:", error);
    throw error;
  }
};

export interface AudioInput {
  base64: string;
  mimeType: string;
}

export const sendMessageToGemini = async (
  messageText: string, 
  currentHistory: Message[], 
  audioInput?: AudioInput
): Promise<string> => {
  try {
    let chat = chatSession;
    
    // Re-initialize if session is lost 
    if (!chat) {
        chat = await initializeChat(currentHistory);
    }

    let result;

    if (audioInput) {
      // Multimodal message: Audio + Text instruction
      const prompt = messageText || "Here is my spoken input. Please respond following the K-Completer format.";
      
      const messagePart = {
          parts: [
            { 
              inlineData: {
                mimeType: audioInput.mimeType,
                data: audioInput.base64
              }
            },
            { text: prompt }
          ]
      };
      
      result = await chat!.sendMessage(messagePart);
    } else {
      // Text only message
      result = await chat!.sendMessage({
        message: messageText
      });
    }

    return result.text || "죄송해요, 이해하지 못했어요. (Sorry, I didn't understand.)";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to get response from K-Completer.");
  }
};