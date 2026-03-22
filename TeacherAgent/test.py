# pip install openai python-dotenv
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # loads .env into environment

# If your .env uses OPEN_API_KEY, map it:
os.environ.setdefault("OPENAI_API_KEY", os.getenv("OPEN_API_KEY", ""))

client = OpenAI()

resp = client.responses.create(
    model="gpt-5.4",
    input="Say hi in one sentence.",
)

print(resp.output_text)
