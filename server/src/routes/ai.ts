import express from 'express';
import { GoogleGenerativeAI, Tool, GenerateContentRequest } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../database/db.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Define the tools for Gemini
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_deadlines",
        description: "Fetch upcoming intellectual property deadlines for the user's cases.",
        parameters: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Number of days from now to search for deadlines (e.g., 30 for this month)."
            }
          },
          required: ["days"]
        }
      },
      {
        name: "get_recent_cases",
        description: "Fetch a list of recent trademark cases.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of cases to return."
            }
          }
        }
      }
    ]
  }
];

// Implement the actual functions that tools will call
const toolImplementations = {
  get_deadlines: async ({ days }: { days: number }) => {
    const [rows] = await pool.execute(
      `SELECT d.id, d.due_date, d.type as description, tc.mark_name, tc.jurisdiction, c.name as client_name
       FROM deadlines d
       JOIN trademark_cases tc ON d.case_id = tc.id
       LEFT JOIN clients c ON tc.client_id = c.id
       WHERE (d.is_completed = FALSE OR d.status = 'PENDING')
       AND d.due_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY d.due_date ASC`,
      [days || 30]
    );
    return rows;
  },
  get_recent_cases: async ({ limit }: { limit: number }) => {
    const [rows] = await pool.execute(
      `SELECT tc.id, tc.mark_name, tc.status, tc.jurisdiction, c.name as client_name
       FROM trademark_cases tc
       LEFT JOIN clients c ON tc.client_id = c.id
       WHERE tc.deleted_at IS NULL
       ORDER BY tc.created_at DESC
       LIMIT ?`,
      [limit || 5]
    );
    return rows;
  }
};

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      tools: tools
    });

    const chat = model.startChat({
      history: history || [],
    });

    let result = await chat.sendMessage(message);
    let response = result.response;
    
    // Handle function calls if any
    const calls = response.functionCalls();
    
    if (calls && calls.length > 0) {
      const toolResults = [];
      
      for (const call of calls) {
        const fnName = call.name;
        const args = call.args;
        
        console.log(`AI Calling tool: ${fnName}`, args);
        
        if (toolImplementations[fnName as keyof typeof toolImplementations]) {
          const data = await toolImplementations[fnName as keyof typeof toolImplementations](args as any);
          toolResults.push({
            functionResponse: {
              name: fnName,
              response: { content: data }
            }
          });
        }
      }
      
      // Send tool results back to AI to get final answer
      if (toolResults.length > 0) {
        result = await chat.sendMessage(toolResults);
        response = result.response;
      }
    }

    res.json({
      text: response.text(),
      history: await chat.getHistory()
    });

    } catch (error) {
      console.error('AI Chat Error Details:', error);
      logRouteError(req, 'ai.chat', error);
      sendApiError(req, res, 500, {
        code: 'AI_CHAT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process AI chat'
      });
    }

});

export default router;
