import os
import json
import time
import redis
from job_handlers import aggregation, comparison, descriptive

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def main():
    print(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")

    os.makedirs("temp_job_output", exist_ok=True)

    print("Worker started. Listening for jobs on nlq_jobs_queue...")
    while True:
        try:
            # Block until a job is available
            result = r.brpop("nlq_jobs_queue", timeout=0)
            if result:
                queue_name, job_data = result
                job = json.loads(job_data)
                job_id = job.get("jobId")
                job_type = job.get("type")
                
                print(f"Processing Job {job_id} of type: {job_type}")
                
                # Route to the correct module
                try:
                    result_path = None
                    if job_type == "aggregation":
                        result_path = aggregation.process(job)
                    elif job_type == "comparison":
                        result_path = comparison.process(job)
                    elif job_type == "descriptive":
                        result_path = descriptive.process(job)
                    else:
                        print(f"Unknown job type: {job_type}")
                        continue
                    
                    # Update status in Redis
                    status_key = f"job_status:{job_id}"
                    r.hset(status_key, "status", "done")
                    if result_path:
                        r.hset(status_key, "resultPath", result_path)
                    
                    print(f"Job {job_id} completed successfully. Result path: {result_path}")
                except Exception as e:
                    print(f"Error processing job {job_id}: {e}")
                    status_key = f"job_status:{job_id}"
                    r.hset(status_key, "status", "failed")
        except Exception as e:
            print(f"Redis connection or processing error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
