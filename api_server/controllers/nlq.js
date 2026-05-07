import Redis from 'ioredis';
import { QueryTypes } from 'sequelize';
import { NLQJob, Project, Dataset, Dataset_Project } from '../models/index.js';
import { sequelize } from '../configs/postgresDB.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { classify } from '../utils/nlqClassifier.js';
import { matchTwoDistricts } from '../utils/districtMatcher.js';
import { parseAttributeToken } from '../utils/parseComparisonQuery.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

const CLASSIFY_ERRORS = {
  empty: 'Query cannot be empty.',
  not_a_verb: 'Conversations must start with a verb (e.g. \'compare\').',
  no_type_terms: 'This query is not supported.',
};

export const createNLQJob = async (req, res) => {
  try {
    const query = (req.body.query || '').trim();
    const projectId = req.body.projectId;
    const datasetId = req.body.datasetId || (Array.isArray(req.body.datasets) && req.body.datasets[0]) || null;
    const clientType = req.body.type;

    if (!query || !projectId) {
      return res.status(400).json({ error: 'Query and projectId are required.' });
    }

    if (!['aggregation', 'comparison', 'descriptive'].includes(clientType)) {
      return res.status(400).json({
        error: 'Invalid type. Must be aggregation, comparison, or descriptive.',
      });
    }

    const project = await Project.findOne({ where: { id: projectId, user_id: req.user.uid } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (clientType !== 'comparison') {
      const nlqJob = await NLQJob.create({
        project_id: projectId,
        type: clientType,
        query,
        status: 'processing',
      });
      const jobId = nlqJob.id;
      const folderKey = `projects/${projectId}/nlq_results/`;
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: folderKey,
          Body: '',
        }));
      } catch (s3Error) {
        console.error('Error creating folder in rustfs:', s3Error);
      }
      const passthroughPayload = {
        jobId,
        type: clientType,
        query,
        projectId,
        datasets: req.body.datasets || [],
      };
      await redis.lpush('nlq_jobs_queue', JSON.stringify(passthroughPayload));
      await redis.hset(`job_status:${jobId}`, 'status', 'processing');
      return res.status(201).json({
        message: 'Job created successfully',
        jobId,
        status: 'processing',
        type: clientType,
      });
    }

    // Comparison-only validation below.
    const cls = classify(query);
    if (!cls.ok) {
      return res.status(400).json({
        error: CLASSIFY_ERRORS[cls.reason] || 'Query is not supported.',
      });
    }

    if (cls.type !== 'comparison') {
      return res.status(400).json({
        error: 'Query does not look like a comparison. Use a comparison verb (compare, contrast, …).',
      });
    }

    if (!datasetId) {
      return res.status(400).json({ error: 'Select a dataset for comparison.' });
    }

    const dataset = await Dataset.findByPk(datasetId);
    if (!dataset || (!dataset.is_public && dataset.user_id !== req.user.uid)) {
      return res.status(404).json({
        error: 'Selected dataset was not found or is not accessible.',
      });
    }

    const projectLink = await Dataset_Project.findOne({
      where: { dataset_id: datasetId, project_id: projectId },
    });
    if (!projectLink) {
      return res.status(400).json({
        error: 'Selected dataset is not linked to the active project.',
      });
    }

    const datasetDistricts = await sequelize.query(
      `
        SELECT DISTINCT d.district_id, d.name_en
        FROM districts d
        JOIN "Feature" f ON ST_Contains(d.boundaries, f.geometry)
        WHERE f.dataset_id = :dataset_id
      `,
      {
        replacements: { dataset_id: datasetId },
        type: QueryTypes.SELECT,
      },
    );

    if (datasetDistricts.length === 0) {
      return res.status(400).json({
        error: 'The selected dataset has no features inside any district.',
      });
    }

    const matchResult = matchTwoDistricts(query, datasetDistricts);
    if (!matchResult.ok) {
      const sample = datasetDistricts.slice(0, 5).map((d) => d.name_en).join(', ');
      const more = datasetDistricts.length > 5 ? `, … (+${datasetDistricts.length - 5} more)` : '';
      return res.status(400).json({
        error: `Please mention two districts where the selected dataset has features. Available: ${sample}${more}.`,
      });
    }

    const attributeToken = parseAttributeToken(query);

    const folderKey = `projects/${projectId}/nlq_results/`;
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: folderKey,
        Body: '',
      }));
    } catch (s3Error) {
      console.error('Error creating folder in rustfs:', s3Error);
    }

    const nlqJob = await NLQJob.create({
      project_id: projectId,
      type: 'comparison',
      query,
      status: 'processing',
    });
    const jobId = nlqJob.id;

    const jobPayload = {
      jobId,
      type: 'comparison',
      comparisonMode: 'districts',
      query,
      projectId,
      datasetId,
      datasetName: dataset.name,
      geometryType: dataset.geometry_type || 'Point',
      districtA: {
        district_id: matchResult.matches[0].district_id,
        name_en: matchResult.matches[0].name_en,
      },
      districtB: {
        district_id: matchResult.matches[1].district_id,
        name_en: matchResult.matches[1].name_en,
      },
      attributeToken,
    };
    await redis.lpush('nlq_jobs_queue', JSON.stringify(jobPayload));
    await redis.hset(`job_status:${jobId}`, 'status', 'processing');

    return res.status(201).json({
      message: 'Job created successfully',
      jobId,
      status: 'processing',
      type: 'comparison',
      matchedTerms: cls.matchedTerms,
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
      if (redisStatus.status === 'processing') {
        return res.status(200).json({ status: 'processing' });
      } else if (redisStatus.status === 'done') {
        const job = await NLQJob.findByPk(id);
        await NLQJob.update(
          { status: 'done', result_path: redisStatus.resultPath },
          { where: { id } },
        );
        return res.status(200).json({
          status: 'done',
          resultPath: redisStatus.resultPath,
          resultUrl: `/nlq/${id}/result`,
          resultType: job?.type === 'comparison' ? 'comparison_geojson' : null,
        });
      } else {
        return res.status(200).json({
          status: redisStatus.status,
          error: redisStatus.error || null,
        });
      }
    }

    const job = await NLQJob.findByPk(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'processing') {
      return res.status(200).json({ status: 'processing' });
    }
    return res.status(200).json({
      status: job.status,
      resultPath: job.result_path,
      resultUrl: job.status === 'done' ? `/nlq/${id}/result` : null,
      resultType: job.type === 'comparison' && job.status === 'done' ? 'comparison_geojson' : null,
    });
  } catch (error) {
    console.error('Error fetching NLQ job status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNLQJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resultPath } = req.body;
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

    await NLQJob.update(
      { status, result_path: resultPath },
      { where: { id } },
    );

    console.log(`Job ${id} updated to ${status} by worker.`);

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
      Key: job.result_path,
    }));

    const contentType = job.result_path.endsWith('.png') ? 'image/png' : 'application/octet-stream';
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
    const jobs = await NLQJob.findAll({
      where: { project_id: projectId },
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(jobs);
  } catch (error) {
    console.error('Error listing NLQ jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNLQResult = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await NLQJob.findByPk(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const project = await Project.findOne({
      where: { id: job.project_id, user_id: req.user.uid },
    });
    if (!project) return res.status(404).json({ error: 'Job not found' });

    if (job.status !== 'done' || !job.result_path) {
      return res.status(409).json({ error: 'Job result is not ready' });
    }

    const cmd = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: job.result_path,
    });
    const object = await s3Client.send(cmd);
    const body = await object.Body.transformToString('utf-8');
    const result = JSON.parse(body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching NLQ result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
