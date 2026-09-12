import math


def build_demo_frame(size: float = 2.3, samples: int = 32):
    half = size / 2.0
    points = []
    for face in range(6):
        for i in range(samples):
            for j in range(samples):
                a = -half + size * i / (samples - 1)
                b = -half + size * j / (samples - 1)
                if face == 0: p = [half, a, b]
                elif face == 1: p = [-half, a, b]
                elif face == 2: p = [a, half, b]
                elif face == 3: p = [a, -half, b]
                elif face == 4: p = [a, b, half]
                else: p = [a, b, -half]
                points.append(p)

    polar = []
    grid = [[None for _ in range(72)] for _ in range(16)]
    for x, y, z in points:
        r = math.hypot(x, z)
        az = (math.degrees(math.atan2(x, z)) + 360.0) % 360.0
        el = math.degrees(math.atan2(y, max(r, 1e-9)))
        polar.append({"azimuth": az, "elevation": el, "range": math.sqrt(x*x+y*y+z*z)})
        ring = min(15, max(0, int((el + 90) / 180 * 16)))
        col = min(71, int(az / 360 * 72))
        old = grid[ring][col]
        d = math.sqrt(x*x+y*y+z*z)
        if old is None or d < old: grid[ring][col] = d

    return {
        "input": {"type": "cube", "size_m": size},
        "points": points,
        "point_count": len(points),
        "rings": 16,
        "horizontal_fov_deg": 360,
        "projection_2d": polar,
        "projection_25d": {"rings": 16, "azimuth_bins": 72, "range_grid": grid},
    }
