/**
 * NEURON - Multi-directional LiDAR Raycast Sensor
 * Detects distance to track walls, concrete barriers, street lights, and obstacles.
 */

class Sensor {
    constructor(car, options = {}) {
        this.car = car;
        this.rayCount = options.rayCount || 7;
        this.rayLength = options.rayLength || 220;
        this.raySpread = options.raySpread || Math.PI * 0.85; // ~153 degrees field of view

        this.rays = [];
        this.readings = [];
    }

    updateConfig(rayCount, rayLength, raySpread) {
        if (rayCount !== undefined) this.rayCount = rayCount;
        if (rayLength !== undefined) this.rayLength = rayLength;
        if (raySpread !== undefined) this.raySpread = raySpread;
    }

    update(roadBorders, obstacles = []) {
        this.#castRays();
        this.readings = [];

        for (let i = 0; i < this.rays.length; i++) {
            this.readings.push(
                this.#getReading(this.rays[i], roadBorders, obstacles)
            );
        }
    }

    #castRays() {
        this.rays = [];
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = lerp(
                this.raySpread / 2,
                -this.raySpread / 2,
                this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1)
            ) + this.car.angle;

            const start = {
                x: this.car.x + Math.sin(this.car.angle) * (this.car.height * 0.45),
                y: this.car.y - Math.cos(this.car.angle) * (this.car.height * 0.45)
            };

            const end = {
                x: start.x - Math.sin(rayAngle) * this.rayLength,
                y: start.y + Math.cos(rayAngle) * this.rayLength
            };

            this.rays.push([start, end]);
        }
    }

    #getReading(ray, roadBorders, obstacles) {
        const touches = [];

        // Check line borders (road edges and line barriers)
        for (let i = 0; i < roadBorders.length; i++) {
            const touch = getIntersection(
                ray[0],
                ray[1],
                roadBorders[i][0],
                roadBorders[i][1]
            );
            if (touch) {
                touches.push(touch);
            }
        }

        // Check circular obstacles (Street light poles)
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.type === 'street_light' || obs.type === 'circle') {
                const circleTouch = getRayCircleIntersection(
                    ray[0],
                    ray[1],
                    { x: obs.x, y: obs.y },
                    obs.radius || 14
                );
                if (circleTouch) {
                    touches.push(circleTouch);
                }
            } else if (obs.type === 'barrier' || obs.type === 'rect') {
                // Check barrier edges
                const poly = obs.polygon || getRectPolygon(obs);
                for (let j = 0; j < poly.length; j++) {
                    const touch = getIntersection(
                        ray[0],
                        ray[1],
                        poly[j],
                        poly[(j + 1) % poly.length]
                    );
                    if (touch) {
                        touches.push(touch);
                    }
                }
            }
        }

        if (touches.length === 0) {
            return null;
        }

        const offsets = touches.map(e => e.offset);
        const minOffset = Math.min(...offsets);
        return touches.find(e => e.offset === minOffset);
    }

    draw(ctx, isLeader = false) {
        if (!this.rays || this.rays.length === 0) return;

        ctx.save();
        for (let i = 0; i < this.rayCount; i++) {
            const ray = this.rays[i];
            let end = ray[1];
            const reading = this.readings[i];

            if (reading) {
                end = reading;
            }

            // Ray segment to hit or full length (Sharp Technical Line)
            ctx.beginPath();
            ctx.lineWidth = isLeader ? 1.5 : 1;
            
            if (reading) {
                const proximity = 1 - reading.offset; // 0 to 1
                if (proximity > 0.7) {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = isLeader ? 2 : 1.2;
                } else {
                    ctx.strokeStyle = isLeader ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.2)";
                }
            } else {
                ctx.strokeStyle = isLeader ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)";
            }

            ctx.moveTo(ray[0].x, ray[0].y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Hit point indicator (Sharp white pip)
            if (reading) {
                ctx.beginPath();
                ctx.arc(reading.x, reading.y, isLeader ? 3 : 2, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();

                if (isLeader && reading.offset < 0.25) {
                    // Close hazard marker
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(reading.x - 4, reading.y - 4, 8, 8);
                }

                // Residual extension beyond hit (subtle ghost line)
                if (isLeader) {
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
                    ctx.setLineDash([2, 4]);
                    ctx.moveTo(end.x, end.y);
                    ctx.lineTo(ray[1].x, ray[1].y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
        ctx.restore();
    }
}

// Math Utility Helpers
function lerp(A, B, t) {
    return A + (B - A) * t;
}

function getIntersection(A, B, C, D) {
    const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
    const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
    const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

    if (Math.abs(bottom) > 0.00001) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            };
        }
    }
    return null;
}

function getRayCircleIntersection(rayStart, rayEnd, circleCenter, radius) {
    const dx = rayEnd.x - rayStart.x;
    const dy = rayEnd.y - rayStart.y;
    const fx = rayStart.x - circleCenter.x;
    const fy = rayStart.y - circleCenter.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);

        let t = null;
        if (t1 >= 0 && t1 <= 1) {
            t = t1;
        } else if (t2 >= 0 && t2 <= 1) {
            t = t2;
        }

        if (t !== null) {
            return {
                x: rayStart.x + t * dx,
                y: rayStart.y + t * dy,
                offset: t
            };
        }
    }
    return null;
}

function getRectPolygon(rect) {
    const w = rect.width / 2;
    const h = rect.height / 2;
    const angle = rect.angle || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const corners = [
        { x: -w, y: -h },
        { x: w, y: -h },
        { x: w, y: h },
        { x: -w, y: h }
    ];

    return corners.map(c => ({
        x: rect.x + (c.x * cos - c.y * sin),
        y: rect.y + (c.x * sin + c.y * cos)
    }));
}
