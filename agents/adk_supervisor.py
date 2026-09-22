import os
from pydantic import BaseModel, Field
from google.adk import Agent
from google.genai import types
from agents.config import GEMINI_API_KEY, SUPERVISOR_MODEL

# Ensure GEMINI_API_KEY is available in the environment for Google ADK
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY

class DecomposedTasks(BaseModel):
    """The structured decomposition of a feature into micro-tasks."""
    feature_name: str = Field(description="Short name of the feature")
    schema_task: str = Field(description="Explicit instructions for the Pydantic schema specialist")
    service_task: str = Field(description="Explicit instructions for the Service logic specialist")
    test_task: str = Field(description="Explicit instructions for the Test/QA specialist")

SUPERVISOR_INSTRUCTION = """You are an Expert Software Architect and Supervisor.
Your responsibility is to take a high-level software engineering requirement and break it down into 3 isolated, bounded, atomic micro-tasks:
1. Schema Task: What Pydantic schemas, fields, types, and constraints are required?
2. Service Task: What core business logic functions, inputs, outputs, and validation rules are needed?
3. Test Task: What test scenarios, boundary conditions, and test fixtures are needed?

Be explicit, precise, and concise. Do not write the implementation code yourself; only define the exact specifications for each specialist agent.
"""

def create_supervisor_agent() -> Agent:
    """Creates the Google ADK Supervisor Agent."""
    return Agent(
        name="project_supervisor",
        model=SUPERVISOR_MODEL,
        instruction=SUPERVISOR_INSTRUCTION,
        output_schema=DecomposedTasks,
        generate_content_config=types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )
