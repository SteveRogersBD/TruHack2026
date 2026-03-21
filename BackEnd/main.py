from pathlib import Path

from agent_state import AgentStateStore, SessionManager, Role


def main() -> None:
    state_file = Path(__file__).with_suffix(".state.json")
    store = AgentStateStore(state_file)
    manager = SessionManager(store)

    agent_state = manager.resume()
    if not agent_state:
        agent_state = manager.start_session(user_id="learner-1", role=Role.LEARNER)

    # Keep context fresh and persist between runs.
    manager.persist()

    print("Agent session ready")
    print(f"Session: {agent_state.session_metadata.session_id}")
    print(f"Authenticated user: {agent_state.auth_state.user_id} ({agent_state.auth_state.role.value})")


if __name__ == "__main__":
    main()
