-- ChatSession TABLE
-- Represents a persistent chat conversation under a project
CREATE TABLE IF NOT EXISTS public."ChatSession" (
    "session_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("project_id") REFERENCES public."Project"("project_id") ON DELETE CASCADE
);

-- ChatMessage TABLE
-- Stores individual messages within a session
CREATE TABLE IF NOT EXISTS public."ChatMessage" (
    "message_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "session_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    "content" TEXT,
    "tool_calls" JSONB, -- Stores the JSON structure of tool invocations or tool results
    "created_at" TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("session_id") REFERENCES public."ChatSession"("session_id") ON DELETE CASCADE
);

-- AIJob TABLE
-- Handles the background queue for tools and data generation
CREATE TABLE IF NOT EXISTS public."AIJob" (
    "job_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "session_id" UUID, -- Optional, if spawned from a chat
    "message_id" UUID, -- The assistant message that triggered it
    "type" VARCHAR(100) NOT NULL, -- e.g., 'tool_execution'
    "tool_name" VARCHAR(100) NOT NULL, -- e.g., 'extract_poi'
    "parameters" JSONB, -- e.g., {"poi": "hospital", "country": "Egypt"}
    "status" VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, processing, completed, failed
    "result" JSONB, -- The final dataset or output
    "error" TEXT, -- Any error message if failed
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("project_id") REFERENCES public."Project"("project_id") ON DELETE CASCADE,
    FOREIGN KEY ("session_id") REFERENCES public."ChatSession"("session_id") ON DELETE SET NULL,
    FOREIGN KEY ("message_id") REFERENCES public."ChatMessage"("message_id") ON DELETE SET NULL
);
