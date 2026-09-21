# TypeSafe JEV Color Guesser

An interactive web application that uses **TypeSafe AI's JEV model** (System One flagship model) to guess color probabilities for any given noun in real time.

![Reference UI](reference/Screenshot%20from%202026-09-21%2018-47-51.png)

## Overview

- **Model**: JEV (`jev-latest` / `jev-1.13.0`) via TypeSafe System One API (`https://api.typesafe.ai/v1/systemone`).
- **Primitive**: `choice` question with 16 discrete colors.
- **16 Color Palette**:
  - Red (`#d81605`)
  - Orange (`#f77501`)
  - Yellow (`#faca00`)
  - Green (`#049427`)
  - Blue (`#0075f7`)
  - Purple (`#7b18ae`)
  - Pink (`#fd81c8`)
  - Brown (`#974f00`)
  - Grey (`#949494`)
  - Black (`#111111`)
  - White (`#f5f5f5`)
  - Teal (`#03be9b`)
  - Beige (`#e4ddcc`)
  - Lavender (`#fab1fd`)
  - Navy (`#004456`)
  - Indigo (`#293dd3`)

## Features

- **Live Typing**: No need to press Enter; debounced real-time updates with request cancellation (`AbortController`).
- **Smooth Palette Animation**: Proportional stacked horizontal bar chart with CSS transitions that seamlessly slide, shrink, and expand segments when changing from one noun to another.
- **Minimalist Aesthetic**: Pixel-accurate implementation matching the reference screenshots.
- **Local Documentation**: Complete offline documentation from `https://docs.typesafe.ai/` downloaded in `./docs/` (indexed in `docs/INDEX.md`).

## How to Run

1. Ensure your API key is in `.env`:
   ```env
   API_KEY=your_typesafe_api_key
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Open your browser at:
   ```
   http://localhost:3000
   ```
