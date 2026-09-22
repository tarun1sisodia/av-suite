from openai import AsyncOpenAI
from agents.config import GATEWAY_BASE_URL, GATEWAY_API_KEY, FAST_WORKER_MODEL

SYSTEM_INSTRUCTION = """You are a specialist QA / Test Automation Engineer.
Your only job is to write comprehensive, production-ready pytest unit tests.
Rules:
1. Output ONLY python code inside ```python ``` blocks.
2. Use pytest, pytest-asyncio (if async), and mock dependencies where appropriate.
3. Test happy paths, boundary conditions, and failure/error states.
"""

async def generate_unit_tests(task_description: str, code_context: str = "", client: AsyncOpenAI = None) -> str:
    """Generates pytest unit tests for the given task and code context."""
    if client is None:
        client = AsyncOpenAI(base_url=GATEWAY_BASE_URL, api_key=GATEWAY_API_KEY)
        
    prompt = f"Write comprehensive pytest unit tests for this feature:\n{task_description}\n"
    if code_context:
        prompt += f"\nCode Context:\n{code_context}\n"

    response = await client.chat.completions.create(
        model=FAST_WORKER_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content
