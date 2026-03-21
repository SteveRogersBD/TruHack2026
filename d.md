# AI Tutor Learning Workspace — Architecture Specification

**3D Avatar · Adaptive Canvas · Live IDE · Claude Orchestrator**

> A single Claude API call generates structured instructions that simultaneously drive a talking avatar, a dynamic visual canvas, and a live coding environment — creating a fully synchronized AI tutoring experience.

**Author:** Krishna | **Version:** 1.0 | **Date:** March 2026

---

## 1. Executive Summary

This document defines the architecture for an AI-powered interactive learning workspace that combines three synchronized systems: a 3D avatar tutor that speaks and gestures, an adaptive smart canvas that renders visual explanations in real time, and a live integrated development environment for hands-on coding.

All three systems are orchestrated through a single intelligence layer: the Claude API. Every student query produces a structured JSON response that simultaneously drives avatar behavior, canvas rendering, and IDE updates. This creates a multi-modal tutoring experience where the AI explains verbally, visualizes concepts on a whiteboard, and demonstrates code — all in perfect synchronization.

---

## 2. System Overview

### 2.1 Core Concept

The system functions as a real-time AI tutor and visual orchestrator. When a student asks a question, a single Claude API call processes the query and returns a structured response containing everything needed to drive the entire interface simultaneously.

The system never returns plain text responses. Instead, every response includes:

- What to say (speech)
- How to behave (emotion and gesture)
- What to render (canvas actions)
- How to structure the interface (canvas mode)
- What to suggest next (follow-up questions)

### 2.2 Interaction Flow

```
User Input (question or interaction)
       │
       ▼
┌─────────────────────────────────┐
│         Claude API              │
│      (Orchestrator)             │
│                                 │
│  Receives: question + context   │
│  Returns: structured JSON       │
└──────────────┬──────────────────┘
               │
               ▼
    Structured JSON Response
               │
  ┌────────────┼────────────────┐
  ▼            ▼                ▼
┌──────┐  ┌─────────┐  ┌────────────┐
│Avatar│  │ Canvas  │  │    IDE     │
│speaks│  │ renders │  │loads code  │
│aloud │  │  steps  │  │& preview   │
└──┬───┘  └────┬────┘  └─────┬──────┘
   │           │              │
   └───────────┼──────────────┘
               │
               ▼
  User interacts (click / edit / ask)
               │
               ▼
  Context captured & sent back to Claude
               │
               ▼
         Cycle repeats
```

The step-by-step flow:

1. Student types a question or clicks a follow-up suggestion
2. The app sends the question + full context (canvas state, code state, history) to Claude API
3. Claude returns a structured JSON response
4. The app dispatches the response to three parallel systems: Avatar speaks, Canvas renders steps, IDE loads code
5. Student interacts (clicks canvas elements, edits code, asks follow-ups)
6. Context is captured and sent back to Claude. The cycle repeats.

---

## 3. AI Orchestration Layer

### 3.1 Claude API as the Brain

All intelligence is centralized through the Claude API. It acts as a single orchestrator that interprets student queries, generates teaching strategies, produces visual content, writes code, and determines interface layout — all in one call.

### 3.2 Structured Response Format

Every Claude response must conform to the following JSON schema. The system prompt enforces this structure:

```json
{
  "speech": "Binary search works by repeatedly dividing a sorted array in half...",
  "emotion": "explaining",
  "canvas_mode": "split",
  "canvas_actions": [
    {
      "type": "diagram",
      "content": "<svg>...visual of array being split...</svg>",
      "step": 1,
      "narration": "Let's start with a sorted array of 8 elements"
    },
    {
      "type": "code",
      "language": "python",
      "content": "def binary_search(arr, target):\n    left, right = 0, len(arr)-1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
      "step": 2,
      "narration": "Here's the implementation — notice how we narrow the search window each iteration"
    }
  ],
  "follow_up_suggestions": [
    "What happens if the array isn't sorted?",
    "Can you trace through an example with actual numbers?",
    "What's the time complexity and why?"
  ]
}
```

### 3.3 Response Fields Explained

| Field | Purpose |
|-------|---------|
| `speech` | The full verbal explanation the avatar will speak aloud via TTS |
| `emotion` | Controls avatar animation state: `explaining`, `thinking`, `encouraging`, or `correcting` |
| `canvas_mode` | Determines layout: `whiteboard` (full canvas), `split` (canvas + IDE), or `code` (full IDE) |
| `canvas_actions` | Ordered array of visual steps to render on the canvas, synchronized with narration |
| `follow_up_suggestions` | Contextual next questions the student can click to continue learning |

### 3.4 System Prompt Requirements

Claude must be instructed to behave as a Socratic tutor through a carefully crafted system prompt. The key directives:

- **Act as a Socratic tutor** — guide through questions rather than giving direct answers
- **Break every explanation into step-by-step visual + verbal sequences** — never dump a wall of text
- **Always pair explanation with visualization** — every concept gets a canvas action
- **Return strictly valid JSON** conforming to the schema above
- **Adapt responses** based on user input, current canvas state, code state, and conversation history
- **Generate production-quality visuals** — clean SVG diagrams, well-styled code, polished charts

### 3.5 Context Awareness

Each request to Claude must include the complete context to enable coherent, continuous tutoring:

- **User question:** the current query or interaction
- **Current canvas state:** what is currently displayed on the whiteboard
- **Current code:** the code currently in the IDE editor, if any
- **Last execution result:** output or errors from the most recent code run
- **Conversation history:** the full sequence of prior exchanges

This ensures the tutor remembers what it taught, what the student has tried, and what went wrong — enabling truly contextual follow-ups.

---

## 4. 3D Avatar Tutor System

### 4.1 Purpose

The avatar is the visual embodiment of the AI tutor. It creates a sense of presence and engagement by speaking, gesturing, and reacting emotionally to the student's learning journey. It points at elements on the canvas, nods when the student gets something right, and shows a thinking expression when processing complex questions.

### 4.2 Rendering

The avatar is a rigged 3D character model rendered using **Three.js** or **React Three Fiber**. The model is loaded in GLTF/GLB format and positioned in a dedicated viewport alongside the canvas.

### 4.3 Animation States

The avatar has five core animation states, triggered by the `emotion` field in Claude's response:

| Emotion Value | Avatar Behavior |
|---------------|-----------------|
| `explaining` | Gestures with hands, looks toward canvas, moderate energy |
| `thinking` | Hand on chin, slight head tilt, paused movement |
| `encouraging` | Nodding, slight smile animation, open hand gestures |
| `correcting` | Gentle head shake, points at specific canvas element or code line |
| `idle` | Subtle breathing animation, slight sway, neutral posture |

### 4.4 Lip Synchronization

The speech audio stream is analyzed to extract viseme data (mouth shape positions). Each viseme maps to a morph target on the 3D model's face. Options:

- **Oculus Lipsync** — real-time audio-to-viseme analysis
- **Rhubarb Lip Sync** — pre-processed audio-to-viseme mapping
- **Simplified phoneme mapping** — using the Web Audio API's frequency data for basic mouth movement

### 4.5 Text-to-Speech

The `speech` field is sent to a TTS engine to generate audio:

- **ElevenLabs API** — natural, expressive voices with emotional range
- **OpenAI TTS** — fast, reliable synthesis with multiple voice options
- **Browser SpeechSynthesis API** — zero-cost fallback, no API key needed

### 4.6 MVP Fallback

For an initial prototype, a 2D animated avatar using **Lottie** or **animated SVG** can replace the full 3D system. The `emotion` field still drives animation state switches (swapping between Lottie animation files for different expressions). This dramatically reduces implementation complexity while preserving the core experience of a responsive, emotive tutor.

---

## 5. Adaptive Smart Canvas

### 5.1 Purpose

The canvas is a dynamic, multi-modal rendering engine that serves as the tutor's whiteboard. Unlike a static display, it actively sequences visual content in sync with the avatar's narration, supports interactive element clicking, and adapts its layout based on the type of content being taught.

### 5.2 Supported Content Types

| Action Type | Rendering Method | Use Case |
|-------------|-----------------|----------|
| `diagram` | SVG in sandboxed iframe | Flowcharts, architecture diagrams, tree structures, ERDs, state machines |
| `code` | Triggers IDE mode switch | Programming tutorials, code walkthroughs, debugging sessions |
| `equation` | KaTeX / MathJax | Mathematics, physics formulas, statistics, proofs |
| `chart` | Chart.js / D3 in iframe | Data visualization, comparisons, trends, distributions |
| `animation` | HTML/CSS/JS in iframe | Algorithm walkthroughs, physics simulations, process flows |
| `draw` | SVG stroke-dashoffset | Progressive drawing that mimics writing on a whiteboard |

### 5.3 Step Sequencing

The `canvas_actions` array is played as an ordered sequence. Each step has a `narration` field that synchronizes with the avatar's speech:

- **Step timing:** Each step triggers when the avatar reaches the corresponding narration segment, calculated from speech duration and step count.
- **Transitions:** Steps animate in with fade, slide, or progressive draw effects, creating the feeling of the tutor building an explanation piece by piece.
- **Accumulation:** Previous steps remain visible (dimmed) while the current step is highlighted, so the student sees the full picture being constructed.

### 5.4 Interactive Click-to-Ask

Every element on the canvas is clickable. When a student clicks on a diagram node, a code variable, or a chart segment:

1. The system captures the element's ID or region coordinates
2. Constructs a context-aware query (e.g., "The student clicked on the 'database' node in the architecture diagram")
3. Sends it to Claude along with the full current context
4. The tutor then explains that specific element, highlighting it on the canvas while speaking

This makes the whiteboard conversational, not just a display.

### 5.5 Canvas Modes

| Mode | Layout and Behavior |
|------|-------------------|
| `whiteboard` | Full-width canvas. Used for diagrams, equations, charts, and visual explanations. |
| `split` | Left side: canvas. Right side: IDE. Used when a topic needs both visual and code explanation. |
| `code` | Full-width IDE with output panel. Avatar floats as a small overlay. Used for pure coding topics. |

---

## 6. Live IDE Integration

### 6.1 Purpose

When the topic involves programming, the canvas transforms into a full integrated development environment. The tutor's code appears line by line as if being typed, the student can edit and run it, and any errors or questions feed directly back into the tutoring loop.

### 6.2 Layout

The IDE operates in a split-pane configuration:

- **Left panel:** Monaco Editor (the engine behind VS Code) with syntax highlighting, autocomplete, and error squiggles
- **Right panel:** Output / preview showing execution results or live HTML preview
- **Avatar:** Floating overlay in the corner, continuing to narrate and gesture

### 6.3 Code Execution

| Language | Execution Environment |
|----------|----------------------|
| JavaScript / HTML | Sandboxed iframe with live preview. Output renders immediately. |
| Python | Pyodide: a full CPython interpreter compiled to WebAssembly, runs entirely in the browser with no server required. |
| Other languages | External API calls to Judge0 or Piston, which execute code in a secure sandbox and return stdout/stderr. |

### 6.4 AI-Assisted Coding Loop

The IDE is not just a code display — it is part of the tutoring loop. When a student edits code and encounters an error, the following context is sent to Claude:

- The current code in the editor
- The error output or unexpected result
- The student's specific question (e.g., "why does line 7 throw an error?")
- The conversation history up to this point

Claude responds with:

- A verbal explanation of the error
- A canvas visualization showing what went wrong (e.g., a diagram of variable state at the point of failure)
- A corrected code version
- Follow-up suggestions to deepen understanding

### 6.5 Typing Animation

When the tutor first presents code, it appears character by character in the Monaco editor with a typing animation, synchronized to the avatar's narration. This mimics a human teacher writing on a board and gives the student time to follow along. After the animation completes, the editor becomes fully editable.

---

## 7. Technology Stack

| Component | Technology | Role |
|-----------|-----------|------|
| AI Brain | Claude API | Central orchestrator: generates structured teaching responses |
| 3D Avatar | Three.js / React Three Fiber | Renders and animates the 3D tutor character |
| Avatar Model | ReadyPlayerMe / GLTF | Provides the rigged 3D character asset |
| Voice | ElevenLabs / Web Speech API | Converts speech text to spoken audio |
| Lip Sync | Oculus Lipsync / Rhubarb | Maps audio to mouth shape morph targets |
| Canvas | Sandboxed iframe + SVG | Renders diagrams, animations, and visual content |
| Math | KaTeX | Renders LaTeX equations and mathematical notation |
| Charts | Chart.js / D3 | Renders data visualizations and interactive charts |
| Code Editor | Monaco Editor | Full IDE with syntax highlighting and autocomplete |
| Code Execution | Pyodide / iframe / Judge0 | Runs student code safely in the browser or via API |
| Frontend | React + Tailwind CSS | Application shell and component framework |
| State | Zustand / React Context | Manages conversation history, canvas state, and editor state |

---

## 8. Implementation Roadmap

### Phase 1 — MVP (Weeks 1–4)

- Claude API integration with structured JSON responses
- Basic canvas rendering: SVG diagrams and HTML content in sandboxed iframe
- 2D avatar fallback (Lottie/SVG) with emotion-driven animation switching
- Browser SpeechSynthesis for text-to-speech
- Text-based input with follow-up suggestion buttons
- Basic conversation history and context passing

### Phase 2 — IDE Integration (Weeks 5–8)

- Monaco Editor integration with syntax highlighting
- JavaScript execution in sandboxed iframe with live preview
- Python execution via Pyodide WebAssembly runtime
- AI-assisted coding loop: error context sent back to Claude
- Split-pane and full-code canvas modes
- Code typing animation synchronized with avatar narration

### Phase 3 — 3D Avatar (Weeks 9–12)

- Three.js / React Three Fiber avatar rendering
- ReadyPlayerMe or custom GLTF model integration
- Five animation states: idle, explaining, thinking, encouraging, correcting
- ElevenLabs TTS integration for natural voice
- Lip sync via Oculus Lipsync or Rhubarb viseme mapping
- Avatar gesture pointing toward canvas elements

### Phase 4 — Polish & Scale (Weeks 13–16)

- Interactive click-to-ask on canvas elements
- Step sequencing with smooth transitions and accumulation
- KaTeX equation rendering and Chart.js/D3 data visualization
- Progressive SVG drawing animations
- Performance optimization and responsive design
- Deployment and user testing

---

## 9. Core Innovation

Traditional AI tutors are text-based chatbots. This system transforms a single AI response into a multi-modal interactive experience where three systems work in concert:

- **The avatar explains** — verbally, with emotion and gesture
- **The canvas visualizes** — with synchronized step-by-step rendering
- **The IDE enables practice** — with hands-on coding and intelligent error feedback

The key architectural insight is that all three systems are driven by a single structured response from Claude. There is no separate "diagram AI" or "code AI" or "speech AI" — one orchestrator produces everything the interface needs in one call. This ensures perfect synchronization between what the student hears, sees, and can interact with.

The result is a learning experience that is visual, interactive, context-aware, and adaptive — closer to having a human tutor at a whiteboard than anything a chatbot can offer.

---

## 10. Example Scenarios

### Scenario A: "Explain how quicksort works"

1. Claude sets `canvas_mode: "split"`
2. **Step 1 (diagram):** SVG showing an unsorted array → avatar says "Let's start with an unsorted array"
3. **Step 2 (animation):** Pivot selection highlighted, partitioning animated → avatar says "We pick a pivot and partition around it"
4. **Step 3 (code):** Python quicksort implementation loads in IDE → avatar says "Here's the recursive implementation"
5. **Student clicks the pivot element** → Claude explains pivot selection strategies
6. **Student edits the code** to use a different pivot → runs it → Claude validates and explains the tradeoff

### Scenario B: "What is TCP/IP?"

1. Claude sets `canvas_mode: "whiteboard"`
2. **Step 1 (diagram):** 4-layer TCP/IP stack SVG → avatar explains each layer
3. **Step 2 (animation):** Data packet traveling through layers with encapsulation → avatar narrates the journey
4. **Step 3 (diagram):** Three-way handshake sequence diagram → avatar walks through SYN, SYN-ACK, ACK
5. **Student clicks the "Transport Layer"** → Claude dives deeper into TCP vs UDP

### Scenario C: "Help me debug this Python code"

1. Student pastes code into the IDE
2. Claude sets `canvas_mode: "code"`
3. **Step 1 (code):** Claude highlights the buggy line in the editor
4. **Step 2 (diagram):** Variable state diagram showing values at each iteration → avatar explains where logic fails
5. **Step 3 (code):** Corrected version appears with diff highlighting → avatar explains the fix
6. **Follow-ups:** "What if the input is empty?", "Can you add error handling?", "What are edge cases?"

---

*End of specification.*