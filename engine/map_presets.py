"""
Map presets and environment track builders in Python.
Includes Metro City Grid with traffic lights, and enclosed track environments.
"""

from .city_map import build_city_map


def get_preset_map(preset_id='city'):
    if preset_id == 'city':
        return build_city_map()
    elif preset_id == 'chicane':
        return _build_chicane()
    elif preset_id == 'maze':
        return _build_maze()
    elif preset_id == 'plaza':
        return _build_plaza()
    elif preset_id == 'boulevard':
        return _build_boulevard()
    else:
        return build_city_map()


def _build_boulevard():
    return {
        'name': 'boulevard',
        'title': 'Downtown Boulevard',
        'description': 'Straight highway with dual sidewalk streetlights and traffic chicanes.',
        'spawnPoint': {'x': 400, 'y': 910, 'angle': 0.0},
        'target': {'x': 400, 'y': 110, 'radius': 46, 'name': 'Downtown Grand Plaza P1'},
        'roadBorders': [
            [{'x': 140, 'y': 950}, {'x': 140, 'y': 60}],
            [{'x': 660, 'y': 950}, {'x': 660, 'y': 60}],
            [{'x': 140, 'y': 950}, {'x': 660, 'y': 950}],
            [{'x': 140, 'y': 60}, {'x': 660, 'y': 60}]
        ],
        'obstacles': [
            {'type': 'street_light', 'x': 180, 'y': 800, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 180, 'y': 600, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 180, 'y': 400, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 180, 'y': 200, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 800, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 600, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 400, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 620, 'y': 200, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 400, 'y': 680, 'radius': 12, 'glowRadius': 115},
            {'type': 'street_light', 'x': 400, 'y': 340, 'radius': 12, 'glowRadius': 115},
            {'type': 'barrier', 'x': 290, 'y': 750, 'width': 130, 'height': 24, 'angle': 0.1},
            {'type': 'barrier', 'x': 510, 'y': 750, 'width': 130, 'height': 24, 'angle': -0.1},
            {'type': 'barrier', 'x': 250, 'y': 500, 'width': 160, 'height': 24, 'angle': 0.0},
            {'type': 'barrier', 'x': 550, 'y': 500, 'width': 160, 'height': 24, 'angle': 0.0},
            {'type': 'barrier', 'x': 240, 'y': 240, 'width': 150, 'height': 24, 'angle': -0.15},
            {'type': 'barrier', 'x': 560, 'y': 240, 'width': 150, 'height': 24, 'angle': 0.15}
        ]
    }


def _build_chicane():
    # Enclosed S-Curve corridor
    return {
        'name': 'chicane',
        'title': 'Neon Highway Chicane',
        'description': 'Winding dual-wall mountain S-curve with chicane barriers.',
        'spawnPoint': {'x': 260, 'y': 920, 'angle': 0.0},
        'target': {'x': 540, 'y': 100, 'radius': 46, 'name': 'Summit Viewpoint Parking'},
        'roadBorders': [
            # Left boundary wall
            [{'x': 180, 'y': 960}, {'x': 180, 'y': 720}],
            [{'x': 180, 'y': 720}, {'x': 320, 'y': 520}],
            [{'x': 320, 'y': 520}, {'x': 320, 'y': 300}],
            [{'x': 320, 'y': 300}, {'x': 440, 'y': 60}],
            # Right boundary wall
            [{'x': 340, 'y': 960}, {'x': 340, 'y': 720}],
            [{'x': 340, 'y': 720}, {'x': 480, 'y': 520}],
            [{'x': 480, 'y': 520}, {'x': 480, 'y': 300}],
            [{'x': 480, 'y': 300}, {'x': 640, 'y': 60}],
            # Top and bottom end caps
            [{'x': 180, 'y': 960}, {'x': 340, 'y': 960}],
            [{'x': 440, 'y': 60}, {'x': 640, 'y': 60}]
        ],
        'obstacles': [
            {'type': 'street_light', 'x': 200, 'y': 840, 'radius': 12, 'glowRadius': 90},
            {'type': 'street_light', 'x': 360, 'y': 620, 'radius': 12, 'glowRadius': 90},
            {'type': 'street_light', 'x': 340, 'y': 420, 'radius': 12, 'glowRadius': 90},
            {'type': 'street_light', 'x': 500, 'y': 220, 'radius': 12, 'glowRadius': 90},
            # Centered chicane barriers with generous clearance
            {'type': 'barrier', 'x': 230, 'y': 760, 'width': 70, 'height': 20, 'angle': 0.0},
            {'type': 'barrier', 'x': 430, 'y': 520, 'width': 70, 'height': 20, 'angle': 0.0},
            {'type': 'barrier', 'x': 370, 'y': 300, 'width': 70, 'height': 20, 'angle': 0.0}
        ]
    }


def _build_maze():
    return {
        'name': 'maze',
        'title': 'Cyber Alley Maze',
        'description': 'Tight 90-degree urban corridor with obstacle dividers.',
        'spawnPoint': {'x': 160, 'y': 900, 'angle': 0.0},
        'target': {'x': 640, 'y': 110, 'radius': 46, 'name': 'Cyber Deck Parking Bay'},
        'roadBorders': [
            [{'x': 80, 'y': 950}, {'x': 80, 'y': 60}],
            [{'x': 720, 'y': 950}, {'x': 720, 'y': 60}],
            [{'x': 80, 'y': 950}, {'x': 720, 'y': 950}],
            [{'x': 80, 'y': 60}, {'x': 720, 'y': 60}]
        ],
        'obstacles': [
            {'type': 'barrier', 'x': 260, 'y': 780, 'width': 220, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 580, 'y': 780, 'width': 140, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 180, 'y': 600, 'width': 150, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 480, 'y': 600, 'width': 220, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 300, 'y': 420, 'width': 240, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 630, 'y': 420, 'width': 120, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 170, 'y': 240, 'width': 140, 'height': 22, 'angle': 0.0},
            {'type': 'barrier', 'x': 460, 'y': 240, 'width': 210, 'height': 22, 'angle': 0.0},
            {'type': 'street_light', 'x': 140, 'y': 700, 'radius': 12, 'glowRadius': 105},
            {'type': 'street_light', 'x': 450, 'y': 700, 'radius': 12, 'glowRadius': 105},
            {'type': 'street_light', 'x': 280, 'y': 510, 'radius': 12, 'glowRadius': 105},
            {'type': 'street_light', 'x': 450, 'y': 330, 'radius': 12, 'glowRadius': 105}
        ]
    }


def _build_plaza():
    return {
        'name': 'plaza',
        'title': 'Multi-Stall Plaza',
        'description': 'Realistic parking lot challenge with parked vehicle obstacles.',
        'spawnPoint': {'x': 400, 'y': 920, 'angle': 0.0},
        'target': {'x': 570, 'y': 260, 'radius': 44, 'name': 'Reserved VIP Parking Bay 04'},
        'roadBorders': [
            [{'x': 100, 'y': 960}, {'x': 100, 'y': 80}],
            [{'x': 700, 'y': 960}, {'x': 700, 'y': 80}],
            [{'x': 100, 'y': 960}, {'x': 700, 'y': 960}],
            [{'x': 100, 'y': 80}, {'x': 700, 'y': 80}]
        ],
        'obstacles': [
            {'type': 'barrier', 'x': 230, 'y': 260, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 340, 'y': 260, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 450, 'y': 260, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 230, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 340, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 450, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 570, 'y': 520, 'width': 26, 'height': 44, 'angle': 0.0, 'isParkedVehicle': True},
            {'type': 'barrier', 'x': 400, 'y': 390, 'width': 380, 'height': 20, 'angle': 0.0},
            {'type': 'barrier', 'x': 400, 'y': 650, 'width': 380, 'height': 20, 'angle': 0.0},
            {'type': 'street_light', 'x': 140, 'y': 800, 'radius': 12, 'glowRadius': 110},
            {'type': 'street_light', 'x': 660, 'y': 800, 'radius': 12, 'glowRadius': 110},
            {'type': 'street_light', 'x': 400, 'y': 130, 'radius': 12, 'glowRadius': 110}
        ]
    }
