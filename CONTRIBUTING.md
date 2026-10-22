# Contributing to NEURON SIM LAB

Thank you for your interest in contributing to **NEURON SIM LAB**! This guide outlines our design principles, technical standards, development workflows, and contribution guidelines.

---

## 1. Core Design Philosophy & Aesthetic Standards

**NEURON SIM LAB** adheres to a strict **industrial brutalist, monochrome aesthetic**. All contributions modifying the user interface or visualization must preserve these standards:

### 1.1 Non-AI Slop Aesthetic
- **Zero Gradients & Blurs**: Do not use colorful gradients, rainbow accents, drop shadows, or frosted glass (`backdrop-filter: blur()`).
- **Zero Border Radius**: All interactive elements, containers, and dialogs must maintain sharp, square corners (`border-radius: 0 !important;`).
- **1px High-Contrast Borders**: Structural framing relies on clean `1px solid #ffffff` or `1px solid #333333` borders.
- **Monochrome Color Palette**:
  - Backgrounds: `#000000`, `#0a0a0a`, `#111111`
  - Borders: `#222222`, `#333333`, `#ffffff`
  - Foreground Text: `#ffffff`, `#e0e0e0`, `#888888`
  - Accent / Signal: Green (`#00e676`), Yellow (`#ffd600`), Red (`#ff1744`) reserved strictly for traffic light signals.

### 1.2 Zero Emojis Policy
- **Never insert Unicode emojis** (e.g. `🎯`, `▲`, `🚗`, `⚡`, `🧠`, `⏱️`) into HTML, CSS, JavaScript, Canvas rendering, or UI buttons.
- All iconography must be rendered using **pure SVG vector paths** or **mathematical HTML5 Canvas line routines** (e.g., target crosshairs, navigation chevrons, close symbols).

### 1.3 Clean Interface Grammar
- Do not use pseudo-futuristic decorative slashes (e.g., `// SPEED`, `// RUNNING`, `// DESTINATION`) in user-facing labels.
- Use clean, upper-case monospace titles (e.g., `SPEED: 1X`, `POPULATION: 40`, `GENERATION 5`).

---

## 2. Development Setup

### 2.1 Prerequisites
- Python 3.9+
- Modern Web Browser (Chrome, Chromium, Firefox, Edge, Safari)
- Git

### 2.2 Local Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-username/neuron.git
cd neuron

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 2.3 Running the Development Server
```bash
python run.py
```
This starts the backend on `http://127.0.0.1:5000` and automatically launches your web browser.

---

## 3. Project Architecture & Code Organization

```
neuron/
├── app.py                     # Flask server, WebSocket handler, REST persistence endpoints
├── run.py                     # Application launcher
├── requirements.txt           # Python dependency declarations
├── README.md                  # Project overview and mathematical summary
├── ARCHITECTURE.md            # In-depth architectural blueprint
├── CONTRIBUTING.md            # Developer guidelines and coding standards
├── engine/                    # Python Autonomous Driving & AI Engine
│   ├── car.py                 # Kinematic Bicycle Model, vehicle dynamics, LiDAR evaluation
│   ├── city_map.py            # 1200x1200 city grid, buildings, traffic lights, waypoints
│   ├── geometry.py            # 2D collision mathematics & AABB intersection functions
│   ├── map_presets.py         # Track geometry presets
│   ├── neural_network.py      # Multi-layer neural network (feedforward, tanh, mutation)
│   ├── sensor.py              # 7-beam LiDAR raycaster with AABB spatial pruning
│   └── simulation.py          # Genetic neuroevolution supervisor & state serialization
├── saved_models/              # Storage for exported neural network weights (.json)
├── static/
│   ├── favicon.svg            # Tactical monochrome vector favicon
│   ├── css/style.css          # Industrial brutalist stylesheet
│   └── js/
│       ├── audio.js           # Web Audio API cues
│       ├── main.js            # 60 FPS animation loop, WebSocket bridge, UI event handlers
│       ├── map.js             # Canvas drawing routines (roads, buildings, traffic lights)
│       └── visualizer.js      # Neural network synapse weight & activation visualizer
└── templates/
    └── index.html             # Application layout & structural containers
```

---

## 4. Coding Guidelines

### 4.1 Python Standards (`engine/`, `app.py`)
- Adhere to **PEP 8** style guidelines.
- **Type Annotations**: Use Python typing where appropriate (`List`, `Dict`, `Tuple`, `Optional`).
- **Computational Efficiency**: The simulation engine executes at 160+ FPS in real time. Avoid redundant heap allocations or deep object copying inside `step()` or `update()` loops.
- **Thread Safety**: Any mutation of the active `SimulationEngine` instance shared between the background thread and Flask request handlers must be synchronized via `threading.Lock`.

### 4.2 Frontend JavaScript (`static/js/`)
- Write modern, idiomatic **ES6+** vanilla JavaScript (no external runtime frameworks or heavy libraries).
- Keep the `requestAnimationFrame` render loop in `main.js` decoupled from network frame arrival to guarantee 60 FPS smooth camera panning and zooming.
- Use cache-busting query strings (e.g., `main.js?v=3.2`) when modifying client scripts to prevent aggressive browser caching during testing.

### 4.3 Styling (`static/css/style.css`)
- Maintain square elements (`border-radius: 0`).
- Use monospace font stacks: `'JetBrains Mono', 'Consolas', 'Courier New', monospace`.
- Keep button interactions tactile: subtle inversion on hover (`background: #ffffff; color: #000000;`) and crisp active states.

---

## 5. Adding New Features

### 5.1 Adding a New Map or Obstacle Preset
1. In `engine/map_presets.py`, define the new track dictionary containing `name`, `borders`, `obstacles`, `start_pos`, `start_angle`, and `destination`.
2. Ensure obstacles are defined as clockwise-oriented coordinate pairs:
   ```python
   {"x": 200, "y": 300, "width": 80, "height": 80}
   ```
3. Verify that all collision segments are added to the spatial collision array to enable AABB pruning.

### 5.2 Adjusting Neural Network Parameters
- To modify network topology, edit the layer configuration in `engine/neural_network.py` and synchronize input sensor indices in `engine/car.py` and `static/js/visualizer.js`.
- Always verify that the input vector size matches the sensor output count.

---

## 6. Testing & Quality Verification

Before submitting a pull request, run the following verification checks:

1. **Syntax & Import Validation**:
   ```bash
   python -c "import app, engine.simulation, engine.car; print('Core imports successful')"
   ```
2. **Simulation Throughput Benchmark**:
   ```bash
   python -c "import time, engine.simulation; sim = engine.simulation.SimulationEngine(); t0 = time.time(); [sim.step() for _ in range(500)]; print(f'Engine FPS: {500 / (time.time() - t0):.1f}')"
   ```
   *Expected result: > 120 FPS.*
3. **Browser Interface Check**:
   - Open `http://127.0.0.1:5000`.
   - Verify start/pause button synchronization.
   - Verify Speed/Population modal opens and applies values correctly.
   - Confirm zero visual emoji artifacts or slashes appear in UI elements.
   - Verify camera pan (drag) and zoom (scroll) function smoothly.

---

## 7. Submitting Changes

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feature/improved-obstacle-avoidance
   ```
2. Commit your changes with clear, concise messages:
   ```bash
   git commit -m "Optimize LiDAR ray-box intersection check"
   ```
3. Push to your fork and submit a Pull Request describing your changes, motivation, and verification steps.
