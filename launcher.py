"""Native desktop launcher for Tarkov Field Guide.

The HTML application is rendered by the operating system's WebView.  PyInstaller
sets ``sys._MEIPASS`` when running the one-file Windows build, so the same code
works both from source and from the generated executable.
"""

from __future__ import annotations

import sys
from pathlib import Path

import webview


def asset_path(filename: str) -> Path:
    """Return an absolute path to an application asset."""
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return root / filename


def main() -> None:
    index = asset_path("index.html")
    if not index.is_file():
        raise FileNotFoundError(f"Не найден интерфейс приложения: {index}")

    webview.create_window(
        "Tarkov Field Guide",
        index.as_uri(),
        width=1280,
        height=820,
        min_size=(860, 620),
        background_color="#0c0f0d",
        text_select=False,
    )
    webview.start(debug=False)


if __name__ == "__main__":
    main()
