from pathlib import Path

from agent_state import AgentStateStore, SessionManager, Role


def main() -> None:
    # Existing session/state bootstrap (kept)
    state_file = Path(__file__).with_suffix(".state.json")
    store = AgentStateStore(state_file)
    manager = SessionManager(store)

    agent_state = manager.resume()
    if not agent_state:
        agent_state = manager.start_session(user_id="learner-1", role=Role.LEARNER)

    # Keep context fresh and persist between runs.
    manager.persist()

    print("Agent session ready")
    print(f"Session: {agent_state.session_id}")
    print(f"Authenticated user: {agent_state.user_id} ({agent_state.role.value})")

    # Simple interactive loop to try the LangGraph agent.
    from langchain_core.messages import HumanMessage

    from agent import graph

    graph_state = {
        "messages": [],
        "next_agent": "tutor",
        "mode": getattr(agent_state, "mode", "general"),
        "resource_url": "",
        "topic": "General",
        "course": "General",
    }

    print("\nType a message to the agent. Type 'exit' to quit.\n")
    while True:
        user_text = input("You> ").strip()
        if not user_text:
            continue
        if user_text.lower() in {"exit", "quit"}:
            break

        graph_state["messages"].append(HumanMessage(content=user_text))
        graph_state = graph.invoke(graph_state)

        # The last message should be the assistant response.
        last = graph_state["messages"][-1]
        print(f"\nAgent> {getattr(last, 'content', str(last))}\n")


if __name__ == "__main__":
    main()
