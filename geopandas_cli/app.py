import os
import json
import time
import redis
import requests
from job_handlers import aggregation, comparison, descriptive

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
API_URL = os.environ.get("API_URL", "http://api_server:4000/api")
WORKER_API_KEY = os.environ.get("WORKER_API_KEY", "")

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def update_job_status(job_id, status, result_path=None):
    """Call the API server to update the job status in both Redis and DB."""
    try:
        url = f"{API_URL}/nlq/{job_id}/status"
        headers = {
            "x-worker-key": WORKER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "status": status,
            "resultPath": result_path
        }
        response = requests.patch(url, headers=headers, json=payload)
        if response.status_code == 200:
            print(f"Successfully updated Job {job_id} to {status} via API.")
        else:
            print(f"Failed to update Job {job_id} via API. Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"Error calling API for Job {job_id}: {e}")

def main():
    print(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
    print(f"API Callback URL: {API_URL}")

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
                        comparison_mode = job.get("comparisonMode", "districts")
                        if comparison_mode == "districts":
                            result_path = comparison.process(job)
                        else:
                            raise ValueError(f"Unsupported comparisonMode: {comparison_mode}")
                    elif job_type == "descriptive":
                        result_path = descriptive.process(job)
                    else:
                        print(f"Unknown job type: {job_type}")
                        continue
                    
                    # Update status via API
                    update_job_status(job_id, "done", result_path)
                    
                    print(f"Job {job_id} completed successfully. Result path: {result_path}")
                except Exception as e:
                    print(f"Error processing job {job_id}: {e}")
                    update_job_status(job_id, "failed")
        except Exception as e:
            print(f"Redis connection or processing error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
