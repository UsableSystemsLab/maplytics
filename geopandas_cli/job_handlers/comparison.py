import os

def process(job):
    job_id = job.get("jobId", "unknown")
    query = job.get("query", "")
    message = f"Comparison Job: {job_id}\nQuery: {query}\n"
    
    file_path = os.path.join("temp_job_output", f"{job_id}_comparison.txt")
    with open(file_path, "w") as f:
        f.write(message)
    
    return file_path
