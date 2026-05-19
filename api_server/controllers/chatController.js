import { sequelize } from '../configs/postgresDB.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_AI_API_KEY?.replace(/^["']|["']$/g, '').trim();

// Available Tools Definition
const tools = [
    {
        type: "function",
        function: {
            name: "extract_poi",
            description: "Extract Points of Interest (POI) data for a specific location using Overpass API.",
            parameters: {
                type: "object",
                properties: {
                    poi: { type: "string", description: "The specific type of POI to search for (e.g., hospital, restaurant, cafe, university)." },
                    country: { type: "string", description: "The full country name (e.g., Saudi Arabia, Egypt). MUST BE PROVIDED." },
                    city: { type: "string", description: "The city name (e.g., Jeddah, Riyadh). EXTRACT THIS IF MENTIONED." },
                    district: { type: "string", description: "The district or neighborhood name." }
                },
                required: ["poi", "country"]
            }
        }
    }
];

export const getProjectChatHistory = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Ensure session exists
        let [sessions] = await sequelize.query(`
            SELECT * FROM public."ChatSession" WHERE project_id = :projectId LIMIT 1
        `, { replacements: { projectId } });

        if (sessions.length === 0) {
            return res.json({ success: true, messages: [] });
        }

        const [messages] = await sequelize.query(`
            SELECT * FROM public."ChatMessage" 
            WHERE session_id = :sessionId 
            ORDER BY created_at ASC
        `, { replacements: { sessionId: sessions[0].session_id } });

        res.json({ success: true, messages, sessionId: sessions[0].session_id });
    } catch (error) {
        console.error('Chat History Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { content } = req.body;

        if (!content) return res.status(400).json({ success: false, message: 'Message content required' });

        // Get or Create Session
        let [sessions] = await sequelize.query(`
            SELECT * FROM public."ChatSession" WHERE project_id = :projectId LIMIT 1
        `, { replacements: { projectId } });

        let sessionId;
        if (sessions.length === 0) {
            const [newSession] = await sequelize.query(`
                INSERT INTO public."ChatSession" (project_id) VALUES (:projectId) RETURNING session_id
            `, { replacements: { projectId } });
            sessionId = newSession[0].session_id;
        } else {
            sessionId = sessions[0].session_id;
        }

        // Save User Message
        const [userMessage] = await sequelize.query(`
            INSERT INTO public."ChatMessage" (session_id, role, content) 
            VALUES (:sessionId, 'user', :content) RETURNING *
        `, { replacements: { sessionId, content } });

        // Setup streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Do NOT fetch history so the AI is completely stateless
        const messages = [
            { role: 'user', content }
        ];

        // System Prompt with Smart Location handling
        const systemPrompt = `You are a strict, automated data extraction agent.
CRITICAL INSTRUCTION: When a user requests data, locations, or datasets, you MUST ONLY output the tool call.
DO NOT output ANY conversational text.
DO NOT say "Understood", "Let me search", or apologize. Be COMPLETELY SILENT except for the tool call JSON.
If you output any text before the tool call, you fail your instructions.

CRITICAL SMART LOCATION HANDLING:
- Auto-correct invalid country names (e.g. "sadi" -> "Saudi Arabia").
- If the user mentions only a city, infer the country automatically.
- Always include the 'city' parameter if a city is mentioned.`;

        messages.unshift({ role: 'system', content: systemPrompt });

        const deepseekReq = {
            model: 'deepseek-chat',
            messages,
            tools,
            stream: true
        };

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(deepseekReq)
        });

        if (!response.ok) {
            console.error('DeepSeek Error:', await response.text());
            res.write(`data: ${JSON.stringify({ error: 'Failed to communicate with AI' })}\n\n`);
            return res.end();
        }

        let assistantContent = "";
        let toolCallAcc = null;

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

            for (const line of lines) {
                const dataStr = line.replace(/^data: /, '').trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(dataStr);
                    const delta = data.choices[0].delta;

                    // We ignore all conversational text generated by the AI
                    if (delta.content) {
                        assistantContent += delta.content;
                    }

                    if (delta.tool_calls) {
                        const tc = delta.tool_calls[0];
                        if (tc.id) {
                            toolCallAcc = { id: tc.id, name: tc.function.name, arguments: "" };
                        }
                        if (tc.function && tc.function.arguments) {
                            toolCallAcc.arguments += tc.function.arguments;
                        }
                    }
                } catch (e) { }
            }
        }

        // Handle tool calls or static message
        if (toolCallAcc) {
            try {
                const args = JSON.parse(toolCallAcc.arguments);
                
                // Save tool call message
                const [toolMsg] = await sequelize.query(`
                    INSERT INTO public."ChatMessage" (session_id, role, content, tool_calls) 
                    VALUES (:sessionId, 'assistant', 'Initiating tool: ' || :toolName, :toolCalls)
                    RETURNING message_id
                `, { 
                    replacements: { 
                        sessionId, 
                        toolName: toolCallAcc.name,
                        toolCalls: JSON.stringify(args) 
                    } 
                });

                // Spawn AI Job
                await sequelize.query(`
                    INSERT INTO public."AIJob" (project_id, session_id, message_id, type, tool_name, parameters)
                    VALUES (:projectId, :sessionId, :messageId, 'tool_execution', :toolName, :parameters)
                `, {
                    replacements: {
                        projectId,
                        sessionId,
                        messageId: toolMsg[0].message_id,
                        toolName: toolCallAcc.name,
                        parameters: JSON.stringify(args)
                    }
                });

                res.write(`data: ${JSON.stringify({ 
                    tool_call: true, 
                    tool_name: toolCallAcc.name, 
                    message: `Started ${toolCallAcc.name} job...`
                })}\n\n`);

            } catch(e) {
                console.error("Tool execution error:", e);
            }
        } else {
            // No tool was called. The user asked a general question or unrelated prompt.
            const staticMessage = "I am a dedicated data extraction agent. I can only process requests for geographic datasets.\n\nHere are some examples of what you can ask me:\n- 'I need a collection of dataset for universities in Jeddah, Saudi Arabia'\n- 'Extract all hospitals in Cairo, Egypt'\n- 'Find cafes in London, UK'";
            
            await sequelize.query(`
                INSERT INTO public."ChatMessage" (session_id, role, content) 
                VALUES (:sessionId, 'assistant', :content)
            `, { replacements: { sessionId, content: staticMessage } });
            
            // Stream the static message directly to the frontend at once
            res.write(`data: ${JSON.stringify({ content: staticMessage })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Chat Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        } else {
            res.end();
        }
    }
};

export const getJobStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const [jobs] = await sequelize.query(`
            SELECT * FROM public."AIJob" 
            WHERE session_id = :sessionId AND status IN ('pending', 'processing')
        `, { replacements: { sessionId } });

        res.json({ success: true, activeJobs: jobs.length > 0 });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};
