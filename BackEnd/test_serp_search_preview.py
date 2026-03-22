from server import _search_media_preview


def _assert_preview(preview, expected_kind: str):
    assert preview is not None
    structured, meta = preview
    assert structured.speech
    assert meta["search_results"]["kind"] == expected_kind
    assert meta["search_results"]["items"]


def test_image_preview_uses_multiple_results():
    preview = _search_media_preview("find me images of binary trees")
    _assert_preview(preview, "image")


def test_video_preview_uses_multiple_results():
    preview = _search_media_preview("find me a video on introductory calculus")
    _assert_preview(preview, "video")


def test_paper_preview_uses_multiple_results():
    preview = _search_media_preview("find me research papers on transformer interpretability")
    _assert_preview(preview, "paper")
