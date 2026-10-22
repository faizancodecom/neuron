"""
Multi-directional LiDAR Raycast Sensor in Python.
"""

import math
from .geometry import lerp, get_intersection, get_ray_circle_intersection, get_rect_polygon


class Sensor:
    def __init__(self, car, ray_count=7, ray_length=220.0, ray_spread=math.pi * 0.85):
        self.car = car
        self.ray_count = ray_count
        self.ray_length = ray_length
        self.ray_spread = ray_spread

        self.rays = []
        self.readings = []

    def update(self, road_borders, obstacles):
        self._cast_rays()
        self.readings = []
        for ray in self.rays:
            reading = self._get_reading(ray, road_borders, obstacles)
            self.readings.append(reading)

    def _cast_rays(self):
        self.rays = []
        for i in range(self.ray_count):
            t = 0.5 if self.ray_count == 1 else i / (self.ray_count - 1)
            ray_angle = lerp(self.ray_spread / 2.0, -self.ray_spread / 2.0, t) + self.car.angle

            start_x = self.car.x + math.sin(self.car.angle) * (self.car.height * 0.45)
            start_y = self.car.y - math.cos(self.car.angle) * (self.car.height * 0.45)

            end_x = start_x - math.sin(ray_angle) * self.ray_length
            end_y = start_y + math.cos(ray_angle) * self.ray_length

            self.rays.append([{'x': start_x, 'y': start_y}, {'x': end_x, 'y': end_y}])

    def _get_reading(self, ray, road_borders, obstacles):
        touches = []

        # Road boundaries
        for border in road_borders:
            touch = get_intersection(ray[0], ray[1], border[0], border[1])
            if touch:
                touches.append(touch)

        # Obstacles
        for obs in obstacles:
            obs_type = obs.get('type')
            if obs_type in ('street_light', 'circle'):
                touch = get_ray_circle_intersection(
                    ray[0], ray[1],
                    {'x': obs['x'], 'y': obs['y']},
                    obs.get('radius', 14)
                )
                if touch:
                    touches.append(touch)
            elif obs_type in ('barrier', 'rect'):
                poly = obs.get('polygon')
                if not poly:
                    poly = get_rect_polygon(obs['x'], obs['y'], obs['width'], obs['height'], obs.get('angle', 0.0))
                n = len(poly)
                for j in range(n):
                    touch = get_intersection(ray[0], ray[1], poly[j], poly[(j + 1) % n])
                    if touch:
                        touches.append(touch)

        if not touches:
            return None

        # Return the closest touch point (smallest offset)
        return min(touches, key=lambda t: t['offset'])
