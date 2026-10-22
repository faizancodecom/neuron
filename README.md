# NEURON SIM LAB

> High-precision, industrial-grade autonomous driving neuroevolution simulator powered by a real-time Python AI neural network core and a sharp, tactile monochrome interface.

---

## 1. Overview

**NEURON SIM LAB** is an autonomous vehicle laboratory simulating continuous, real-time genetic neuroevolution. Instead of pre-trained models or scripted navigation paths, an evolving population of autonomous cars navigates a multi-lane urban city grid using raw LiDAR raycasts, Ackermann vehicle steering physics, and a custom multi-layer neural network running in Python.

The project features a **pure brutalist industrial aesthetic** (strict black-and-white theme, 1px high-contrast borders, zero emojis, tactile square buttons, and monospace typography).

---

## 2. Key Features

- **Genuine Real-Time Python Neuroevolution Core**:
  - Every car runs a 4-layer feedforward neural network (`12 Inputs -> 14 Hidden -> 10 Hidden -> 4 Outputs`) in Python.
  - True genetic algorithms execute in real time: elitism preservation, tournament selection, and configurable weight mutation.
  - Live terminal logs display real-time generational metrics, fitness progression, steering angles, and throttle activations.

- **Realistic Vehicle Dynamics & Ackermann Steering Kinematics**:
  - Implements the physical kinematic bicycle model with wheelbase geometry ($L = 28\text{px}$) and dynamic front wheel steering angles ($\pm 35^\circ$).
  - Front wheels physically rotate and turn in real time matching steering angle output from the neural net.
  - Realistic throttle acceleration, braking deceleration, tire friction, and rollback collision protection (vehicles physically cannot clip or jump through boundaries).

- **Straight Obstacle Course & Autonomous Goal-Seeking**:
  - Pure straight proving ground track ($600\text{px}$ wide, $1080\text{px}$ long) with straight dashed centerline and outer containment walls.
  - 5 staggered horizontal wall barriers creating sequential navigation gates.
  - The AI tries again and again across real-time neuroevolution generations to learn the optimal path around walls.
  - **Automatic Successful AI Persistence**: Once cars reach the finish line destination, the engine automatically saves the trained champion model as a "Successful AI" in `saved_models/`.
  - When all cars in the population reach the destination, it persists an "All-Reached" master brain.

- **Tactile Industrial Monochrome UI**:
  - 100% Non-AI Slop aesthetic: zero gradients, zero rounded corners (`border-radius: 0 !important`), 1px high-contrast borders.
  - Zero emojis: all icons are precision SVG vector graphics.
  - Unified Speed & Vehicle Population modal: select warp speeds ($0.5\times$ to $40\times$) and population size ($20$ to $100$ cars) in one clean interface.
  - Synchronized start/pause engine controls.
  - Floating compact neural network preview with expandable full-scale synapse inspector and generational fitness curve.

- **High-Performance Architecture (160+ FPS Engine)**:
  - Spatial AABB (Axis-Aligned Bounding Box) raycast pruning in `Sensor.update()` skips ~85% of redundant intersection math.
  - Brain matrix serialization caching minimizes JSON payload overhead by ~90%.
  - 60 FPS independent client-side animation loop ensures buttery-smooth camera panning and zoom without UI freezing.

---

## 3. System Architecture & Tech Stack

```
+-------------------------------------------------------------+
|                      HTML5 / Canvas UI                      |
|  - Independent 60 FPS requestAnimationFrame render loop    |
|  - Interactive pan & zoom camera system                     |
|  - Tactical vector crosshairs, wheels & stop lines          |
|  - JetBrains Mono typography & SVG iconography              |
+------------------------------+------------------------------+
                               ^
                       Bi-directional
                       WebSocket (/ws)
                               v
+-------------------------------------------------------------+
|                     Flask Backend Server                    |
|  - Background daemon simulation worker thread               |
|  - Live telemetry serialization (~40 FPS throttled stream)  |
|  - Anti-cache HTTP headers & REST persistence API           |
+------------------------------+------------------------------+
                               ^
                       Thread Lock Sync
                               v
+-------------------------------------------------------------+
|                   Python Simulation Engine                  |
|  - Kinematic Bicycle Model (Ackermann Steering, Wheelbase)  |
|  - 12-Input LiDAR Raycast Sensor (Spatial AABB Pruned)      |
|  - NeuralNetwork (12 -> 14 -> 10 -> 4, Hyperbolic Tangent)  |
|  - Genetic Evolution Supervisor (Elitism, Mutation)         |
|  - Traffic Signal State Machine (NS/EW 12s Cycle)           |
+-------------------------------------------------------------+
```

### Technologies Used:
- **Backend**: Python 3.9+, Flask, Flask-Sock (`flask-sock>=0.7.0`), `simple-websocket`
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, CSS3 Modern Flexbox/Grid
- **Typography**: JetBrains Mono, Inter

---

## 4. Mathematical Specifications

### 4.1 Kinematic Bicycle Model (Vehicle Physics)
The car's position $(x, y)$ and heading angle $\theta$ update according to:

$$\Delta \theta = \left(\frac{v}{L}\right) \cdot \tan(\delta) \cdot \Delta t$$

$$x_{t+1} = x_t + v \cdot \sin(\theta) \cdot \Delta t$$

$$y_{t+1} = y_t - v \cdot \cos(\theta) \cdot \Delta t$$

Where:
- $v$ = vehicle velocity
- $L$ = vehicle wheelbase ($28\text{px}$)
- $\delta$ = front wheel steering angle clamped to $\pm 35^\circ$ ($\pm 0.6108\text{ rad}$)
- $\Delta t$ = simulation step time

### 4.2 Neural Network Architecture
Each car processes 12 normalized inputs into 4 control outputs:

```
[INPUT VECTORS (12)]
  0-6: 7 LiDAR Sensor Raycasts (0.0 = clear, 1.0 = impact)
    7: Normalized speed (-1.0 to 1.0)
    8: Normalized steering angle (-1.0 to 1.0)
    9: Heading error angle to target / active waypoint (-PI to +PI normalized)
   10: Normalized distance to target
   11: Approaching red traffic light signal proximity (0.0 = clear, 1.0 = stop line)

           │ (12 x 14 weight matrix + biases)
           ▼
[HIDDEN LAYER 1 (14 Neurons)]  ── Activation: tanh(x)
           │ (14 x 10 weight matrix + biases)
           ▼
[HIDDEN LAYER 2 (10 Neurons)]  ── Activation: tanh(x)
           │ (10 x 4 weight matrix + biases)
           ▼
[OUTPUT CONTROLS (4)]
  Out 0: Forward Throttle (Threshold > 0.05)
  Out 1: Reverse / Brake (Threshold > 0.20)
  Out 2: Steer Left     (Threshold > 0.15)
  Out 3: Steer Right    (Threshold > 0.15)
```

### 4.3 Fitness Function
Fitness evaluates route progress, speed compliance, traffic obedience, and destination arrival:

$$\text{Fitness} = (\text{Progress}_{\max} \cdot 2.5) + (N_{\text{waypoints}} \cdot 500) + (\text{Lifetime} \cdot 0.12) + \text{Bonus}_{\text{destination}} - \text{Penalty}_{\text{red\_light}} - \text{Penalty}_{\text{crash}}$$

Where:
- $\text{Progress}_{\max}$ = maximum forward distance closed toward target
- $N_{\text{waypoints}}$ = route intersections successfully cleared
- $\text{Bonus}_{\text{destination}} = 4000 + \max(0, (1400 - \text{Lifetime}) \cdot 2.5)$ upon reaching the destination pad
- $\text{Penalty}_{\text{crash}}$ = $28\%$ fitness reduction upon wall impact

---

## 5. Installation & Quickstart

### Prerequisites
- Python 3.9 or higher
- Modern web browser (Chrome, Edge, Firefox, Brave)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/neuron.git
cd neuron
```

### 2. Create Virtual Environment (Recommended)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python run.py
```
`run.py` launches the Flask server on `http://127.0.0.1:5000` and automatically opens your default browser.

---

## 6. Controls & Usage

| Action | Control | Description |
| :--- | :--- | :--- |
| **Run / Pause** | Header `[ START ]` / `[ PAUSE ]` | Toggles live simulation execution |
| **Speed & Population** | Header `[ SPEED: 1X ]` | Opens modal to select warp speed ($0.5\times$ to $40\times$) and car count |
| **Save Brain** | Header `[ SAVE BRAIN ]` | Persists champion neural network weights to local server JSON |
| **Load Brain** | Header `[ LOAD ]` | Loads saved brain models or imports/exports JSON model files |
| **Reset** | Header `[ RESET ]` | Resets simulation to Generation 1 |
| **Pan Camera** | Click & Drag on Canvas | Moves coordinate viewport freely |
| **Zoom Camera** | Mouse Scroll Wheel | Zooms camera between $0.4\times$ and $2.5\times$ |
| **Focus Champion** | Double-Click on Canvas | Re-locks camera to champion vehicle |
| **Expand Brain** | Click `[ EXPAND ]` on mini map | Opens live synapse weights and generational fitness chart |
| **Close Modals** | Click `[ × ]`, `CANCEL`, or press `Escape` | Closes active dialog |

---

## 7. Project Structure

```
neuron/
├── app.py                     # Flask web server, WebSocket /ws stream, REST API routes
├── run.py                     # Quickstart launcher with automatic browser opening
├── requirements.txt           # Python dependency specifications
├── README.md                  # Comprehensive project documentation
├── ARCHITECTURE.md            # Deep dive architectural documentation
├── engine/                    # Pure Python simulation & AI neural engine
│   ├── __init__.py            # Engine package exports
│   ├── car.py                 # Vehicle kinematics, Ackermann steering, inputs & fitness
│   ├── city_map.py            # 1200x1200 city grid, 9 buildings, traffic lights, waypoints
│   ├── geometry.py            # 2D collision mathematics, segment intersection, AABB checks
│   ├── map_presets.py         # Track presets (City Grid, Boulevard, Chicane, Maze, Plaza)
│   ├── neural_network.py      # Multi-layer neural network (weights, biases, tanh, mutation)
│   ├── sensor.py              # 7-ray LiDAR sensor with spatial bounding-box pruning
│   └── simulation.py          # Supervisor engine, genetic evolution, state serialization
├── saved_models/              # Local server storage for saved brain weights (JSON)
├── saved_maps/                # User-saved custom courses
├── static/
│   ├── favicon.svg            # Custom tactical vector browser favicon
│   ├── css/
│   │   └── style.css          # Industrial brutalist monochrome stylesheet
│   └── js/
│       ├── audio.js           # Synthesized Web Audio API cues
│       ├── car.js             # Client vehicle physics model
│       ├── genetic_algo.js    # Client-side genetic supervisor
│       ├── main.js            # 60 FPS animation loop, WebSocket bridge, event handling
│       ├── map.js             # Canvas drawing for roads, buildings, signals, target
│       ├── neural_network.js  # Client neural network evaluator
│       ├── sensor.js          # Client LiDAR raycaster
│       └── visualizer.js      # Synapse activation & fitness progression chart renderer
└── templates/
    └── index.html             # High-precision monochrome application layout
```

---

## 8. License

This project is licensed under the MIT License - see the LICENSE file for details.
