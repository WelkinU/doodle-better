"""Weather service using Open-Meteo API (free, no API key required)."""

import time
from datetime import date, datetime

import httpx

from backend.config import config

# WMO Weather Codes → (label, emoji)
_WMO_CODES: dict[int, tuple[str, str]] = {
    0: ("Clear sky", "☀️"),
    1: ("Mainly clear", "🌤️"),
    2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"),
    45: ("Foggy", "🌫️"),
    48: ("Icy fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Drizzle", "🌦️"),
    55: ("Heavy drizzle", "🌦️"),
    56: ("Freezing drizzle", "🌧️"),
    57: ("Heavy freezing drizzle", "🌧️"),
    61: ("Light rain", "🌧️"),
    63: ("Rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    66: ("Freezing rain", "🌧️"),
    67: ("Heavy freezing rain", "🌧️"),
    71: ("Light snow", "🌨️"),
    73: ("Snow", "❄️"),
    75: ("Heavy snow", "❄️"),
    77: ("Snow grains", "❄️"),
    80: ("Light showers", "🌦️"),
    81: ("Showers", "🌧️"),
    82: ("Heavy showers", "🌧️"),
    85: ("Light snow showers", "🌨️"),
    86: ("Heavy snow showers", "❄️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with hail", "⛈️"),
    99: ("Heavy thunderstorm with hail", "⛈️"),
}

# Cache: {"YYYY-MM-DDTHH": (timestamp, weather_dict)}
_cache: dict[str, tuple[float, dict | None]] = {}


def _degrees_to_cardinal(degrees: float) -> str:
    """Convert wind direction in degrees to cardinal direction."""
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(degrees / 22.5) % 16
    return directions[idx]


def _wind_speed_unit_param() -> str:
    mapping = {"mph": "mph", "kmh": "kmh", "ms": "ms", "kn": "kn"}
    return mapping.get(config.weather_wind_speed_unit, "mph")


def _wind_speed_unit_label() -> str:
    mapping = {"mph": "mph", "kmh": "km/h", "ms": "m/s", "kn": "kn"}
    return mapping.get(config.weather_wind_speed_unit, "mph")


def _temp_unit_param() -> str:
    if config.weather_temperature_unit == "celsius":
        return "celsius"
    return "fahrenheit"


def _temp_unit_label() -> str:
    if config.weather_temperature_unit == "celsius":
        return "°C"
    return "°F"


def _cache_key(date_str: str, hour: int) -> str:
    """Cache key: YYYY-MM-DDTHH (e.g. '2026-06-02T12')."""
    return f"{date_str}T{hour:02d}"


def _is_cache_valid(key: str) -> bool:
    if key not in _cache:
        return False
    ts, _ = _cache[key]
    ttl_seconds = config.weather_cache_ttl_minutes * 60
    return (time.time() - ts) < ttl_seconds


def _fetch_hourly(date_hour_pairs: list[tuple[str, int]], forecast: bool) -> dict[str, dict | None]:
    """Fetch hourly weather from Open-Meteo for a set of (date, hour) pairs.

    Uses the forecast API when forecast=True, archive API otherwise.
    Returns a dict keyed by _cache_key(date, hour).
    """
    results: dict[str, dict | None] = {}
    if not date_hour_pairs:
        return results
    try:
        dates = [d for d, _ in date_hour_pairs]
        min_date = min(dates)
        max_date = max(dates)
        params = {
            "latitude": config.weather_latitude,
            "longitude": config.weather_longitude,
            "hourly": "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m",
            "temperature_unit": _temp_unit_param(),
            "wind_speed_unit": _wind_speed_unit_param(),
            "start_date": min_date,
            "end_date": max_date,
            "timezone": config.timezone,
        }
        url = (
            "https://api.open-meteo.com/v1/forecast"
            if forecast
            else "https://archive-api.open-meteo.com/v1/archive"
        )
        resp = httpx.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        hourly = data.get("hourly", {})
        # time entries look like "2026-06-02T12:00"
        time_list = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        codes = hourly.get("weather_code", [])
        winds = hourly.get("wind_speed_10m", [])
        wind_dirs = hourly.get("wind_direction_10m", [])

        # Build index: "YYYY-MM-DDTHH" → position
        time_index = {t[:13]: i for i, t in enumerate(time_list)}  # "2026-06-02T12"

        for d_str, hour in date_hour_pairs:
            key = _cache_key(d_str, hour)
            lookup = f"{d_str}T{hour:02d}"
            if lookup in time_index:
                i = time_index[lookup]
                results[key] = _build_weather_dict(temps[i], codes[i], winds[i], wind_dirs[i])
            else:
                results[key] = None
    except Exception:
        for d_str, hour in date_hour_pairs:
            results.setdefault(_cache_key(d_str, hour), None)
    return results


def _build_weather_dict(temp, code, wind_speed, wind_dir) -> dict | None:
    """Build a weather info dict from raw hourly API values."""
    if temp is None and code is None:
        return None

    condition_label, condition_icon = _WMO_CODES.get(code, ("Unknown", "❓")) if code is not None else ("Unknown", "❓")
    wind_direction_str = _degrees_to_cardinal(wind_dir) if wind_dir is not None else None

    return {
        "temperature": round(temp, 1) if temp is not None else None,
        "temperature_unit": _temp_unit_label(),
        "condition": condition_label,
        "condition_icon": condition_icon,
        "wind_speed": round(wind_speed, 1) if wind_speed is not None else None,
        "wind_speed_unit": _wind_speed_unit_label(),
        "wind_direction": wind_direction_str,
    }


def get_weather_for_polls(poll_datetimes: list[tuple[str, str]]) -> dict[str, dict | None]:
    """
    Get weather info for a list of (date, time) tuples where time is HH:MM.
    Returns a dict keyed by "YYYY-MM-DDTHH" → weather info dict (or None).
    Uses in-memory cache with configurable TTL.
    """
    if not config.weather_enabled:
        return {}

    today = date.today()

    # Deduplicate and parse into (date_str, hour) pairs
    unique_pairs: set[tuple[str, int]] = set()
    for d_str, t_str in poll_datetimes:
        try:
            date.fromisoformat(d_str)  # validate
            hour = int(t_str.split(":")[0])
            unique_pairs.add((d_str, hour))
        except (ValueError, IndexError):
            pass

    # Check cache, separate into hits and misses
    to_fetch_forecast: list[tuple[str, int]] = []
    to_fetch_historical: list[tuple[str, int]] = []
    out_of_range_keys: list[str] = []
    results: dict[str, dict | None] = {}

    for d_str, hour in unique_pairs:
        key = _cache_key(d_str, hour)
        if _is_cache_valid(key):
            _, weather = _cache[key]
            results[key] = weather
        else:
            d = date.fromisoformat(d_str)
            days_ahead = (d - today).days
            if days_ahead > 16:
                out_of_range_keys.append(key)
            elif d < today:
                to_fetch_historical.append((d_str, hour))
            else:
                to_fetch_forecast.append((d_str, hour))

    for key in out_of_range_keys:
        results[key] = None

    # Fetch missing
    now = time.time()

    if to_fetch_forecast:
        fetched = _fetch_hourly(to_fetch_forecast, forecast=True)
        for key, weather in fetched.items():
            _cache[key] = (now, weather)
            results[key] = weather

    if to_fetch_historical:
        fetched = _fetch_hourly(to_fetch_historical, forecast=False)
        for key, weather in fetched.items():
            _cache[key] = (now, weather)
            results[key] = weather

    return results
