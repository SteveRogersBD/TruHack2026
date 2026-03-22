from server import ChatMode, _normalize_structured_response


def test_video_request_backfills_canvas_action_when_model_omits_one():
    structured = _normalize_structured_response(
        mode=ChatMode.GENERAL,
        message="Find me a video on introductory calculus",
        speech="I've found a YouTube video that covers introductory calculus topics.",
        structured_data={
            "speech": "I've found a YouTube video that covers introductory calculus topics.",
            "emotion": "explaining",
            "canvas_mode": "whiteboard",
            "canvas_actions": [],
            "follow_up_suggestions": [],
        },
    )

    assert structured is not None
    assert structured["canvas_actions"], "Expected a synthesized video canvas action"
    assert structured["canvas_actions"][0]["type"] == "video"
    assert structured["canvas_actions"][0]["content"].startswith("http")


def test_existing_canvas_actions_are_preserved():
    structured = _normalize_structured_response(
        mode=ChatMode.GENERAL,
        message="Find me a video on introductory calculus",
        speech="Here is a video.",
        structured_data={
            "speech": "Here is a video.",
            "emotion": "explaining",
            "canvas_mode": "whiteboard",
            "canvas_actions": [
                {
                    "type": "video",
                    "content": "https://example.com/video.mp4",
                    "step": 1,
                    "narration": "Provided video",
                }
            ],
            "follow_up_suggestions": [],
        },
    )

    assert structured is not None
    assert len(structured["canvas_actions"]) == 1
    assert structured["canvas_actions"][0]["content"] == "https://example.com/video.mp4"
