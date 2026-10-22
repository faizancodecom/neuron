/**
 * NEURON - Genetic Algorithm & Population Evolution Manager
 */

class GeneticAlgorithm {
    constructor(mapSystem, options = {}) {
        this.map = mapSystem;
        this.populationSize = options.populationSize || 100;
        this.mutationRate = options.mutationRate || 0.12;
        this.mutationAmount = options.mutationAmount || 0.45;
        this.episodeDuration = options.episodeDuration || 28; // seconds
        this.timeLapse = 1; // 1x, 2x, 5x, 10x, 20x, 40x
        this.isRunning = false;

        this.generation = 1;
        this.elapsedTime = 0;
        this.cars = [];
        this.bestCar = null;
        this.championBrain = null;
        this.championFitness = 0;

        this.fitnessHistory = [];
        this.totalParked = 0;

        this.#initPopulation();
    }

    #initPopulation() {
        this.cars = [];
        const spawn = this.map.spawnPoint;

        for (let i = 0; i < this.populationSize; i++) {
            const car = new Car(spawn.x, spawn.y);
            car.angle = spawn.angle || 0;
            this.cars.push(car);
        }

        this.bestCar = this.cars[0];
    }

    setPopulationSize(newSize) {
        if (newSize === this.populationSize) return;
        this.populationSize = newSize;
        this.nextGeneration(false);
    }

    updateConfig(opts) {
        if (opts.mutationRate !== undefined) this.mutationRate = opts.mutationRate;
        if (opts.mutationAmount !== undefined) this.mutationAmount = opts.mutationAmount;
        if (opts.episodeDuration !== undefined) this.episodeDuration = opts.episodeDuration;
        if (opts.timeLapse !== undefined) this.timeLapse = opts.timeLapse;
        if (opts.rayCount !== undefined) {
            this.cars.forEach(c => {
                if (c.sensor) c.sensor.updateConfig(opts.rayCount);
            });
        }
    }

    step(deltaTime = 1) {
        if (!this.isRunning) return;

        this.elapsedTime += deltaTime / 60;

        let aliveCount = 0;
        let parkedCount = 0;

        // Update each car
        for (let i = 0; i < this.cars.length; i++) {
            const car = this.cars[i];
            car.update(
                this.map.roadBorders,
                this.map.obstacles,
                this.map.target,
                this.map.checkpoints,
                deltaTime
            );

            if (!car.damaged && !car.parked) {
                aliveCount++;
            }
            if (car.parked) {
                parkedCount++;
            }
        }

        // Find current best car in population
        let currentBest = this.cars[0];
        for (let i = 1; i < this.cars.length; i++) {
            if (this.cars[i].fitness > currentBest.fitness) {
                currentBest = this.cars[i];
            }
        }
        this.bestCar = currentBest;

        // Auto-evolve trigger: all cars finished (crashed or parked) OR episode timeout
        const timeoutReached = this.elapsedTime >= this.episodeDuration;
        const allFinished = aliveCount === 0;

        if (allFinished || timeoutReached) {
            this.nextGeneration(true);
        }
    }

    nextGeneration(recordStats = true) {
        // 1. Sort cars descending by fitness
        this.cars.sort((a, b) => b.fitness - a.fitness);
        const topPerformer = this.cars[0];

        // 2. Record statistics
        if (recordStats && topPerformer) {
            const sumFit = this.cars.reduce((acc, c) => acc + c.fitness, 0);
            const avgFit = sumFit / this.cars.length;
            const parkedThisGen = this.cars.filter(c => c.parked).length;
            this.totalParked += parkedThisGen;

            if (topPerformer.fitness > this.championFitness) {
                this.championFitness = topPerformer.fitness;
                this.championBrain = topPerformer.brain.clone();
            }

            this.fitnessHistory.push({
                generation: this.generation,
                bestFitness: Math.round(topPerformer.fitness),
                avgFitness: Math.round(avgFit),
                parkedCount: parkedThisGen
            });

            // Keep history trimmed to last 40 gens
            if (this.fitnessHistory.length > 50) {
                this.fitnessHistory.shift();
            }
        }

        // 3. Selection & Reproduction
        const newCars = [];
        const spawn = this.map.spawnPoint;

        // Elitism: Preserve the top 1 or 2 performers completely unchanged
        const eliteCount = Math.min(2, Math.floor(this.populationSize * 0.05) || 1);
        for (let i = 0; i < eliteCount; i++) {
            const elite = new Car(spawn.x, spawn.y);
            elite.angle = spawn.angle || 0;
            if (this.cars[i] && this.cars[i].brain) {
                elite.brain = this.cars[i].brain.clone();
            }
            newCars.push(elite);
        }

        // Top 20% pool for breeding
        const poolSize = Math.max(2, Math.floor(this.cars.length * 0.22));
        const parentPool = this.cars.slice(0, poolSize);

        // Fill remaining population with mutated / crossover offspring
        while (newCars.length < this.populationSize) {
            const child = new Car(spawn.x, spawn.y);
            child.angle = spawn.angle || 0;

            const parentA = parentPool[Math.floor(Math.random() * parentPool.length)];
            const parentB = parentPool[Math.floor(Math.random() * parentPool.length)];

            if (Math.random() < 0.35 && parentA !== parentB) {
                // Crossover
                child.brain = NeuralNetwork.crossover(parentA.brain, parentB.brain);
            } else {
                // Clone from parent
                child.brain = parentA.brain.clone();
            }

            // Mutate brain
            child.brain.mutate(this.mutationRate, this.mutationAmount);
            newCars.push(child);
        }

        this.cars = newCars;
        this.bestCar = this.cars[0];
        this.generation++;
        this.elapsedTime = 0;
    }

    reset() {
        this.generation = 1;
        this.elapsedTime = 0;
        this.championFitness = 0;
        this.championBrain = null;
        this.fitnessHistory = [];
        this.totalParked = 0;
        this.#initPopulation();
    }

    applyTrainedBrain(brain) {
        if (!brain) return;
        const spawn = this.map.spawnPoint;
        this.championBrain = brain.clone();
        this.championFitness = 0;

        for (let i = 0; i < this.cars.length; i++) {
            this.cars[i].reset(spawn.x, spawn.y, spawn.angle || 0);
            this.cars[i].brain = brain.clone();
            if (i > 0) {
                this.cars[i].brain.mutate(this.mutationRate * 0.8, this.mutationAmount * 0.8);
            }
        }
        this.bestCar = this.cars[0];
        this.elapsedTime = 0;
    }

    getStats() {
        const alive = this.cars.filter(c => !c.damaged && !c.parked).length;
        const parked = this.cars.filter(c => c.parked).length;
        const crashed = this.cars.filter(c => c.damaged).length;

        let bestDistanceToTarget = Infinity;
        if (this.map.target && this.bestCar) {
            bestDistanceToTarget = Math.round(
                Math.hypot(this.map.target.x - this.bestCar.x, this.map.target.y - this.bestCar.y)
            );
        }

        return {
            generation: this.generation,
            alive,
            parked,
            crashed,
            total: this.cars.length,
            bestFitness: this.bestCar ? Math.round(this.bestCar.fitness) : 0,
            championFitness: Math.round(this.championFitness),
            distanceToTarget: bestDistanceToTarget,
            timeRemaining: Math.max(0, Math.ceil(this.episodeDuration - this.elapsedTime)),
            totalParkedEver: this.totalParked
        };
    }
}
