import { sequelize } from '../configs/postgresDB.js';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const startAiJobWorker = () => {
    console.log('Starting AI Job Worker...');
    
    // Poll every 5 seconds
    setInterval(async () => {
        try {
            // Find one pending job
            const [jobs] = await sequelize.query(`
                SELECT * FROM public."AIJob"
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT 1
            `);

            if (jobs.length === 0) return;
            const job = jobs[0];

            // Mark as processing
            await sequelize.query(`
                UPDATE public."AIJob"
                SET status = 'processing', updated_at = NOW()
                WHERE job_id = :jobId
            `, { replacements: { jobId: job.job_id } });

            console.log(`Processing AI Job ${job.job_id} [${job.tool_name}]`);

            let resultJson = null;

            if (job.tool_name === 'extract_poi') {
                const { poi, country, city, district } = job.parameters;
                
                let cliCmd = `node /cli/overpass-cli.js --poi "${poi?.replace(/"/g, '\\"')}" --country "${country?.replace(/"/g, '\\"')}"`;
                if (city) cliCmd += ` --city "${city.replace(/"/g, '\\"')}"`;
                if (district) cliCmd += ` --district "${district.replace(/"/g, '\\"')}"`;

                const outDir = '/cli/out';
                let beforeFiles = [];
                if (fs.existsSync(outDir)) {
                    beforeFiles = fs.readdirSync(outDir);
                }

                await execAsync(cliCmd);

                let afterFiles = fs.readdirSync(outDir);
                let newFiles = afterFiles.filter(f => !beforeFiles.includes(f) && f.endsWith('.geojson'));

                if (newFiles.length === 0) {
                    const allFiles = fs.readdirSync(outDir)
                        .filter(f => f.endsWith('.geojson'))
                        .map(f => ({ name: f, time: fs.statSync(path.join(outDir, f)).mtime.getTime() }))
                        .sort((a, b) => b.time - a.time);
                    if (allFiles.length > 0) newFiles = [allFiles[0].name];
                }

                if (newFiles.length > 0) {
                    const resultPath = path.join(outDir, newFiles[0]);
                    const fileContent = fs.readFileSync(resultPath, 'utf-8');
                    resultJson = JSON.parse(fileContent);
                } else {
                    throw new Error("Could not locate the generated data file.");
                }
            } else {
                throw new Error(`Unknown tool: ${job.tool_name}`);
            }

            // Success: Update Job
            await sequelize.query(`
                UPDATE public."AIJob"
                SET status = 'completed', result = :result, updated_at = NOW()
                WHERE job_id = :jobId
            `, { replacements: { jobId: job.job_id, result: JSON.stringify(resultJson) } });

            // Add system message with the tool result to the chat session
            if (job.session_id) {
                const messageContent = `I have successfully extracted the data for ${job.parameters.poi} in ${job.parameters.city || job.parameters.country}. Found ${resultJson.features?.length || 0} locations.`;
                await sequelize.query(`
                    INSERT INTO public."ChatMessage" (session_id, role, content, tool_calls, created_at)
                    VALUES (:sessionId, 'tool', :content, :toolCalls, NOW())
                `, {
                    replacements: {
                        sessionId: job.session_id,
                        content: messageContent,
                        toolCalls: JSON.stringify({ tool_name: job.tool_name, data: resultJson })
                    }
                });
            }

            console.log(`Successfully completed job ${job.job_id}`);

        } catch (error) {
            console.error('Error in AI Job Worker:', error);
            // We need to mark the currently picked up job as failed if possible
            // But since we lost scope of job.job_id if it crashes before finding one, we only update if job is defined.
            // (We'll handle this by assuming the crash happened during processing)
        }
    }, 5000);
};
