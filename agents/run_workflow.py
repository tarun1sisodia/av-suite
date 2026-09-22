import asyncio
import sys
import json
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from openai import AsyncOpenAI

from agents.config import GATEWAY_BASE_URL, GATEWAY_API_KEY
from agents.adk_supervisor import create_supervisor_agent, DecomposedTasks
from agents.specialists.schema_agent import generate_schemas
from agents.specialists.service_agent import generate_service_logic
from agents.specialists.test_agent import generate_unit_tests

async def run_parallel_pipeline(user_request: str):
    print("=" * 70)
    print("🚀 GOOGLE ADK + PARALLEL GATEWAY WORKFLOW PROTOTYPE")
    print("=" * 70)
    print(f"\n[1] User Requirement:\n    {user_request}\n")

    # Step 1: Supervisor (Google ADK) decomposes the task
    print("[2] 🧠 Google ADK Supervisor: Decomposing task into micro-tasks...")
    supervisor = create_supervisor_agent()
    session_service = InMemorySessionService()
    runner = Runner(app_name="av_suite_pipeline", agent=supervisor, session_service=session_service)
    
    # Run the supervisor
    session = await session_service.create_session(app_name="av_suite_pipeline", user_id="developer")
    
    # Run the supervisor with a Content message
    message = types.Content(role="user", parts=[types.Part.from_text(text=user_request)])
    events = []
    async for event in runner.run_async(session_id=session.id, user_id="developer", new_message=message):
        events.append(event)
    
    # Extract output from event
    raw_output = None
    for event in reversed(events):
        if hasattr(event, "content") and event.content:
            raw_output = event.content
            break
        elif hasattr(event, "actions") and event.actions:
            for act in event.actions:
                if hasattr(act, "output") and act.output:
                    raw_output = act.output
                    break
    
    # Parse decomposition
    try:
        if isinstance(raw_output, str):
            decomposed = DecomposedTasks.model_validate_json(raw_output)
        elif isinstance(raw_output, dict):
            decomposed = DecomposedTasks.model_validate(raw_output)
        else:
            # Fallback if raw content is nested
            text = str(raw_output)
            decomposed = DecomposedTasks(
                feature_name="Feature Implementation",
                schema_task=f"Create Pydantic models for: {user_request}",
                service_task=f"Create service functions for: {user_request}",
                test_task=f"Create pytest test cases for: {user_request}",
            )
    except Exception as e:
        print(f"    (Notice: using direct task mapping: {e})")
        decomposed = DecomposedTasks(
            feature_name="Feature Implementation",
            schema_task=f"Create Pydantic models for: {user_request}",
            service_task=f"Create service functions for: {user_request}",
            test_task=f"Create pytest test cases for: {user_request}",
        )

    print(f"    ✓ Feature: {decomposed.feature_name}")
    print(f"    ✓ Schema Task:  {decomposed.schema_task[:80]}...")
    print(f"    ✓ Service Task: {decomposed.service_task[:80]}...")
    print(f"    ✓ Test Task:    {decomposed.test_task[:80]}...\n")

    # Step 2: Dispatch in parallel across FreeLLMAPI gateway
    print("[3] ⚡ Dispatching 3 Specialist Agents IN PARALLEL via Gateway...")
    client = AsyncOpenAI(base_url=GATEWAY_BASE_URL, api_key=GATEWAY_API_KEY)

    t0 = asyncio.get_event_loop().time()
    schema_res, service_res, test_res = await asyncio.gather(
        generate_schemas(decomposed.schema_task, client=client),
        generate_service_logic(decomposed.service_task, client=client),
        generate_unit_tests(decomposed.test_task, client=client),
    )
    elapsed = asyncio.get_event_loop().time() - t0

    print(f"\n[4] ✅ All 3 Specialist Agents Completed in {elapsed:.2f}s!")
    print("=" * 70)
    print("📦 1. GENERATED SCHEMAS (Pydantic):")
    print("-" * 70)
    print(schema_res.strip())
    print("\n" + "=" * 70)
    print("⚙️  2. GENERATED SERVICE LOGIC (FastAPI):")
    print("-" * 70)
    print(service_res.strip())
    print("\n" + "=" * 70)
    print("🧪 3. GENERATED TESTS (Pytest):")
    print("-" * 70)
    print(test_res.strip())
    print("=" * 70)

if __name__ == "__main__":
    prompt = "Add appointment discount calculation based on patient tier (Bronze: 5%, Silver: 10%, Gold: 20%) with maximum cap of $100."
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    asyncio.run(run_parallel_pipeline(prompt))
