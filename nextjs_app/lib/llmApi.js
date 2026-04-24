import { auth } from './firebase';

const LLM_SERVICE_URL = process.env.NEXT_PUBLIC_LLM_SERVICE_URL || 'http://localhost:8000';

export async function askLLM({ projectId, datasetId, query }) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();

    const body = { dataset_id: datasetId, query };
    if (projectId) body.project_id = projectId;

    const resp = await fetch(`${LLM_SERVICE_URL}/api/llm/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        let body;
        try { body = await resp.json(); } catch { body = { detail: await resp.text() }; }
        const err = new Error(body.detail || `LLM service returned ${resp.status}`);
        err.status = resp.status;
        err.body = body;
        throw err;
    }
    return resp.json();
}
