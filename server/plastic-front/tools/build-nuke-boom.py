"""Render the original tactical-nuke impact to a small, deterministic PCM sample."""

from pathlib import Path
import wave

import numpy as np

RATE, LENGTH = 24000, 2.7
RANDOM = np.random.default_rng(3127)
TIME = np.arange(round(RATE * LENGTH)) / RATE
FREQ = np.fft.rfftfreq(len(TIME), 1 / RATE)


def band_noise(low, high):
    frequencies = np.fft.rfft(RANDOM.normal(size=len(TIME)))
    rolloff = (FREQ / (FREQ + low)) ** 2 / (1 + (FREQ / high) ** 6)
    signal = np.fft.irfft(frequencies * rolloff, len(TIME))
    return np.tanh(signal / signal.std() * .65)


def envelope(delay, rise, decay):
    age = np.maximum(0, TIME - delay)
    return (1 - np.exp(-age / rise)) ** 2 * np.exp(-age / decay)


def descending_resonance(high, low, fall, delay, decay):
    age = np.maximum(0, TIME - delay)
    phase = 2 * np.pi * (low * age + (high - low) * fall * (1 - np.exp(-age / fall)))
    return np.sin(phase) * envelope(delay, .012, decay)


body = (.69 * descending_resonance(105, 49, .16, 0, .30)
        + .25 * descending_resonance(181, 76, .12, .008, .27)
        + .16 * descending_resonance(248, 109, .09, .015, .24))
pressure = band_noise(100, 465) * envelope(0, .009, .32) * .55
air = band_noise(260, 900) * envelope(.013, .020, .20) * .17
rumble = band_noise(48, 235) * (
    .24 * envelope(.09, .04, .54)
    + .15 * envelope(.30, .065, .54)
    + .12 * envelope(.62, .08, .45)
)
boom = np.tanh((body + pressure + air + rumble) * 1.30)
boom *= np.minimum(1, np.maximum(0, (LENGTH - TIME) / .29)) ** 2
pcm = np.round(boom * (29000 / np.max(np.abs(boom)))).astype("<i2")
file = Path(__file__).resolve().parents[1] / "public/assets/sfx/radio-nuke-boom.wav"
with wave.open(str(file), "wb") as output:
    output.setparams((1, 2, RATE, len(pcm), "NONE", "not compressed"))
    output.writeframes(pcm.tobytes())
