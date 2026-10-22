/**
 * NEURON - Autonomous Cyber Vehicle Physics & AI Agent
 */

class Car {
    constructor(x, y, width = 22, height = 40, controlType = "AI", maxSpeed = 4.2) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.22;
        this.maxSpeed = maxSpeed;
        this.friction = 0.045;
        this.angle = 0;
        this.damaged = false;
        this.parked = false;

        this.fitness = 0;
        this.maxProgress = 0;
        this.stalledTime = 0;
        this.spinAccumulator = 0;
        this.lifetime = 0;
        this.checkpointsPassed = new Set();

        this.controlType = controlType;
        this.useBrain = controlType === "AI";

        this.controls = {
            forward: false,
            left: false,
            right: false,
            reverse: false
        };

        if (this.useBrain) {
            this.sensor = new Sensor(this, { rayCount: 7, rayLength: 230 });
            // Inputs: 7 sensor rays + speed + angleToTarget + distanceToTarget = 10 inputs
            // Hidden: [12, 8]
            // Outputs: [forward, reverse, left, right] = 4 outputs
            this.brain = new NeuralNetwork([10, 12, 8, 4]);
        }

        this.polygon = this.#createPolygon();
        this.trail = [];
    }

    reset(x = this.startX, y = this.startY, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 0;
        this.damaged = false;
        this.parked = false;
        this.fitness = 0;
        this.maxProgress = 0;
        this.stalledTime = 0;
        this.spinAccumulator = 0;
        this.lifetime = 0;
        this.checkpointsPassed.clear();
        this.trail = [];
        this.polygon = this.#createPolygon();
    }

    update(roadBorders, obstacles, target, checkpoints = [], deltaTime = 1) {
        if (this.damaged || this.parked) return;

        this.lifetime += deltaTime;

        // Drive controls
        if (this.sensor) {
            this.sensor.update(roadBorders, obstacles);
            if (this.useBrain) {
                const inputs = this.#generateInputs(target);
                const outputs = this.brain.feedForward(inputs);

                this.controls.forward = outputs[0] > 0.05;
                this.controls.reverse = outputs[1] > 0.2;
                this.controls.left = outputs[2] > 0.15;
                this.controls.right = outputs[3] > 0.15;
            }
        }

        this.#move();
        this.polygon = this.#createPolygon();

        // Check for collisions
        this.damaged = this.#assessDamage(roadBorders, obstacles);

        // Check for target parking lot arrival
        if (!this.damaged && target) {
            this.#checkParkingArrival(target);
        }

        // Check checkpoints along track
        if (!this.damaged && checkpoints && checkpoints.length > 0) {
            this.#checkCheckpoints(checkpoints);
        }

        // Calculate fitness
        this.#evaluateFitness(target);

        // Save trail for visual telemetry (only every few ticks)
        if (this.lifetime % 4 < 1 && this.trail.length < 50) {
            this.trail.push({ x: this.x, y: this.y });
        }

        // Anti-stalling check: kill car if motionless for > 150 frames (~2.5 sec)
        if (Math.abs(this.speed) < 0.2) {
            this.stalledTime += deltaTime;
            if (this.stalledTime > 160 && this.lifetime > 90) {
                this.damaged = true;
            }
        } else {
            this.stalledTime = Math.max(0, this.stalledTime - deltaTime * 0.5);
        }
    }

    #generateInputs(target) {
        // Sensor rays (0 when open, 1 when colliding)
        const sensorInputs = this.sensor.readings.map(s => (s == null ? 0 : 1 - s.offset));

        // Normalized current speed (-1 to 1)
        const speedNorm = this.speed / this.maxSpeed;

        // Angle towards target parking lot
        let angleToTarget = 0;
        let distanceNorm = 1;
        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const targetAngle = Math.atan2(dx, -dy); // 0 is UP
            let angleDiff = targetAngle - this.angle;
            
            // Normalize angleDiff to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            angleToTarget = angleDiff / Math.PI; // Normalized to [-1, 1]

            const dist = Math.hypot(dx, dy);
            distanceNorm = Math.min(1, dist / 1200);
        }

        return [...sensorInputs, speedNorm, angleToTarget, distanceNorm];
    }

    #assessDamage(roadBorders, obstacles) {
        // Road borders
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }

        // Obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.type === 'street_light' || obs.type === 'circle') {
                if (circleIntersectsPolygon(obs.x, obs.y, obs.radius || 14, this.polygon)) {
                    return true;
                }
            } else if (obs.type === 'barrier' || obs.type === 'rect') {
                const poly = obs.polygon || getRectPolygon(obs);
                if (polysIntersect(this.polygon, poly)) {
                    return true;
                }
            }
        }
        return false;
    }

    #checkParkingArrival(target) {
        // Target is either a polygon (parking bay) or a circle
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        const radius = target.radius || 42;

        if (dist <= radius) {
            // Reached parking lot!
            this.parked = true;
            this.speed = 0;
        }
    }

    #checkCheckpoints(checkpoints) {
        for (let i = 0; i < checkpoints.length; i++) {
            if (!this.checkpointsPassed.has(i)) {
                const cp = checkpoints[i];
                if (Math.hypot(cp.x - this.x, cp.y - this.y) < (cp.radius || 50)) {
                    this.checkpointsPassed.add(i);
                }
            }
        }
    }

    #evaluateFitness(target) {
        if (!target) return;

        const initialDist = Math.hypot(target.x - this.startX, target.y - this.startY);
        const currentDist = Math.hypot(target.x - this.x, target.y - this.y);
        
        // Reward for closing distance to parking lot
        const distanceProgress = Math.max(0, initialDist - currentDist);
        this.maxProgress = Math.max(this.maxProgress, distanceProgress);

        let score = this.maxProgress * 2.2;

        // Checkpoint rewards
        score += this.checkpointsPassed.size * 350;

        // Bonus for staying alive & moving forward
        if (!this.damaged && this.speed > 0.5) {
            score += this.lifetime * 0.15;
        }

        // Stalling penalty
        if (this.stalledTime > 30) {
            score -= (this.stalledTime - 30) * 0.8;
        }

        // Collision penalty
        if (this.damaged) {
            score *= 0.85; // 15% penalty on crash
        }

        // Parking lot jackpot bonus
        if (this.parked) {
            score += 3500;
            // Additional speed/efficiency bonus
            score += Math.max(0, 1000 - this.lifetime * 2);
        }

        this.fitness = Math.max(0, score);
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y + Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y + Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y + Math.cos(Math.PI + this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y + Math.cos(Math.PI + this.angle + alpha) * rad
        });

        return points;
    }

    #move() {
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }

        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }

        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }

        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            const turnRate = 0.038;
            if (this.controls.left) {
                this.angle += turnRate * flip;
            }
            if (this.controls.right) {
                this.angle -= turnRate * flip;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, isLeader = false, isBestOfAllTime = false) {
        if (!this.polygon || this.polygon.length === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);

        // Alpha based on status
        let alpha = 0.25;
        if (isLeader) alpha = 1.0;
        else if (this.parked) alpha = 0.95;
        else if (this.damaged) alpha = 0.12;

        ctx.globalAlpha = alpha;

        const w = this.width;
        const h = this.height;
        const steer = this.steeringAngle || 0;

        // -------------------------------------------------------------
        // Draw 4 Physical Wheels (Front Wheels Turn with Ackermann Steering)
        // -------------------------------------------------------------
        const wheelW = 5;
        const wheelH = 11;
        const frontY = -h * 0.30;
        const rearY = h * 0.30;
        const leftX = -w / 2 - 1.5;
        const rightX = w / 2 + 1.5;

        ctx.fillStyle = isLeader ? "#ffffff" : "#444444";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;

        // 1. Rear-Left Wheel (Fixed)
        ctx.save();
        ctx.translate(leftX, rearY);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // 2. Rear-Right Wheel (Fixed)
        ctx.save();
        ctx.translate(rightX, rearY);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // 3. Front-Left Wheel (Physically turns with steering angle!)
        ctx.save();
        ctx.translate(leftX, frontY);
        ctx.rotate(steer);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // 4. Front-Right Wheel (Physically turns with steering angle!)
        ctx.save();
        ctx.translate(rightX, frontY);
        ctx.rotate(steer);
        ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.strokeRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        ctx.restore();

        // High contrast monochrome car styling (Sharp Non-AI Slop)
        if (this.parked) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
        } else if (isLeader) {
            // Champion / Leader car: Solid white body with crisp black windshield
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else if (this.damaged) {
            ctx.fillStyle = "#181818";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else {
            // Living population cars: Dark tactical gray with sharp border
            ctx.fillStyle = "#222222";
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 1;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        // Windshield (Front is -h/2)
        ctx.fillStyle = isLeader ? "#0a0a0a" : "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(-w * 0.35, -h * 0.28, w * 0.7, h * 0.22);

        // Rear window
        ctx.fillStyle = isLeader ? "#1a1a1a" : "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(-w * 0.32, h * 0.14, w * 0.64, h * 0.14);

        // Headlights (Front is -h/2)
        ctx.fillStyle = isLeader ? "#ffffff" : "rgba(255, 255, 255, 0.6)";
        ctx.fillRect(-w * 0.45, -h * 0.48, 4, 3);
        ctx.fillRect(w * 0.45 - 4, -h * 0.48, 4, 3);

        // Headlight Beams (Tactical projection for leader)
        if (isLeader && !this.damaged) {
            const beamGrad = ctx.createLinearGradient(0, -h * 0.5, 0, -h * 2.5);
            beamGrad.addColorStop(0, "rgba(255, 255, 255, 0.3)");
            beamGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(-w * 0.4, -h * 0.5);
            ctx.lineTo(-w * 1.3, -h * 2.5);
            ctx.lineTo(w * 1.3, -h * 2.5);
            ctx.lineTo(w * 0.4, -h * 0.5);
            ctx.closePath();
            ctx.fill();
        }

        // Taillights (Rear is +h/2)
        ctx.fillStyle = this.controls.reverse ? "#ffffff" : "#666666";
        ctx.fillRect(-w * 0.42, h * 0.45, 4, 2);
        ctx.fillRect(w * 0.42 - 4, h * 0.45, 4, 2);

        // Leader Marker: Crisp technical center indicator
        if (isLeader && !this.damaged) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(-2, -2, 4, 4);
        }

        ctx.restore();
    }
}

// Canvas rounded rectangle helper
function roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

// Polygon intersection math (Separating Axis Theorem / segment intersection)
function polysIntersect(poly1, poly2) {
    if (!poly1 || !poly2 || poly1.length < 2 || poly2.length < 2) return false;

    // Line segment checks
    for (let i = 0; i < poly1.length; i++) {
        for (let j = 0; j < poly2.length; j++) {
            const touch = getIntersection(
                poly1[i],
                poly1[(i + 1) % poly1.length],
                poly2[j],
                poly2[(j + 1) % poly2.length]
            );
            if (touch) return true;
        }
    }
    return false;
}

function circleIntersectsPolygon(cx, cy, radius, polygon) {
    if (!polygon || polygon.length === 0) return false;

    // Check if circle center is inside polygon
    if (pointInPolygon({ x: cx, y: cy }, polygon)) return true;

    // Check distance from circle center to each polygon edge
    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const distSq = distToSegmentSquared({ x: cx, y: cy }, p1, p2);
        if (distSq <= radius * radius) {
            return true;
        }
    }
    return false;
}

function distToSegmentSquared(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
}

function pointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
