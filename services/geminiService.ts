
import { GoogleGenAI } from "@google/genai";

export class HospitalAIService {
  // Fix: Removed global ai instance to ensure fresh initialization with correct apiKey per call
  
  async queryDashboard(prompt: string, contextSummary: string) {
    try {
      // Fix: Initializing GoogleGenAI inside the method to ensure it uses the latest apiKey
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
Bạn là một AI chuyên gia quản trị bệnh viện và phân tích tài chính y tế tại Việt Nam. 
Dưới đây là tóm tắt dữ liệu hiện tại của bệnh viện:
${contextSummary}

Hãy trả lời câu hỏi của người dùng dựa trên dữ liệu trên một cách chuyên nghiệp, chính xác và có số liệu cụ thể. 
Nếu câu hỏi yêu cầu phân tích, hãy đưa ra nhận định dựa trên số liệu. 
Trả lời bằng tiếng Việt, thân thiện và mang tính hỗ trợ quản lý.

Câu hỏi: ${prompt}
        `,
        config: {
          temperature: 0.7,
        },
      });

      // Fix: response.text is a property, not a function
      return response.text;
    } catch (error) {
      console.error("AI Query Error:", error);
      return "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại.";
    }
  }

  async getDiagnosticSuggestions(symptoms: string) {
    try {
      // Fix: Initializing GoogleGenAI inside the method to ensure it uses the latest apiKey
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `
Bạn là một Trợ lý Chẩn đoán Y khoa Thông minh (H-AI Diagnostic Support). 
Nhiệm vụ của bạn là phân tích các triệu chứng được cung cấp và đưa ra gợi ý chuyên môn dành cho bác sĩ.

Dữ liệu triệu chứng/bệnh sử: "${symptoms}"

Hãy trình bày phản hồi theo cấu trúc sau (Sử dụng Tiếng Việt):
1. **Chẩn đoán phân biệt**: Đưa ra 3-5 mã bệnh ICD-10 tiềm năng nhất.
2. **Cận lâm sàng đề nghị**: Các xét nghiệm (Máu, Nước tiểu, v.v.) hoặc chẩn đoán hình ảnh (X-quang, Siêu âm, CT) cần thiết để xác định chẩn đoán.
3. **Dấu hiệu cảnh báo (Red Flags)**: Các tình trạng cần xử lý cấp cứu ngay lập tức nếu có.
4. **Lưu ý**: Nhấn mạnh đây là gợi ý từ AI, bác sĩ cần thăm khám lâm sàng để quyết định cuối cùng.

Hãy trả lời ngắn gọn, súc tích và đúng thuật ngữ y khoa.
        `,
        config: {
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 2000 }
        },
      });

      // Fix: response.text is a property, not a function
      return response.text;
    } catch (error) {
      console.error("Diagnostic AI Error:", error);
      return "Không thể thực hiện phân tích chẩn đoán lúc này.";
    }
  }
}

export const aiService = new HospitalAIService();
