"""
Realistic Vehicle Kinematics & AI Agent in Python.
Features Ackermann bicycle steering, 4 physical rotating wheels,
traffic light sensing, rollback boundary collision prevention, and genuine neuroevolution.
"""

import math
from .neural_network import NeuralNetwork
from .sensor import Sensor
from .geometry import get_rect_polygon, polys_intersect


class Car:
    def __init__(self, x, y, width=22, height=42, max_speed=4.4):
        self.start_x = float(x)
        self.start_y = float(y)
        self.x = float(x)
        self.y = float(y)
        self.width = width
        self.height = height

        # Realistic vehicle physics
        self.speed = 0.0
        self.acceleration = 0.22
        self.brake_decel = 0.35
        self.max_speed = max_speed
        self.friction = 0.045
        self.angle = 0.0  # Heading in radians

        # Ackermann steering geometry
        self.wheelbase = 28.0
        self.steering_angle = 0.0  # Front wheels angle relative to car heading
        self.max_steer = math.radians(35.0)  # +/- 35 degrees
        self.steer_rate = 0.28  # Speed at which front wheels turn

        self.damaged = False
        self.parked = False

        self.fitness = 0.0
        self.max_progress = 0.0
        self.stalled_time = 0.0
        self.lifetime = 0.0
        self.current_waypoint_idx = 0

        self.controls = {'forward': False, 'reverse': False, 'left': False, 'right': False}
        self.last_inputs = [0.0] * 12
        self.last_outputs = [0.0] * 4

        self.sensor = Sensor(self, ray_count=7, ray_length=220.0)
        # Inputs: 7 LiDAR rays + speed + steering + target angle + target dist + traffic light = 12
        # Hidden: [14, 10]
        # Outputs: [throttle, brake, steer_left, steer_right] = 4
        self.brain = NeuralNetwork([12, 14, 10, 4])

        self.polygon = self._create_polygon()
        self.trail = []

    def reset(self, x=None, y=None, angle=0.0):
        self.x = float(x) if x is not None else self.start_x
        self.y = float(y) if y is not None else self.start_y
        self.angle = angle
        self.speed = 0.0
        self.steering_angle = 0.0
        self.damaged = False
        self.parked = False
        self.fitness = 0.0
        self.max_progress = 0.0
        self.stalled_time = 0.0
        self.lifetime = 0.0
        self.current_waypoint_idx = 0
        self.trail = []
        self.polygon = self._create_polygon()

    def update(self, road_borders, obstacles, target, waypoints=None, traffic_lights=None, delta_time=1.0):
        if self.damaged or self.parked:
            return

        self.lifetime += delta_time

        # 1. Update Route Waypoint
        active_target = target
        if waypoints and len(waypoints) > 0:
            active_target = self._update_active_waypoint(waypoints, target)

        # 2. Update Sensor Readings (LiDAR)
        self.sensor.update(road_borders, obstacles)

        # 3. Detect Traffic Light Ahead
        traffic_signal = self._detect_traffic_light(traffic_lights)

        # 4. Feedforward Inputs into Neural Network
        self.last_inputs = self._generate_inputs(active_target, traffic_signal)
        self.last_outputs = self.brain.feed_forward(self.last_inputs)

        # 5. Interpret AI Decisions
        self.controls['forward'] = self.last_outputs[0] > 0.05
        self.controls['reverse'] = self.last_outputs[1] > 0.20
        self.controls['left'] = self.last_outputs[2] > 0.15
        self.controls['right'] = self.last_outputs[3] > 0.15

        # 6. Step Realistic Vehicle Kinematics
        prev_x = self.x
        prev_y = self.y
        prev_angle = self.angle
        prev_steer = self.steering_angle

        self._move_kinematics()
        self.polygon = self._create_polygon()

        # 7. Collision Detection & Hard Barrier Protection
        collision = self._assess_damage(road_borders, obstacles)
        if collision:
            self.damaged = True
            # Rollback to exact position before impact so car NEVER jumps past boundary!
            self.x = prev_x
            self.y = prev_y
            self.angle = prev_angle
            self.steering_angle = prev_steer
            self.speed = 0.0
            self.polygon = self._create_polygon()
            return

        # 8. Check Destination / Target Arrival
        if target:
            self._check_destination_arrival(target)

        # 9. Evaluate Real-Time Fitness
        self._evaluate_fitness(active_target, traffic_signal)

        # 10. Record Trail Telemetry
        if int(self.lifetime) % 4 == 0 and len(self.trail) < 40:
            self.trail.append({'x': round(self.x, 1), 'y': round(self.y, 1)})

        # 11. Anti-stalling check: motionless cars get timed out after 160 frames (~2.6s)
        if abs(self.speed) < 0.15:
            # If stopped at red light, don't penalize as stalled!
            if traffic_signal < 0.3:
                self.stalled_time += delta_time
                if self.stalled_time > 180 and self.lifetime > 80:
                    self.damaged = True
        else:
            self.stalled_time = max(0.0, self.stalled_time - delta_time * 0.5)

    def _update_active_waypoint(self, waypoints, final_target):
        if self.current_waypoint_idx < len(waypoints):
            wp = waypoints[self.current_waypoint_idx]
            dist = math.hypot(self.x - wp['x'], self.y - wp['y'])
            if dist < 65.0:
                self.current_waypoint_idx += 1
                if self.current_waypoint_idx < len(waypoints):
                    return waypoints[self.current_waypoint_idx]
                return final_target
            return wp
        return final_target

    def _move_kinematics(self):
        """
        Ackermann Bicycle Vehicle Dynamics.
        Front wheels turn to steering_angle; turning radius depends on velocity and wheelbase.
        """
        # Desired steer from controls (-1.0 to 1.0)
        target_steer_norm = 0.0
        if self.controls['left']:
            target_steer_norm -= 1.0
        if self.controls['right']:
            target_steer_norm += 1.0

        target_steer = target_steer_norm * self.max_steer
        # Smoothly turn front wheels
        self.steering_angle += (target_steer - self.steering_angle) * self.steer_rate

        # Throttle & Brake
        if self.controls['forward']:
            self.speed += self.acceleration
        if self.controls['reverse']:
            self.speed -= self.brake_decel

        # Clamp max speed
        if self.speed > self.max_speed:
            self.speed = self.max_speed
        if self.speed < -self.max_speed * 0.4:
            self.speed = -self.max_speed * 0.4

        # Friction
        if self.speed > 0:
            self.speed = max(0.0, self.speed - self.friction)
        elif self.speed < 0:
            self.speed = min(0.0, self.speed + self.friction)

        # Heading & Position Update
        if abs(self.speed) > 0.02:
            flip = 1.0 if self.speed > 0 else -1.0
            # Angular velocity = (v / L) * tan(delta)
            angular_velocity = (self.speed / self.wheelbase) * math.tan(self.steering_angle) * flip
            self.angle += angular_velocity

            self.x += math.sin(self.angle) * self.speed
            self.y -= math.cos(self.angle) * self.speed

    def _detect_traffic_light(self, traffic_lights):
        """
        Detects if an active directional traffic light is ahead within 140px on car's trajectory.
        Returns 0.0 (clear/green) to 1.0 (approaching red light).
        """
        if not traffic_lights:
            return 0.0

        # Determine car's current roadway axis (North-South vs East-West)
        car_is_ns = abs(math.cos(self.angle)) >= abs(math.sin(self.angle))
        relevant_dir = 'NS' if car_is_ns else 'EW'

        for tl in traffic_lights:
            # Strictly observe lights matching the car's current roadway direction!
            if tl.direction != relevant_dir:
                continue

            dist = math.hypot(self.x - tl.x, self.y - tl.y)
            if dist < 140.0:
                # Check if light is in front of the car
                dx = tl.x - self.x
                dy = tl.y - self.y
                forward_x = math.sin(self.angle)
                forward_y = -math.cos(self.angle)
                dot = (dx * forward_x + dy * forward_y) / (dist + 1e-5)

                if dot > 0.30:  # Ahead of car
                    if tl.state == 'RED':
                        proximity = max(0.0, min(1.0, 1.0 - (dist / 140.0)))
                        return proximity
                    elif tl.state == 'YELLOW':
                        return 0.35
                    elif tl.state == 'GREEN':
                        return 0.0
        return 0.0

    def _generate_inputs(self, target, traffic_signal):
        # 1. LiDAR raycast readings (0 to 1)
        sensor_inputs = [
            (1.0 - s['offset']) if s is not None else 0.0
            for s in self.sensor.readings
        ]

        # 2. Normalized velocity (-1 to 1)
        speed_norm = self.speed / self.max_speed

        # 3. Normalized front wheel steering angle (-1 to 1)
        steer_norm = self.steering_angle / self.max_steer

        # 4. Angle & distance to active target / waypoint
        angle_to_target = 0.0
        dist_norm = 1.0

        if target:
            dx = target['x'] - self.x
            dy = target['y'] - self.y
            target_angle = math.atan2(dx, -dy)
            angle_diff = target_angle - self.angle

            while angle_diff > math.pi:
                angle_diff -= math.pi * 2
            while angle_diff < -math.pi:
                angle_diff += math.pi * 2
            angle_to_target = angle_diff / math.pi

            dist = math.hypot(dx, dy)
            dist_norm = min(1.0, dist / 1200.0)

        # 5. Traffic light signal (0 = green/none, 1 = red stop)
        return [*sensor_inputs, speed_norm, steer_norm, angle_to_target, dist_norm, traffic_signal]

    def _create_polygon(self):
        return get_rect_polygon(self.x, self.y, self.width, self.height, self.angle)

    def _assess_damage(self, road_borders, obstacles):
        # Road borders
        for border in road_borders:
            if polys_intersect(self.polygon, border):
                return True

        # Obstacles
        for obs in obstacles:
            obs_type = obs.get('type')
            if obs_type in ('street_light', 'circle'):
                dist = math.hypot(self.x - obs['x'], self.y - obs['y'])
                if dist < (self.width / 2.0 + obs.get('radius', 10)):
                    return True
            elif obs_type in ('barrier', 'rect'):
                poly = obs.get('polygon')
                if not poly:
                    poly = get_rect_polygon(obs['x'], obs['y'], obs['width'], obs['height'], obs.get('angle', 0.0))
                if polys_intersect(self.polygon, poly):
                    return True
        return False

    def _check_destination_arrival(self, target):
        dist = math.hypot(self.x - target['x'], self.y - target['y'])
        if dist < target.get('radius', 48.0):
            self.parked = True
            self.speed = 0.0

    def _evaluate_fitness(self, target, traffic_signal):
        if not target:
            return

        initial_dist = math.hypot(self.start_x - target['x'], self.start_y - target['y'])
        current_dist = math.hypot(self.x - target['x'], self.y - target['y'])

        progress = max(0.0, initial_dist - current_dist)
        if progress > self.max_progress:
            self.max_progress = progress

        # Base fitness from route progress
        fit = self.max_progress * 2.5
        fit += (self.current_waypoint_idx * 500.0)  # Huge bonus for each completed intersection/street
        fit += (self.lifetime * 0.12)
        fit += max(0.0, self.speed * 0.6)

        # Traffic light compliance reward:
        if traffic_signal > 0.5:
            # If approaching red light and car slows down, reward patience!
            if self.speed < 1.0:
                fit += 15.0
            else:
                # Running a red light penalty
                fit -= 25.0

        # Destination bonus
        if self.parked:
            fit += 4000.0
            time_bonus = max(0.0, (1400.0 - self.lifetime) * 2.5)
            fit += time_bonus

        # Crash penalty
        if self.damaged:
            fit *= 0.72

        self.fitness = max(0.0, round(fit, 2))
