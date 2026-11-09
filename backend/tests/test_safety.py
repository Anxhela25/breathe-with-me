import pytest

from app.services.safety import SafetyLevel, check_message

CRISIS = [
    "I want to die",
    "i wanna die",
    "I can't go on",
    "I can’t go on anymore",
    "i cant go on",
    "I cannot go on",
    "I want to kill myself",
    "thinking about suicide",
    "I want to hurt myself",
    "I don't want to live anymore",
    "I just want to end it all",
    "self-harm",
    "I WANT TO DIE!!!",
]

MEDICAL_WORRY = [
    "I will faint", "is this a heart attack", "I'm going to pass out", "my chest hurts",
    "I have chest pain", "there is pressure in my chest",
    # physical symptom wins
    "I'm going to die, my chest hurts",
]

FEAR_OF_DYING = [
    "I think I'm dying", "I don't want to die", "i dont want to die", "I do not want to die",
    "please I dont wanna die", "I'm scared, I don't want to die", "I think I'm going to die",
    "I'm gonna die", "am I going to die", "I'm scared of dying", "I'm afraid I will die",
]


@pytest.mark.parametrize("text", FEAR_OF_DYING)
def test_fear_of_dying_is_not_a_crisis(text):
    assert check_message(text).level is SafetyLevel.fear_of_dying


# crisis still wins when both appear
STILL_CRISIS = [
    "I don't want to die but I can't go on",
    "I don't want to die, I want to kill myself",
    "i dont want to die but i dont want to live anymore",
    "I don't know, I want to die",
]


@pytest.mark.parametrize("text", STILL_CRISIS)
def test_crisis_wins_over_fear_of_dying(text):
    assert check_message(text).level is SafetyLevel.crisis

OK = ["my heart is fast", "I can't breathe", "my boss called me", "I'm alone", "asdfgh", "", "should I take a pill?"]


@pytest.mark.parametrize("text", CRISIS)
def test_crisis_is_always_caught(text):
    assert check_message(text).level is SafetyLevel.crisis


@pytest.mark.parametrize("text", MEDICAL_WORRY)
def test_medical_worry_gets_emergency_note(text):
    assert check_message(text).level is SafetyLevel.medical_worry


@pytest.mark.parametrize("text", OK)
def test_normal_messages_continue(text):
    assert check_message(text).level is SafetyLevel.ok
