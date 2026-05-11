import Redis from 'ioredis';
import { NLQJob, Project, Dataset } from '../models/index.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Connect to Redis
const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
});

export const createNLQJob = async (req, res) => {
    try {
        let type = req.body.type || req.query.type;
        const query = req.body.query;
        const datasets = req.body.datasets || [];
        const projectId = req.body.projectId;

        // Validate datasets selection
        if (!datasets || datasets.length === 0) {
            return res.status(400).json({ error: 'At least one dataset must be selected.' });
        }

        // Validate type
        if (!['aggregation', 'comparison', 'descriptive'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type. Must be aggregation, comparison, or descriptive.' });
        }

        if (!query || !projectId) {
            return res.status(400).json({ error: 'Query and projectId are required.' });
        }

        // Verify project belongs to user
        const project = await Project.findOne({ where: { id: projectId, user_id: req.user.uid } });
        if (!project) {
            return res.status(404).json({ error: 'Project not found.' });
        }

        // Create empty folder in rustfs for the project results (create a dummy object to represent folder)
        const folderKey = `projects/${projectId}/nlq_results/`;
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: folderKey,
                Body: ''
            }));
        } catch (s3Error) {
            console.error('Error creating folder in rustfs:', s3Error);
        }

        // Save to Database
        const nlqJob = await NLQJob.create({
            project_id: projectId,
            type: type,
            query: query,
            status: 'processing'
        });

        const jobId = nlqJob.id;

        // Resolve datasets to S3 keys from the database
        const datasetDetails = await Dataset.findAll({
            where: { id: datasets }
        });

        if (datasetDetails.length === 0) {
            return res.status(400).json({ error: 'Selected datasets not found or invalid.' });
        }

        const resolvedDatasets = datasetDetails.map(ds => ({
            datasetId: ds.id,
            s3Key: ds.s3_key,
            fileFormat: ds.file_format?.toLowerCase(),
            name: ds.name
        }));

        // Push to Redis Queue
        const jobPayload = {
            jobId: jobId,
            type: type,
            query: query,
            datasets: resolvedDatasets,
            projectId: projectId
        };

        await redis.lpush('nlq_jobs_queue', JSON.stringify(jobPayload));

        await redis.hset(`job_status:${jobId}`, 'status', 'processing');

        return res.status(201).json({
            message: 'Job created successfully',
            jobId: jobId,
            status: 'processing'
        });

    } catch (error) {
        console.error('Error creating NLQ job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getNLQJobStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const redisStatus = await redis.hgetall(`job_status:${id}`);

        if (redisStatus && redisStatus.status) {
            return res.status(200).json({
                status: redisStatus.status,
                resultPath: redisStatus.resultPath || null,
                error: redisStatus.error || null
            });
        }

        const job = await NLQJob.findByPk(id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status === 'processing') {
            return res.status(200).json({ status: 'processing' });
        } else {
            return res.status(200).json({
                status: job.status,
                resultPath: job.result_path,
                error: null
            });
        }
    } catch (error) {
        console.error('Error fetching NLQ job status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateNLQJobStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resultPath, errorMessage } = req.body;
        const workerKey = req.headers['x-worker-key'];

        if (workerKey !== process.env.WORKER_API_KEY) {
            return res.status(403).json({ error: 'Forbidden: Invalid worker key' });
        }

        if (!['done', 'failed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be done or failed.' });
        }

        const status_key = `job_status:${id}`;
        await redis.hset(status_key, 'status', status);
        if (resultPath) {
            await redis.hset(status_key, 'resultPath', resultPath);
        }
        if (errorMessage) {
            await redis.hset(status_key, 'error', errorMessage);
        }

        await NLQJob.update(
            { status, result_path: resultPath },
            { where: { id: id } }
        );

        console.log(`Job ${id} updated to ${status} by worker.${errorMessage ? ` Error: ${errorMessage}` : ''}`);

        return res.status(200).json({ message: 'Job status updated successfully' });
    } catch (error) {
        console.error('Error updating NLQ job status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getNLQJobResult = async (req, res) => {
    try {
        const { id } = req.params;

        const job = await NLQJob.findByPk(id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status !== 'done' || !job.result_path) {
            return res.status(400).json({ error: 'Job result not available yet' });
        }

        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: job.result_path
        }));

        let contentType = 'application/octet-stream';
        if (job.result_path.endsWith('.png')) contentType = 'image/png';
        else if (job.result_path.endsWith('.json')) contentType = 'application/json';
        else if (job.result_path.endsWith('.geojson')) contentType = 'application/geo+json';

        res.setHeader('Content-Type', contentType);
        response.Body.pipe(res);
    } catch (error) {
        console.error('Error fetching NLQ result:', error);
        res.status(500).json({ error: 'Failed to fetch result' });
    }
};

export const listNLQJobs = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { type } = req.query;

        const where = { project_id: projectId };
        if (type) {
            if (!['aggregation', 'comparison', 'descriptive'].includes(type)) {
                return res.status(400).json({ error: 'Invalid type filter.' });
            }
            where.type = type;
        }

        const jobs = await NLQJob.findAll({
            where,
            order: [['created_at', 'DESC']],
        });

        return res.status(200).json(jobs);
    } catch (error) {
        console.error('Error listing NLQ jobs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
