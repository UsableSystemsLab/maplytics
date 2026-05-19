import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const extractAndExecute = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_AI_API_KEY?.replace(/^["']|["']$/g, '').trim();
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ success: false, message: 'DeepSeek API key is not configured' });
    }

    // Call DeepSeek to extract entities
    const systemPrompt = `You are an AI that extracts location and POI details from user prompts.
    Extract the following entities: "poi", "country", "city", and "district".
    Return ONLY a valid JSON object. No markdown formatting, no explanations.
    Example: {"poi": "hospital", "country": "Egypt", "city": "Cairo", "district": "Maadi"}`;

    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek Error:', errorText);
      return res.status(500).json({ success: false, message: 'Failed to communicate with DeepSeek AI' });
    }

    const aiData = await deepseekResponse.json();
    let extracted;
    try {
      extracted = JSON.parse(aiData.choices[0].message.content);
    } catch (e) {
      // Fallback if the model still wrapped in markdown despite instructions
      const cleanContent = aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      extracted = JSON.parse(cleanContent);
    }

    const { poi, country, city, district } = extracted;

    if (!poi || !country) {
      return res.status(400).json({ 
        success: false, 
        message: 'Could not identify both POI and Country from the prompt.', 
        extracted 
      });
    }

    // Prepare CLI arguments
    let cliCmd = `node /cli/overpass-cli.js --poi "${poi.replace(/"/g, '\\"')}" --country "${country.replace(/"/g, '\\"')}"`;
    if (city) cliCmd += ` --city "${city.replace(/"/g, '\\"')}"`;
    if (district) cliCmd += ` --district "${district.replace(/"/g, '\\"')}"`;

    console.log('Executing CLI:', cliCmd);

    // Get the /cli/out directory state before
    const outDir = '/cli/out';
    let beforeFiles = [];
    if (fs.existsSync(outDir)) {
      beforeFiles = fs.readdirSync(outDir);
    }

    try {
      await execAsync(cliCmd);
    } catch (execError) {
      console.error('CLI Execution Error:', execError);
      return res.status(500).json({ success: false, message: 'Error executing the overpass query.', error: execError.message });
    }

    // Find the newly created file
    let afterFiles = fs.readdirSync(outDir);
    let newFiles = afterFiles.filter(f => !beforeFiles.includes(f) && f.endsWith('.json'));
    
    if (newFiles.length === 0) {
      // If the directory was just created or if we couldn't easily tell, find the most recently modified file
      const allFiles = fs.readdirSync(outDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(outDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (allFiles.length > 0) {
        newFiles = [allFiles[0].name];
      } else {
        return res.status(500).json({ success: false, message: 'Could not locate the generated data file.' });
      }
    }

    const resultPath = path.join(outDir, newFiles[0]);
    const fileContent = fs.readFileSync(resultPath, 'utf-8');
    const resultJson = JSON.parse(fileContent);

    res.json({
      success: true,
      extracted,
      data: resultJson
    });

  } catch (error) {
    console.error('AI POI Controller Error:', error);
    res.status(500).json({ success: false, message: 'An internal error occurred', error: error.message });
  }
};
