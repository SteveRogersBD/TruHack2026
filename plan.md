# Hackathon MVP Migration Plan: Context-Aware Pedagogical Engine

This plan is optimized for **speed and simplicity** during the hackathon. We focus entirely on making the backend context-aware and pedagogically disciplined, without changing the frontend schema or building complex new UI layouts.

---

## Phase 1: Context Fetching & Normalization (The "Pedagogical Brief")
Instead of dumping raw JSON or massive transcripts into the primary Tutor Prompt, we will create a fast, intermediate "normalization" step.

### Action Items:
1. **Create Source Fetchers (`tools.py`):**
   - `get_youtube_transcript(url)`
   - `read_pdf(file)`
   - `scrape_webpage(url)`

2. **The Normalizer LLM Step:**
   - When a source is fetched, pass the raw text to a secondary, fast LLM call (e.g., `gpt-4o-mini`) to extract specific elements based on the source type:
     - **YouTube:** Extract central idea, sequence, terminology, and examples.
     - **PDF:** Extract section headings, definitions, and formulas.
     - **Webpage:** Extract the thesis, supporting points, and examples.
   - The Normalizer outputs a clean **Pedagogical Brief** in this exact format:
     ```json
     {
       "source_type": "YouTube Video",
       "title": "Introduction to the Krebs Cycle",
       "key_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
       "important_terms": ["ATP", "Mitochondria", "Citric Acid"],
       "likely_misconception": "Students often confuse X with Y.",
       "recommended_visual": "Mermaid Flowchart"
     }
     ```
3. **Inject the Brief:**
   - Pass *only* this clean Pedagogical Brief into the primary `TUTOR_NODE_PROMPT`'s context window.

## Phase 2: Visual Discipline in the Tutor Prompt
We keep the existing JSON output structure (`speech`, `emotion`, `canvas_mode`, `canvas_actions`) but tightly constrain *how* the Tutor uses the Canvas.

### Action Items:
1. **Update `TUTOR_NODE_PROMPT` rules:**
   - **Educational Primacy:** "Every output must teach a concept, not just summarize a request."
   - **Visual Discipline:** "Use ONE strong educational visual. Never output multiple decorative or unrelated media assets."
   - **Format Rules:**
     - Prefer **Mermaid** for processes and systems (Note: the frontend is already highly optimized for rendering Mermaid vs raw SVGs).
     - Prefer **Equation Steps** (LaTeX) for math.
     - Prefer **Labeled Code/Example Blocks** for programming.
   - **Check for Understanding:** "Always end the `speech` with exactly ONE contextual follow-up question that checks the student's understanding of the visual."

---

### The Hackathon Demo Look:
1. Judge pastes a YouTube video about Biology.
2. The UI naturally pauses. Under the hood, the backend fetches the transcript and runs the **Normalizer**, producing a 5-point Pedagogical Brief.
3. The `TUTOR_NODE` reads the brief, recognizes the recommended visual is a "Mermaid Flowchart", and outputs a simple Canvas plan.
4. The frontend renders the standard `whiteboard` Canvas with a beautiful flowchart of the biological process. In the speech bubble, the Tutor explains the chart and asks one targeted question about it.
