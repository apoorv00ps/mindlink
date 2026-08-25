const API_KEY = "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";
const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

let aiChatHistory = [
    {
        role: "system",
        content: `You are Mind Link, an empathetic, friendly, and non-judgmental mental health assistant chatbot for youth. 
Your goal is to talk to the user, listen to their problems, and provide support.
Additionally, you MUST evaluate their mental health risk based on the conversation.
At the end of EVERY response, you MUST append a hidden tag in the format: [RISK: LOW], [RISK: MODERATE], or [RISK: HIGH].
Do not expose this tag to the user in your natural speech; it is for the system.
If the user expresses thoughts of self-harm, severe depression, or abuse, categorize as [RISK: HIGH].
If they are stressed, anxious, or sad, categorize as [RISK: MODERATE].
Otherwise, [RISK: LOW].`
    }
];

export async function sendToAI(userMessage) {
    aiChatHistory.push({ role: "user", content: userMessage });

    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href, // Optional, for OpenRouter rankings
                "X-Title": "Mind Link" // Optional, for OpenRouter rankings
            },
            body: JSON.stringify({
                model: "x-ai/grok-2", // Or grok-beta, grok-2-vision if text only
                messages: aiChatHistory
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;
        
        aiChatHistory.push({ role: "assistant", content: aiMessage });
        
        // Parse the risk tag
        const riskMatch = aiMessage.match(/\[RISK:\s*(LOW|MODERATE|HIGH)\]/i);
        let riskLevel = "LOW";
        let cleanMessage = aiMessage;
        
        if (riskMatch) {
            riskLevel = riskMatch[1].toUpperCase();
            cleanMessage = aiMessage.replace(/\[RISK:\s*(LOW|MODERATE|HIGH)\]/gi, '').trim();
        }

        return {
            text: cleanMessage,
            risk: riskLevel,
            totalMessages: aiChatHistory.filter(m => m.role === 'user').length
        };

    } catch (error) {
        console.error("AI Error:", error);
        return {
            text: "I'm having trouble connecting to my brain right now. Please try again in a moment.",
            risk: "UNKNOWN"
        };
    }
}
