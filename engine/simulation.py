"""
NEURON AI Simulation Engine & Genetic Algorithm Supervisor in Python.
Coordinates live vehicle physics, Ackermann steering, traffic lights, and real neuroevolution.
"""

import time
import math
import random
from .car import Car
from .map_presets import get_preset_map


class SimulationEngine:
    def __init__(self, population_size=60, mutation_rate=0.12, episode_duration=32):
        self.population_size = population_size
        self.mutation_rate = mutation_rate
        self.mutation_amount = 0.40
        self.episode_duration = episode_duration

        self.speed_multiplier = 1
        self.is_running = True

        self.generation = 1
        self.elapsed_time = 0.0
        self.total_parked = 0
        self.champion_fitness = 0.0
        self.champion_brain = None
        self.fitness_history = []

        self._last_log_time = 0.0
        self._step_counter = 0

        # Load City map by default
        self.map_data = get_preset_map('city')
        self.traffic_lights = self.map_data.get('trafficLights', [])
        self.cars = []
        self.best_car = None

        self._init_population()
        self._log_startup()

    def _init_population(self):
        self.cars = []
        spawn = self.map_data.get('spawnPoint', {'x': 380, 'y': 1110, 'angle': 0.0})
        for _ in range(self.population_size):
            car = Car(spawn['x'], spawn['y'])
            car.angle = spawn.get('angle', 0.0)
            self.cars.append(car)
        self.best_car = self.cars[0] if self.cars else None

    def _log_startup(self):
        print("\n" + "=" * 65)
        print("  [NEURON AI] PYTHON NEUROEVOLUTION ENGINE STARTED")
        print(f"  Population: {self.population_size} Autonomous Vehicles")
        print(f"  Architecture: 12 Inputs -> 14 Hidden -> 10 Hidden -> 4 Outputs")
        print(f"  Active Map: {self.map_data.get('title', self.map_data.get('name'))}")
        print(f"  Traffic System: {len(self.traffic_lights)} Automated Signal Lights Active")
        print("=" * 65 + "\n")

    def step(self):
        if not self.is_running:
            return

        dt = 1.0 / 60.0
        self.elapsed_time += dt
        self._step_counter += 1

        # 1. Update Traffic Lights
        for tl in self.traffic_lights:
            tl.update(dt)

        road_borders = self.map_data.get('roadBorders', [])
        obstacles = self.map_data.get('obstacles', [])
        target = self.map_data.get('target', {'x': 820, 'y': 160, 'radius': 52})
        waypoints = self.map_data.get('waypoints', [])

        alive_count = 0
        parked_count = 0

        # 2. Update Cars with True Neural Network Evaluations
        for car in self.cars:
            car.update(
                road_borders=road_borders,
                obstacles=obstacles,
                target=target,
                waypoints=waypoints,
                traffic_lights=self.traffic_lights,
                delta_time=1.0
            )
            if not car.damaged and not car.parked:
                alive_count += 1
            if car.parked:
                parked_count += 1

        # 3. Find Leader
        if self.cars:
            current_best = self.cars[0]
            for car in self.cars[1:]:
                if car.fitness > current_best.fitness:
                    current_best = car
            self.best_car = current_best

        # 4. Real-time Terminal Logging (every ~1.0s)
        now = time.time()
        if now - self._last_log_time >= 1.0:
            self._last_log_time = now
            self._print_terminal_status(alive_count, parked_count)

        # 5. Generational Progression Trigger
        all_finished = alive_count == 0
        timeout_reached = self.elapsed_time >= self.episode_duration

        if all_finished or timeout_reached:
            self.next_generation()

    def _print_terminal_status(self, alive, parked):
        best_fit = self.best_car.fitness if self.best_car else 0.0
        spd = abs(self.best_car.speed) if self.best_car else 0.0
        
        # Leader car outputs summary
        steer_deg = math.degrees(self.best_car.steering_angle) if self.best_car else 0.0
        out = self.best_car.last_outputs if self.best_car else []
        fwd_str = f"{max(0.0, out[0])*100:.0f}%" if len(out) > 0 else "0%"

        # Traffic light signal status
        tl_status = "N/A"
        if self.traffic_lights:
            tl_status = self.traffic_lights[0].state

        print(
            f"[AI GEN {self.generation:03d}] Alive: {alive:02d}/{self.population_size:02d} | "
            f"Parked: {parked:02d} | Best Fit: {best_fit:7.1f} | Peak: {self.champion_fitness:7.1f} | "
            f"Spd: {spd:3.1f} | Wheels: {steer_deg:>+5.1f}° | Gas: {fwd_str:>4} | Signal: {tl_status}"
        )

    def next_generation(self):
        # 1. Sort cars descending by fitness
        self.cars.sort(key=lambda c: c.fitness, reverse=True)
        top = self.cars[0] if self.cars else None

        avg_fit = sum(c.fitness for c in self.cars) / len(self.cars) if self.cars else 0.0
        parked_this_gen = sum(1 for c in self.cars if c.parked)
        self.total_parked += parked_this_gen

        if top and top.fitness > self.champion_fitness:
            self.champion_fitness = top.fitness
            self.champion_brain = top.brain.clone()

        self.fitness_history.append({
            'generation': self.generation,
            'bestFitness': round(top.fitness if top else 0.0, 1),
            'avgFitness': round(avg_fit, 1),
            'parkedCount': parked_this_gen
        })
        if len(self.fitness_history) > 40:
            self.fitness_history.pop(0)

        # Terminal Evolution Announcement
        print("\n" + "-" * 65)
        print(f"  >>> [REAL-TIME AI EVOLUTION] GENERATION {self.generation:03d} COMPLETE <<<")
        print(f"  Top Fitness: {top.fitness if top else 0.0:.2f} | Avg Fitness: {avg_fit:.2f} | Reached Destination: {parked_this_gen}")
        print(f"  All-Time Record Fitness: {self.champion_fitness:.2f} | Total Successes: {self.total_parked}")
        print(f"  Preserving Elite Champion & Mutating Children (Rate: {int(self.mutation_rate*100)}%)...")
        print("-" * 65 + "\n")

        # 2. Reproduction & Real Genetic Learning
        spawn = self.map_data.get('spawnPoint', {'x': 380, 'y': 1110, 'angle': 0.0})
        new_cars = []

        # Elitism: preserve top 2 performers unchanged
        elite_count = max(1, min(2, int(self.population_size * 0.05)))
        for i in range(elite_count):
            car = Car(spawn['x'], spawn['y'])
            car.angle = spawn.get('angle', 0.0)
            car.brain = self.cars[i].brain.clone()
            new_cars.append(car)

        # Fill rest with mutated brains from top performers
        parent_pool = self.cars[:max(4, int(self.population_size * 0.25))]
        while len(new_cars) < self.population_size:
            parent = random.choice(parent_pool)
            child_car = Car(spawn['x'], spawn['y'])
            child_car.angle = spawn.get('angle', 0.0)
            child_car.brain = parent.brain.clone()
            child_car.brain.mutate(rate=self.mutation_rate, amount=self.mutation_amount)
            new_cars.append(child_car)

        self.cars = new_cars
        self.best_car = self.cars[0]
        self.generation += 1
        self.elapsed_time = 0.0

    def replay(self, speed=1):
        """
        Replays the simulation from the current champion brain at the chosen speed.
        """
        self.speed_multiplier = max(1, min(60, int(speed)))
        spawn = self.map_data.get('spawnPoint', {'x': 380, 'y': 1110, 'angle': 0.0})
        
        # Reset cars to spawn with current brains
        for car in self.cars:
            car.reset(spawn['x'], spawn['y'], spawn.get('angle', 0.0))
        
        self.elapsed_time = 0.0
        self.is_running = True
        print(f"\n[REPLAY] Replaying simulation at {self.speed_multiplier}x speed...")

    def set_population(self, new_size):
        if new_size <= 0 or new_size == self.population_size:
            return
        print(f"\n[NEURON AI] Population count: {self.population_size} -> {new_size} cars.")
        self.population_size = new_size
        self._init_population()

    def set_speed(self, multiplier):
        self.speed_multiplier = max(1, min(60, int(multiplier)))
        print(f"[NEURON AI] Simulation speed: {self.speed_multiplier}x.")

    def toggle_pause(self):
        self.is_running = not self.is_running
        state = "RUNNING" if self.is_running else "PAUSED"
        print(f"[NEURON AI] State: {state}")
        return self.is_running

    def set_map(self, map_data):
        if not map_data:
            return
        self.map_data = map_data
        self.traffic_lights = map_data.get('trafficLights', [])
        print(f"\n[NEURON AI] Map loaded: {map_data.get('title', map_data.get('name', 'Custom'))}")
        self.reset()

    def reset(self):
        print(f"[NEURON AI] Restarting simulation from Generation 1.")
        self.generation = 1
        self.elapsed_time = 0.0
        self.champion_fitness = 0.0
        self.champion_brain = None
        self.fitness_history = []
        self._init_population()

    def apply_trained_brain(self, brain):
        if not brain:
            return
        self.champion_brain = brain.clone()
        for car in self.cars:
            car.brain = brain.clone()
        print(f"[NEURON AI] Deployed trained brain to all vehicles.")

    def get_state(self):
        """
        Builds lightweight state snapshot dictionary sent to HTML.
        Includes physical steering angle for realistic turning wheels!
        """
        alive_count = sum(1 for c in self.cars if not c.damaged and not c.parked)
        parked_count = sum(1 for c in self.cars if c.parked)
        target = self.map_data.get('target', {'x': 400, 'y': 110})

        dist_to_target = None
        if self.best_car and target:
            dist_to_target = math.hypot(self.best_car.x - target['x'], self.best_car.y - target['y'])

        # Compact cars array: [x, y, angle, steering_angle, status]
        # status: 0 = alive, 1 = damaged, 2 = parked
        compact_cars = [
            [
                round(c.x, 1),
                round(c.y, 1),
                round(c.angle, 3),
                round(c.steering_angle, 3),
                1 if c.damaged else (2 if c.parked else 0)
            ]
            for c in self.cars
        ]

        leader_data = None
        if self.best_car:
            leader_data = {
                'x': round(self.best_car.x, 1),
                'y': round(self.best_car.y, 1),
                'angle': round(self.best_car.angle, 3),
                'steering': round(self.best_car.steering_angle, 3),
                'speed': round(self.best_car.speed, 2),
                'damaged': self.best_car.damaged,
                'parked': self.best_car.parked,
                'fitness': round(self.best_car.fitness, 1),
                'trail': self.best_car.trail,
                'sensors': [round(1.0 - s['offset'], 3) if s else 0.0 for s in self.best_car.sensor.readings],
                'inputs': [round(v, 3) for v in self.best_car.last_inputs],
                'outputs': [round(v, 3) for v in self.best_car.last_outputs],
                'brain': self.best_car.brain.to_dict()
            }

        # Traffic lights states
        tl_list = [tl.to_dict() for tl in self.traffic_lights]

        return {
            'generation': self.generation,
            'timeRemaining': round(max(0.0, self.episode_duration - self.elapsed_time), 1),
            'alive': alive_count,
            'total': len(self.cars),
            'parked': parked_count,
            'bestFitness': round(self.best_car.fitness if self.best_car else 0.0, 1),
            'championFitness': round(self.champion_fitness, 1),
            'distanceToTarget': round(dist_to_target, 1) if dist_to_target is not None else None,
            'isRunning': self.is_running,
            'speedMultiplier': self.speed_multiplier,
            'cars': compact_cars,
            'leader': leader_data,
            'trafficLights': tl_list,
            'mapName': self.map_data.get('name', 'city'),
            'mapTitle': self.map_data.get('title', 'City Grid'),
            'target': self.map_data.get('target'),
            'destinations': self.map_data.get('destinations', []),
            'waypoints': self.map_data.get('waypoints', []),
            'fitnessHistory': self.fitness_history[-35:]
        }
