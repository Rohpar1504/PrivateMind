"""Unit tests for SM-2 algorithm and review endpoints."""

from datetime import date, timedelta

from app.sm2 import EASE_MIN, apply_sm2

# ── SM-2 algorithm unit tests ──────────────────────────────────────────────────

def test_first_easy_gives_interval_1():
    result = apply_sm2(ease_factor=2.5, interval_days=1, repetitions=0, rating="easy")
    assert result.interval_days == 1
    assert result.repetitions == 1
    assert result.ease_factor > 2.5  # easy raises ease factor


def test_second_easy_gives_interval_6():
    result = apply_sm2(ease_factor=2.5, interval_days=1, repetitions=1, rating="easy")
    assert result.interval_days == 6
    assert result.repetitions == 2


def test_third_easy_multiplies_interval():
    result = apply_sm2(ease_factor=2.5, interval_days=6, repetitions=2, rating="easy")
    assert result.interval_days == round(6 * 2.5)
    assert result.repetitions == 3


def test_hard_resets_to_interval_1():
    result = apply_sm2(ease_factor=2.5, interval_days=6, repetitions=2, rating="hard")
    assert result.interval_days == 1
    assert result.repetitions == 0


def test_hard_lowers_ease_factor():
    result = apply_sm2(ease_factor=2.5, interval_days=1, repetitions=0, rating="hard")
    assert result.ease_factor < 2.5


def test_ease_factor_never_below_minimum():
    result = apply_sm2(ease_factor=EASE_MIN, interval_days=1, repetitions=0, rating="hard")
    assert result.ease_factor >= EASE_MIN


def test_next_review_date_is_today_plus_interval():
    result = apply_sm2(ease_factor=2.5, interval_days=1, repetitions=1, rating="easy")
    expected = date.today() + timedelta(days=result.interval_days)
    assert result.next_review_date == expected


# ── Review endpoint integration tests ─────────────────────────────────────────

def test_review_due_empty(client):
    resp = client.get("/review/due")
    assert resp.status_code == 200
    assert resp.json() == []


def test_review_stats(client):
    resp = client.get("/review/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "due" in data
    assert "reviewed_today" in data


def test_review_complete_not_found(client):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = client.post(f"/review/{fake_id}/complete", json={"rating": "easy"})
    assert resp.status_code == 404
