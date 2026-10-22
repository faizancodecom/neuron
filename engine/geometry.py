"""
Geometry and collision mathematics for 2D autonomous vehicle simulation.
Matches exact mathematical formulas from sensor.js.
"""

import math


def lerp(A, B, t):
    return A + (B - A) * t


def get_intersection(A, B, C, D):
    """
    Checks line-segment intersection between AB and CD.
    Returns dict {'x': ..., 'y': ..., 'offset': t} or None.
    """
    t_top = (D['x'] - C['x']) * (A['y'] - C['y']) - (D['y'] - C['y']) * (A['x'] - C['x'])
    u_top = (C['y'] - A['y']) * (A['x'] - B['x']) - (C['x'] - A['x']) * (A['y'] - B['y'])
    bottom = (D['y'] - C['y']) * (B['x'] - A['x']) - (D['x'] - C['x']) * (B['y'] - A['y'])

    if abs(bottom) > 1e-6:
        t = t_top / bottom
        u = u_top / bottom
        if 0.0 <= t <= 1.0 and 0.0 <= u <= 1.0:
            return {
                'x': lerp(A['x'], B['x'], t),
                'y': lerp(A['y'], B['y'], t),
                'offset': t
            }
    return None


def get_ray_circle_intersection(ray_start, ray_end, circle_center, radius):
    dx = ray_end['x'] - ray_start['x']
    dy = ray_end['y'] - ray_start['y']
    fx = ray_start['x'] - circle_center['x']
    fy = ray_start['y'] - circle_center['y']

    a = dx * dx + dy * dy
    b = 2.0 * (fx * dx + fy * dy)
    c = (fx * fx + fy * fy) - radius * radius

    if a < 1e-9:
        return None

    discriminant = b * b - 4.0 * a * c
    if discriminant >= 0:
        sqrt_disc = math.sqrt(discriminant)
        t1 = (-b - sqrt_disc) / (2.0 * a)
        t2 = (-b + sqrt_disc) / (2.0 * a)

        t = None
        if 0.0 <= t1 <= 1.0:
            t = t1
        elif 0.0 <= t2 <= 1.0:
            t = t2

        if t is not None:
            return {
                'x': ray_start['x'] + t * dx,
                'y': ray_start['y'] + t * dy,
                'offset': t
            }
    return None


def get_rect_polygon(x, y, width, height, angle=0.0):
    w = width / 2.0
    h = height / 2.0
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)

    corners = [
        (-w, -h),
        (w, -h),
        (w, h),
        (-w, h)
    ]

    return [
        {
            'x': x + (cx * cos_a - cy * sin_a),
            'y': y + (cx * sin_a + cy * cos_a)
        }
        for cx, cy in corners
    ]


def polys_intersect(poly1, poly2):
    if not poly1 or not poly2 or len(poly1) < 2 or len(poly2) < 2:
        return False

    n1 = len(poly1)
    # If poly2 is a line segment (len == 2), test segment (0, 1) once
    if len(poly2) == 2:
        for i in range(n1):
            touch = get_intersection(
                poly1[i],
                poly1[(i + 1) % n1],
                poly2[0],
                poly2[1]
            )
            if touch:
                return True
        return False

    n2 = len(poly2)
    for i in range(n1):
        for j in range(n2):
            touch = get_intersection(
                poly1[i],
                poly1[(i + 1) % n1],
                poly2[j],
                poly2[(j + 1) % n2]
            )
            if touch:
                return True
    return False
