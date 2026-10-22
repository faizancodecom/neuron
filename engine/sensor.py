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
        rx0, ry0 = ray[0]['x'], ray[0]['y']
        rx1, ry1 = ray[1]['x'], ray[1]['y']
        rmin_x = min(rx0, rx1)
        rmax_x = max(rx0, rx1)
        rmin_y = min(ry0, ry1)
        rmax_y = max(ry0, ry1)

        # 1. Road boundaries with quick AABB test
        for border in road_borders:
            b0, b1 = border[0], border[1]
            bmin_x = min(b0['x'], b1['x'])
            bmax_x = max(b0['x'], b1['x'])
            if rmax_x < bmin_x or rmin_x > bmax_x:
                continue
            bmin_y = min(b0['y'], b1['y'])
            bmax_y = max(b0['y'], b1['y'])
            if rmax_y < bmin_y or rmin_y > bmax_y:
                continue

            touch = get_intersection(ray[0], ray[1], b0, b1)
            if touch:
                touches.append(touch)

        # 2. Obstacles with cached polygon and AABB test
        for obs in obstacles:
            obs_type = obs.get('type')
            if obs_type in ('barrier', 'rect'):
                # Cached AABB check
                aabb = obs.get('_aabb')
                if aabb is None:
                    w2 = obs.get('width', 40) / 2.0
                    h2 = obs.get('height', 40) / 2.0
                    rad = math.hypot(w2, h2)
                    ox, oy = obs['x'], obs['y']
                    aabb = (ox - rad, ox + rad, oy - rad, oy + rad)
                    obs['_aabb'] = aabb

                if rmax_x < aabb[0] or rmin_x > aabb[1] or rmax_y < aabb[2] or rmin_y > aabb[3]:
                    continue

                poly = obs.get('polygon') or obs.get('_polygon')
                if not poly:
                    poly = get_rect_polygon(obs['x'], obs['y'], obs['width'], obs['height'], obs.get('angle', 0.0))
                    obs['_polygon'] = poly

                n = len(poly)
                for j in range(n):
                    touch = get_intersection(ray[0], ray[1], poly[j], poly[(j + 1) % n])
                    if touch:
                        touches.append(touch)

            elif obs_type in ('street_light', 'circle'):
                rad = obs.get('radius', 14)
                ox, oy = obs['x'], obs['y']
                if rmax_x < ox - rad or rmin_x > ox + rad or rmax_y < oy - rad or rmin_y > oy + rad:
                    continue
                touch = get_ray_circle_intersection(
                    ray[0], ray[1],
                    {'x': ox, 'y': oy},
                    rad
                )
                if touch:
                    touches.append(touch)

        if not touches:
            return None

        # Return the closest touch point (smallest offset)
        return min(touches, key=lambda t: t['offset'])
