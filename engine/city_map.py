"""
Full-scale City Grid Environment & Dynamic Traffic Light System in Python.
Includes multi-lane avenues, intersections, traffic lights, and destination routing.
"""

import math


class TrafficLight:
    def __init__(self, id_name, x, y, direction='NS', cycle_time=12.0):
        self.id_name = id_name
        self.x = x
        self.y = y
        self.direction = direction  # 'NS' or 'EW'
        self.cycle_time = cycle_time
        self.timer = 0.0
        self.state = 'GREEN' if direction == 'NS' else 'RED'  # 'GREEN', 'YELLOW', 'RED'
        # Stop line coordinates for cars approaching this light
        self.stop_lines = []

    def update(self, dt):
        self.timer += dt
        t = self.timer % self.cycle_time

        # 0 to 45% -> GREEN, 45% to 50% -> YELLOW, 50% to 95% -> RED, 95% to 100% -> RED/YELLOW
        phase = t / self.cycle_time
        if self.direction == 'NS':
            if phase < 0.42:
                self.state = 'GREEN'
            elif phase < 0.50:
                self.state = 'YELLOW'
            else:
                self.state = 'RED'
        else:
            if phase < 0.50:
                self.state = 'RED'
            elif phase < 0.92:
                self.state = 'GREEN'
            else:
                self.state = 'YELLOW'

    def to_dict(self):
        return {
            'id': self.id_name,
            'x': self.x,
            'y': self.y,
            'direction': self.direction,
            'state': self.state
        }


def build_city_map():
    """
    Builds a full-scale 1200 x 1200 City Map with 4-way intersections,
    solid building blocks (cars cannot penetrate), traffic lights, and destination hubs.
    Road Width = 120px (Two lanes).
    """
    width = 1200
    height = 1200

    # Road centerlines:
    # Avenue 1: Y = 380, Avenue 2: Y = 820
    # Boulevard 1: X = 380, Boulevard 2: X = 820
    road_w = 120
    half_r = road_w / 2.0  # 60px

    # Outer perimeter walls (cars can NEVER cross)
    borders = [
        [{'x': 40, 'y': 1160}, {'x': 40, 'y': 40}],
        [{'x': 1160, 'y': 1160}, {'x': 1160, 'y': 40}],
        [{'x': 40, 'y': 1160}, {'x': 1160, 'y': 1160}],
        [{'x': 40, 'y': 40}, {'x': 1160, 'y': 40}]
    ]

    # Building Blocks (9 solid rectangular city blocks that cars cannot cross)
    # Block definitions: [x, y, w, h]
    blocks = [
        # Top Row
        {'x': 200, 'y': 200, 'width': 280, 'height': 280},
        {'x': 600, 'y': 200, 'width': 320, 'height': 280},
        {'x': 1000, 'y': 200, 'width': 280, 'height': 280},
        # Middle Row
        {'x': 200, 'y': 600, 'width': 280, 'height': 320},
        {'x': 600, 'y': 600, 'width': 320, 'height': 320},
        {'x': 1000, 'y': 600, 'width': 280, 'height': 320},
        # Bottom Row
        {'x': 200, 'y': 1000, 'width': 280, 'height': 280},
        {'x': 600, 'y': 1000, 'width': 320, 'height': 280},
        {'x': 1000, 'y': 1000, 'width': 280, 'height': 280}
    ]

    # Convert building blocks into obstacle colliders (barriers)
    obstacles = []
    for b in blocks:
        obstacles.append({
            'type': 'barrier',
            'x': b['x'],
            'y': b['y'],
            'width': b['width'],
            'height': b['height'],
            'angle': 0.0,
            'isBuilding': True
        })

    # Street light pillars along avenues (decorative & collision points)
    sidewalk_poles = [
        # North Avenue poles
        {'x': 390, 'y': 310}, {'x': 810, 'y': 310},
        {'x': 390, 'y': 450}, {'x': 810, 'y': 450},
        # South Avenue poles
        {'x': 390, 'y': 750}, {'x': 810, 'y': 750},
        {'x': 390, 'y': 890}, {'x': 810, 'y': 890},
        # Mid corridors
        {'x': 600, 'y': 310}, {'x': 600, 'y': 450},
        {'x': 600, 'y': 750}, {'x': 600, 'y': 890}
    ]

    for sp in sidewalk_poles:
        obstacles.append({
            'type': 'street_light',
            'x': sp['x'],
            'y': sp['y'],
            'radius': 10,
            'glowRadius': 80
        })

    # 4 Major Intersections Traffic Lights:
    # Int 1: (380, 380), Int 2: (820, 380), Int 3: (380, 820), Int 4: (820, 820)
    traffic_lights = [
        # Intersection 1 (NW)
        TrafficLight('TL_1_NS', 380, 380, direction='NS'),
        TrafficLight('TL_1_EW', 380, 380, direction='EW'),
        # Intersection 2 (NE)
        TrafficLight('TL_2_NS', 820, 380, direction='NS'),
        TrafficLight('TL_2_EW', 820, 380, direction='EW'),
        # Intersection 3 (SW)
        TrafficLight('TL_3_NS', 380, 820, direction='NS'),
        TrafficLight('TL_3_EW', 380, 820, direction='EW'),
        # Intersection 4 (SE)
        TrafficLight('TL_4_NS', 820, 820, direction='NS'),
        TrafficLight('TL_4_EW', 820, 820, direction='EW')
    ]

    # Destination Points
    destinations = [
        {'id': 'downtown', 'name': 'City Central Plaza', 'x': 820, 'y': 160, 'radius': 52},
        {'id': 'terminal', 'name': 'Airport Terminal', 'x': 1080, 'y': 380, 'radius': 52},
        {'id': 'harbor', 'name': 'South Harbor Docks', 'x': 820, 'y': 1060, 'radius': 52},
        {'id': 'tech_park', 'name': 'West Tech Campus', 'x': 120, 'y': 820, 'radius': 52}
    ]

    # Primary navigation route (Spawn at South Boulevard, travel to North Downtown Plaza)
    spawn_point = {'x': 380, 'y': 1110, 'angle': 0.0}
    primary_destination = destinations[0]

    # Route waypoints guiding AI cars through city lanes
    waypoints = [
        {'x': 380, 'y': 850, 'name': 'Intersection South-West'},
        {'x': 380, 'y': 600, 'name': 'West Boulevard Mid'},
        {'x': 380, 'y': 380, 'name': 'Intersection North-West'},
        {'x': 600, 'y': 380, 'name': 'North Avenue Bridge'},
        {'x': 820, 'y': 380, 'name': 'Intersection North-East'},
        {'x': 820, 'y': 160, 'name': 'City Central Plaza Terminal'}
    ]

    return {
        'name': 'city',
        'title': 'Metro City Grid',
        'description': 'Full-scale urban grid with multi-lane avenues, traffic lights, and building blocks.',
        'width': width,
        'height': height,
        'spawnPoint': spawn_point,
        'target': primary_destination,
        'destinations': destinations,
        'waypoints': waypoints,
        'roadBorders': borders,
        'blocks': blocks,
        'obstacles': obstacles,
        'trafficLights': traffic_lights
    }
