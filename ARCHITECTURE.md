# NEURON SIM LAB — Architectural Specification & Engineering Blueprint

This document provides a comprehensive technical overview of the **NEURON SIM LAB** autonomous driving neuroevolution engine. It covers the core physics models, neural network mathematics, spatial perception optimizations, genetic evolution mechanics, environment state machines, and real-time client-server communication pipelines.

---

## 1. System Overview & Component Hierarchy

```
+-----------------------------------------------------------------------------------------+
|                                    BROWSER CLIENT                                       |
|                                                                                         |
|  +---------------------------+   +----------------------------+   +------------------+  |
|  |     60 FPS Render Loop    |   |     Camera Pan / Zoom      |   | Synapse Network  |  |
|  |  (HTML5 2D Canvas Engine) |   |  (Coordinate Transform)    |   | Visualizer (5Hz) |  |
|  +---------------------------+   +----------------------------+   +------------------+  |
|                                                ^                                        |
|                                                | JSON Telemetry Stream                  |
+------------------------------------------------|----------------------------------------+
                                                 |
                                     WebSocket Connection (/ws)
                                                 |
+------------------------------------------------|----------------------------------------+
|                                     FLASK BACKEND                                       |
|                                                                                         |
|  +---------------------------------------------+-------------------------------------+  |
|  | REST Endpoints (/api/save_brain, /api/load) | WebSocket Telemetry Dispatcher (40Hz)|  |
|  +---------------------------------------------+-------------------------------------+  |
|                                                ^                                        |
|                                         threading.Lock                                  |
|                                                v                                        |
|  +-----------------------------------------------------------------------------------+  |
|  |                      BACKGROUND SIMULATION WORKER THREAD                          |  |
|  |                                                                                   |  |
|  |   +-----------------------+   +-----------------------+   +--------------------+  |  |
|  |   |   SimulationEngine    |-->|   GeneticSupervisor   |-->| TrafficController |  |  |
|  |   +-----------------------+   +-----------------------+   +--------------------+  |  |
|  |               |                           |                           |           |  |
|  |               v                           v                           v           |  |
|  |   +-----------------------+   +-----------------------+   +--------------------+  |  |
|  |   | Car Kinematic Model   |   | Neural Network Core   |   | LiDAR Ray Sensor   |  |  |
|  |   | (Ackermann Steering)  |   | (12 -> 14 -> 10 -> 4) |   | (AABB Pruning)     |  |  |
|  |   +-----------------------+   +-----------------------+   +--------------------+  |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Vehicle Physics & Kinematic Model

Autonomous vehicles in **NEURON SIM LAB** are governed by a continuous-time physical **Kinematic Bicycle Model** rather than simplified point-particle physics.

### 2.1 Coordinate System & Geometry
- **Origin**: Canvas top-left $(0, 0)$.
- **Heading Angle ($\theta$)**: $0\text{ rad}$ corresponds to facing straight North (upwards, negative $y$). Positive angles rotate clockwise.
- **Vehicle Length ($L$)**: $28\text{ px}$ wheelbase ($36\text{ px}$ total chassis length).
- **Vehicle Width ($W$)**: $18\text{ px}$ chassis width.

### 2.2 Ackermann Kinematics
The steering dynamics adhere to Ackermann geometry through front wheel angular deflection $\delta$:

$$\frac{d\theta}{dt} = \left(\frac{v}{L}\right) \cdot \tan(\delta)$$

The Cartesian position $(x, y)$ propagates via numerical Euler integration:

$$x_{t+1} = x_t + v \cdot \sin(\theta) \cdot \Delta t$$

$$y_{t+1} = y_t - v \cdot \cos(\theta) \cdot \Delta t$$

$$\theta_{t+1} = \theta_t + \left(\frac{v}{L}\right) \cdot \tan(\delta) \cdot \Delta t$$

### 2.3 Steering Mechanics & Constraints
- **Max Steering Angle ($\delta_{\max}$)**: $\pm 35^\circ$ ($\approx \pm 0.610865\text{ rad}$).
- **Steering Rate**: Dynamic interpolation towards commanded steering angle:
  $$\delta_{t+1} = \delta_t + \text{clamp}(\delta_{\text{target}} - \delta_t, -\omega_{\max}\Delta t, \omega_{\max}\Delta t)$$
  where $\omega_{\max} = 4.2\text{ rad/s}$.
- **Centrifugal Velocity Attenuation**: As steering angle $|\delta|$ increases, maximum achievable forward velocity is dynamically constrained to prevent unrealistic cornering.

### 2.4 Longitudinal Acceleration & Drag
Velocity $v$ updates via acceleration $a$, rolling friction $\mu_{\text{roll}}$, and aerodynamic drag $C_d$:

$$v_{t+1} = v_t + \left(a - \mu_{\text{roll}} \cdot \text{sgn}(v_t) - C_d \cdot v_t |v_t|\right) \Delta t$$

- Max Forward Speed: $v_{\max} = 4.8\text{ px/frame}$
- Max Reverse Speed: $v_{\min} = -1.8\text{ px/frame}$
- Acceleration Constant: $a_{\text{fwd}} = 0.22\text{ px/frame}^2$
- Braking Constant: $a_{\text{brake}} = 0.38\text{ px/frame}^2$
- Rolling Friction: $\mu_{\text{roll}} = 0.05$

### 2.5 Oriented Bounding Box (OBB) Polygon Derivation
To perform exact obstacle and boundary collision checks, each vehicle's 4 vertices are computed dynamically from its center $(x, y)$, heading $\theta$, and dimensions:

$$\begin{aligned}
x_{\text{front\_left}}  &= x + \frac{W}{2}\cos(\theta) - \frac{L_{\text{total}}}{2}\sin(\theta) \\
y_{\text{front\_left}}  &= y + \frac{W}{2}\sin(\theta) + \frac{L_{\text{total}}}{2}\cos(\theta) \\
x_{\text{front\_right}} &= x - \frac{W}{2}\cos(\theta) - \frac{L_{\text{total}}}{2}\sin(\theta) \\
y_{\text{front\_right}} &= y - \frac{W}{2}\sin(\theta) + \frac{L_{\text{total}}}{2}\cos(\theta) \\
x_{\text{rear\_right}}  &= x - \frac{W}{2}\cos(\theta) + \frac{L_{\text{total}}}{2}\sin(\theta) \\
y_{\text{rear\_right}}  &= y - \frac{W}{2}\sin(\theta) - \frac{L_{\text{total}}}{2}\cos(\theta) \\
x_{\text{rear\_left}}   &= x + \frac{W}{2}\cos(\theta) + \frac{L_{\text{total}}}{2}\sin(\theta) \\
y_{\text{rear\_left}}   &= y + \frac{W}{2}\sin(\theta) - \frac{L_{\text{total}}}{2}\cos(\theta)
\end{aligned}$$

---

## 3. Sensory Perception & Spatial Raycasting

Each vehicle perceives its surrounding environment through a simulated 7-beam **LiDAR (Light Detection and Ranging)** array coupled with high-level environmental telemetry.

### 3.1 LiDAR Ray Configuration
The 7 LiDAR rays span a $150^\circ$ forward arc:

| Ray Index | Relative Angle Offset | Sensing Range | Target Perception |
| :---: | :---: | :---: | :--- |
| `0` | $-75^\circ$ ($-1.309\text{ rad}$) | $180\text{ px}$ | Left Peripheral / Curb |
| `1` | $-45^\circ$ ($-0.785\text{ rad}$) | $180\text{ px}$ | Left Quarter / Diagonal Obstacles |
| `2` | $-20^\circ$ ($-0.349\text{ rad}$) | $220\text{ px}$ | Left Forward Approach |
| `3` | $0^\circ$ ($0.000\text{ rad}$) | $240\text{ px}$ | Direct Center Distance |
| `4` | $+20^\circ$ ($+0.349\text{ rad}$) | $220\text{ px}$ | Right Forward Approach |
| `5` | $+45^\circ$ ($+0.785\text{ rad}$) | $180\text{ px}$ | Right Quarter / Diagonal Obstacles |
| `6` | $+75^\circ$ ($+1.309\text{ rad}$) | $180\text{ px}$ | Right Peripheral / Curb |

### 3.2 High-Performance Spatial AABB Pruning
In a city with 9 buildings (36 wall segments) and outer borders (4 segments), computing ray-segment intersections for $N = 40$ cars with 7 rays results in:

$$\text{Intersections} = 40 \text{ cars} \times 7 \text{ rays} \times 40 \text{ segments} = 11,200 \text{ tests/frame}$$

To achieve **160+ FPS in Python**, `engine/sensor.py` utilizes **Axis-Aligned Bounding Box (AABB)** pruning:
1. Each ray defines an AABB: $[\min(x_1, x_2), \max(x_1, x_2)] \times [\min(y_1, y_2), \max(y_1, y_2)]$.
2. Each track segment possesses a precomputed AABB expanded by an $\epsilon = 2\text{px}$ tolerance.
3. The expensive parametric line intersection determinant is only evaluated if the ray AABB overlaps the segment AABB:
   $$\text{overlap} = (x_{1,\max}^{\text{ray}} \ge x_{2,\min}^{\text{seg}}) \land (x_{1,\min}^{\text{ray}} \le x_{2,\max}^{\text{seg}}) \land (y_{1,\max}^{\text{ray}} \ge y_{2,\min}^{\text{seg}}) \land (y_{1,\min}^{\text{ray}} \le y_{2,\max}^{\text{seg}})$$
This prunes over **85%** of segment evaluations per frame.

### 3.3 Parametric Ray-Segment Intersection
For overlapping candidate segments $P_1P_2$ and ray $P_3P_4$, the exact intersection point $(x^*, y^*)$ and normalized distance $t$ are derived via 2D cross-product determinants:

$$t = \frac{(x_1 - x_3)(y_3 - y_4) - (y_1 - y_3)(x_3 - x_4)}{(x_1 - x_2)(y_3 - y_4) - (y_1 - y_2)(x_3 - x_4)}$$

$$u = \frac{(x_1 - x_3)(y_1 - y_2) - (y_1 - y_3)(x_1 - x_2)}{(x_1 - x_2)(y_3 - y_4) - (y_1 - y_2)(x_3 - x_4)}$$

An intersection occurs if and only if $0 \le t \le 1$ and $0 \le u \le 1$. The sensor reading is normalized to $[0.0, 1.0]$:

$$\text{Reading} = 1.0 - \min(u_1, u_2, \dots, 1.0)$$

where $1.0$ represents imminent collision and $0.0$ represents a clear line of sight.

---

## 4. Deep Neural Network Architecture

Every individual car operates an independent, fully connected feedforward Artificial Neural Network (ANN) instantiated in `engine/neural_network.py`.

```
                    INPUT LAYER (12)
   ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
   │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │ 10│ 11│
   └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
     \   \   \   \   \   |   /   /   /   /   /   /
      \   \   \   \   \  |  /   /   /   /   /   /   (Weights W1: 12 x 14)
       ▼   ▼   ▼   ▼   ▼ v ▼   ▼   ▼   ▼   ▼   ▼
               HIDDEN LAYER 1 (14 Neurons, tanh)
                     │ │ │ │ │ │ │ │ │ │
                     │ │ │ │ │ │ │ │ │ │        (Weights W2: 14 x 10)
                     ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼
               HIDDEN LAYER 2 (10 Neurons, tanh)
                       \   \   /   /
                        \   \ /   /             (Weights W3: 10 x 4)
                         ▼   v   ▼
                   OUTPUT LAYER (4 Neurons)
                   ┌─────┬─────┬─────┬─────┐
                   │ THR │ BRK │ STL │ STR │
                   └─────┴─────┴─────┴─────┘
```

### 4.1 Input Vector Specifications
The input vector $\mathbf{x} \in \mathbb{R}^{12}$ is continuously normalized to $[-1.0, 1.0]$:

| Index | Name | Range | Description |
| :---: | :--- | :---: | :--- |
| `0-6` | LiDAR Beams 0 to 6 | $[0.0, 1.0]$ | Proximity to obstacles ($1.0 = \text{impact}$, $0.0 = \text{clear}$) |
| `7` | Current Speed | $[-1.0, 1.0]$ | Ratio $v / v_{\max}$ |
| `8` | Steering Angle | $[-1.0, 1.0]$ | Ratio $\delta / \delta_{\max}$ |
| `9` | Heading Error to Target | $[-1.0, 1.0]$ | $\Delta \theta = (\theta_{\text{target}} - \theta) / \pi$ wrapped to $[-\pi, \pi]$ |
| `10` | Distance to Target | $[0.0, 1.0]$ | Normalized Euclidean distance $\min(1.0, d / 1200)$ |
| `11` | Red Light Proximity | $[0.0, 1.0]$ | Proximity to active red light in lane ($1.0 = \text{stop line}$, $0.0 = \text{none}$) |

### 4.2 Activation Function & Layer Mathematics
All hidden and output neurons utilize the continuous Hyperbolic Tangent ($\tanh$) activation function:

$$\tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}} \in (-1.0, 1.0)$$

Forward propagation across layer $l$:

$$\mathbf{a}^{(l)} = \tanh\left(\mathbf{W}^{(l)} \mathbf{a}^{(l-1)} + \mathbf{b}^{(l)}\right)$$

Total parameter count per vehicle:
$$\begin{aligned}
\text{Layer 1 Parameters} &= (12 \times 14) + 14 = 182 \\
\text{Layer 2 Parameters} &= (14 \times 10) + 10 = 150 \\
\text{Layer 3 Parameters} &= (10 \times 4) + 4 = 44 \\
\mathbf{\text{Total Trainable Parameters}} &= \mathbf{376\text{ weights and biases}}
\end{aligned}$$

### 4.3 Control Actuation Thresholds
The continuous output vector $\mathbf{a}^{(3)} \in [-1.0, 1.0]^4$ is evaluated against crisp execution thresholds:
- **Forward Throttle**: Active if $\mathbf{a}_0^{(3)} > 0.05$
- **Brake / Reverse**: Active if $\mathbf{a}_1^{(3)} > 0.20$
- **Steer Left**: Commanded if $\mathbf{a}_2^{(3)} > 0.15$
- **Steer Right**: Commanded if $\mathbf{a}_3^{(3)} > 0.15$

If both steering outputs trigger simultaneously, the steering command resolves proportionally: $\Delta \delta \propto (\mathbf{a}_3^{(3)} - \mathbf{a}_2^{(3)})$.

---

## 5. Genetic Algorithm & Neuroevolution Mechanics

The neuroevolution engine evaluates cars in real time without backpropagation or labeled datasets, relying on selective fitness pressure.

### 5.1 Comprehensive Multi-Objective Fitness Function
The scalar fitness $F_i$ for car $i$ is calculated continuously:

$$F_i = (D_{\max} \cdot 2.5) + (N_{\text{wp}} \cdot 500) + (T_{\text{alive}} \cdot 0.12) + B_{\text{dest}} - P_{\text{red}} - P_{\text{crash}}$$

Where:
- $D_{\max} = \max_t (D_{\text{start}} - D_{\text{target}}(t))$: Peak distance closed toward active destination.
- $N_{\text{wp}}$: Cumulative route waypoints successfully cleared.
- $T_{\text{alive}}$: Total lifespan in frames before termination.
- $B_{\text{dest}}$: Destination arrival bonus:
  $$B_{\text{dest}} = \begin{cases} 4000 + \max(0, (1400 - T_{\text{alive}}) \cdot 2.5) & \text{if reached} \\ 0 & \text{otherwise} \end{cases}$$
- $P_{\text{red}}$: Red-light violation penalty accumulated when driving into an active red intersection corridor ($15\text{ pts/frame}$).
- $P_{\text{crash}}$: Collision penalty reducing total accumulated fitness by $28\%$ ($F_{\text{final}} = 0.72 \cdot F$).

### 5.2 Termination Criteria
An individual vehicle is terminated (flagged `dead = True`) under any of the following conditions:
1. **Obstacle / Wall Impact**: Vehicle OBB polygon intersects any boundary or building edge.
2. **Stagnation Timeout**: Car fails to make at least $15\text{ px}$ of forward progress over $120$ consecutive simulation frames ($2$ seconds at normal speed).
3. **Target Reached**: Vehicle enters the $26\text{ px}$ radius of the final destination pad.
4. **Max Lifetime Exceeded**: Generation maximum step limit reached ($1600$ frames).

### 5.3 Selection & Elitism
When all cars in the population are terminated, `engine/simulation.py` constructs Generation $g+1$:
1. **Sorting**: Vehicles are sorted in descending order of fitness: $F_{(1)} \ge F_{(2)} \ge \dots \ge F_{(K)}$.
2. **Strict Elitism**: The top 2 champion networks are cloned directly into the new generation without mutation:
   $$\text{Net}_1^{(g+1)} = \text{Net}_{(1)}^{(g)}, \quad \text{Net}_2^{(g+1)} = \text{Net}_{(2)}^{(g)}$$
3. **Tournament Selection**: For the remaining $K-2$ individuals, tournament pools of size $k = 4$ are selected uniformly at random. The individual with highest fitness within the pool is selected as Parent A (and another as Parent B).

### 5.4 Crossover & Gaussian Mutation
- **Uniform Crossover**: Child weights are drawn randomly from Parent A or Parent B with equal probability ($p = 0.5$).
- **Gaussian Mutation**: Each weight $w_{ij}$ and bias $b_j$ is perturbed with mutation probability $\mu = 0.08$:
  $$w_{ij}' = w_{ij} + \mathcal{N}(0, \sigma^2), \quad \sigma = 0.35$$
- Clamping ensures parameters remain bounded within $[-2.5, 2.5]$.

---

## 6. Straight Obstacle Course & Autonomous Goal-Seeking

The primary proving ground is a **Straight Highway Obstacle Course** enclosed by outer containment boundaries and populated with sequential wall obstacles.

```
0,60 ══════════════════════ [FINISH LINE TARGET (400, 110)] ══════════════════════ 700,60
│                                                                                │
│                     [WALL 5 (Right Barrier: 350 to 700, Y=220)]                │
│ [OPEN 250px GAP] ───►                                                          │
│                                                                                │
│ ◄─── [OPEN 280px GAP]                                                          │
│ [WALL 4 (Left Barrier: 100 to 450, Y=380)]                                     │
│                                                                                │
│ [OPEN 150px GAP] ───► [WALL 3 (Center Barrier: 250 to 550, Y=560)] ◄─── [GAP]  │
│                                                                                │
│                     [WALL 2 (Right Barrier: 350 to 700, Y=740)]                │
│ [OPEN 250px GAP] ───►                                                          │
│                                                                                │
│ ◄─── [OPEN 250px GAP]                                                          │
│ [WALL 1 (Left Barrier: 100 to 450, Y=920)]                                     │
│                                                                                │
│ ────────────────────────── [START LINE (Y = 1080)] ─────────────────────────── │
│                           [SPAWN POINT (400, 1080)]                            │
0,1140 ══════════════════════════════════════════════════════════════════════════ 700,1140
```

### 6.1 Sequential Obstacle Navigation
- **Track Dimensions**: Width $600\text{px}$ ($X \in [100, 700]$), Height $1080\text{px}$ ($Y \in [60, 1140]$).
- **Straight Centerline**: Crisp dashed centerline at $X = 400$ running from $Y = 1140$ to $Y = 60$.
- **5 Sequential Wall Barriers**:
  - **Wall 1 ($Y = 920$)**: Extends from left ($X = 100 \to 450$), forcing vehicles to steer right into a $250\text{px}$ gap.
  - **Wall 2 ($Y = 740$)**: Extends from right ($X = 350 \to 700$), forcing vehicles to weave back left.
  - **Wall 3 ($Y = 560$)**: Center barrier ($X = 250 \to 550$), presenting dual side bypass corridors ($150\text{px}$ each).
  - **Wall 4 ($Y = 380$)**: Extends from left ($X = 100 \to 450$), requiring a cut back to the right corridor.
  - **Wall 5 ($Y = 220$)**: Extends from right ($X = 350 \to 700$), opening a final left gateway to the destination.
- **Finish Line Target ($Y = 110$)**: Circular destination pad at $(400, 110)$ with radius $50\text{px}$.

### 6.2 Autonomous Continuous Learning ("Try Again & Again")
- Cars begin at Generation 1 with randomized neural weights.
- When vehicles collide with walls or perimeter borders, they are terminated immediately (`car.damaged = True`).
- When all active cars are terminated, the genetic supervisor preserves the champion (elitism) and mutates weights for Generation $g+1$.
- The population tries again and again across successive generations, progressively discovering paths through Gate 1, Gate 2, Gate 3, Gate 4, and Gate 5.

### 6.3 Automatic Successful AI Model Persistence
- Once cars successfully reach the destination pad (`dist < target.radius`):
  1. The champion neural network is automatically serialized to disk:
     `saved_models/Successful_AI_Gen{generation}_Fit{fitness}_{timestamp}.json`
  2. If 100% of the population successfully clears the course:
     `saved_models/Successful_AI_AllReached_Gen{generation}_{timestamp}.json`
  3. The simulation logs a prominent success announcement to the terminal.
  4. The client UI displays an immediate tactical toast: `SUCCESSFUL AI SAVED: Model reached destination!`.
  5. The breeding algorithm prioritizes destination-reaching vehicles as parents, reinforcing the winning path across all subsequent generations.

---

## 7. Client-Server Communication & WebSocket Protocol

Communication between the Python backend (`app.py`) and browser client (`main.js`) operates over full-duplex WebSockets on `/ws`.

### 7.1 Server-to-Client Telemetry Frame (`state`)
Dispatched at $\approx 40\text{ Hz}$. To optimize bandwidth, champion brain matrices are cached and only transmitted when generational updates occur or upon request.

```json
{
  "type": "state",
  "generation": 6,
  "alive_count": 34,
  "total_cars": 40,
  "best_fitness": 1842.5,
  "best_distance": 624.1,
  "best_speed": 4.12,
  "is_running": true,
  "speed_multiplier": 1.0,
  "cars": [
    {
      "id": 0,
      "x": 382.4,
      "y": 510.2,
      "angle": 0.042,
      "speed": 3.85,
      "steering_angle": -0.12,
      "fitness": 1842.5,
      "dead": false,
      "is_best": true,
      "reached_destination": false,
      "readings": [0.0, 0.0, 0.12, 0.45, 0.08, 0.0, 0.0],
      "polygon": [[373, 492], [391, 492], [391, 528], [373, 528]]
    }
  ],
  "traffic_lights": [
    {
      "id": "TL_1_NS",
      "x": 312,
      "y": 312,
      "state": "green",
      "stop_line": [[320, 340], [440, 340]]
    }
  ],
  "best_brain": {
    "weights": [[[0.12, -0.45], [0.88, 0.04]]],
    "biases": [[-0.05, 0.22]]
  }
}
```

### 7.2 Client-to-Server Control Commands
The client transmits control frames via `ws.send(JSON.stringify(payload))`:

| Action | Payload Schema | Engine Response |
| :--- | :--- | :--- |
| **Toggle Run / Pause** | `{"action": "set_running", "is_running": bool}` | Updates `engine.is_running` |
| **Adjust Speed Multiplier** | `{"action": "set_speed", "speed": float}` | Updates `engine.speed_multiplier` ($0.5$ to $40.0$) |
| **Adjust Population Size** | `{"action": "set_population", "population": int}` | Resizes car population ($20$ to $100$) |
| **Reset Generation** | `{"action": "reset"}` | Restarts simulation at Generation 1 |
| **Replay Current Gen** | `{"action": "replay"}` | Restarts current generation with current champion seeds |

### 7.3 Concurrency & Thread-Safety Model
The backend implements a decoupled multi-threaded architecture:
- **Simulation Worker Thread**: Runs in a tight loop executing `simulation.step()`.
- **WebSocket Streaming Coroutine**: Streams serialized frames without blocking simulation calculations.
- **`threading.Lock`**: Guards shared state mutations (e.g. population resizing, brain reloading, coordinate snapshots).

---

## 8. Frontend Architecture & Rendering Pipeline

The web UI is built with zero framework overhead, maximizing frame throughput on the HTML5 Canvas 2D API.

### 8.1 Rendering Pipeline Architecture
```
requestAnimationFrame Loop (60 FPS)
   │
   ├─► 1. Clear Canvas (Pure Monochrome Background #0a0a0a)
   │
   ├─► 2. Apply Camera Matrix Transformation
   │        ctx.translate(canvas.width / 2, canvas.height / 2)
   │        ctx.scale(camera.zoom, camera.zoom)
   │        ctx.translate(-camera.x, -camera.y)
   │
   ├─► 3. Draw City Map (Roads, Avenues, 9 Buildings, Curbs)
   │
   ├─► 4. Draw Traffic Light Signal Housings & Dynamic Stop Lines
   │
   ├─► 5. Draw Tactical Destination Pad (Vector Target Crosshair)
   │
   ├─► 6. Draw Vehicle Population:
   │        ├─ Standard Dead / Inactive Vehicles (Dim gray)
   │        ├─ Active Surviving Vehicles (White)
   │        ├─ Champion Vehicle (High-contrast white + LiDAR rays)
   │        └─ Front Wheels (Rendered with physical steering angle delta)
   │
   ├─► 7. Restore Canvas Coordinate Matrix
   │
   └─► 8. Render HUD Telemetry (Speed, Generation, Alive Count)
```

### 8.2 Synapse Network Visualizer
A dedicated sub-canvas in `static/js/visualizer.js` visualizes the champion's neural network in real time:
- Positive weight synapses render as crisp white lines.
- Negative weight synapses render as dashed or dim gray lines.
- Synapse stroke thickness is proportional to $|w_{ij}|$.
- Active forward-propagating neurons illuminate dynamically based on their current output activation value.
- Execution is throttled to 5 FPS to eliminate GPU/CPU contention with the primary canvas.

---

## 9. Performance & Benchmarking

| Subsystem | Metric | Specification / Result |
| :--- | :--- | :--- |
| **Python Simulation Engine** | Raw Throughput | **160+ FPS** (Single core, 40 cars, 7 LiDAR rays) |
| **LiDAR Raycasting** | Collision Check Overhead | $< 1.8\text{ ms/step}$ (With spatial AABB pruning) |
| **WebSocket Serialization** | Payload Size | $\approx 4.2\text{ KB/frame}$ (Brain caching enabled) |
| **Frontend Canvas** | Display Frame Rate | **60 FPS** continuous |
| **Memory Footprint** | Backend Process | $\approx 48\text{ MB}$ RAM |
| **Browser Memory** | Tab Footprint | $\approx 35\text{ MB}$ RAM |

---

## 10. Design Philosophy & Brutalist Standards

1. **Non-AI Slop**: No decorative glassmorphism, no rainbow gradients, no gratuitous rounded borders (`border-radius: 0 !important`).
2. **Monochrome Precision**: Pure black (`#000000`, `#0a0a0a`), white (`#ffffff`, `#e0e0e0`), and muted grays (`#222222`, `#444444`, `#888888`).
3. **Tactile Industrial Typography**: Strict monospace typography (`JetBrains Mono`, `Consolas`, `Courier New`).
4. **Vector Exclusivity**: Zero unicode emojis (`🎯`, `▲`, `🚗`, etc.). All navigational icons, targets, and arrows are drawn as direct mathematical vectors or SVG elements.
5. **Clean Interface Grammar**: Zero pseudo-programming decorative slashes (`//`) in UI labels. Plain, readable technical English.
