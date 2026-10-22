/**
 * NEURON - Artificial Neural Network & Neuroevolution Engine
 * Feedforward Multi-Layer Perceptron with customizable layers,
 * activation functions, weights mutation, and genetic crossover.
 */

class NeuralNetwork {
    /**
     * @param {number[]} layerSizes Array of neuron counts per layer, e.g. [8, 8, 4]
     */
    constructor(layerSizes) {
        this.layerSizes = layerSizes;
        this.levels = [];

        for (let i = 0; i < layerSizes.length - 1; i++) {
            this.levels.push(new Level(layerSizes[i], layerSizes[i + 1]));
        }
    }

    /**
     * Forward propagate inputs through all levels
     * @param {number[]} givenInputs 
     * @returns {number[]} outputs
     */
    feedForward(givenInputs) {
        let outputs = Level.feedForward(givenInputs, this.levels[0]);
        for (let i = 1; i < this.levels.length; i++) {
            outputs = Level.feedForward(outputs, this.levels[i]);
        }
        return outputs;
    }

    /**
     * Deep clone this network
     * @returns {NeuralNetwork}
     */
    clone() {
        const copy = new NeuralNetwork(this.layerSizes);
        for (let i = 0; i < this.levels.length; i++) {
            for (let j = 0; j < this.levels[i].biases.length; j++) {
                copy.levels[i].biases[j] = this.levels[i].biases[j];
            }
            for (let j = 0; j < this.levels[i].weights.length; j++) {
                for (let k = 0; k < this.levels[i].weights[j].length; k++) {
                    copy.levels[i].weights[j][k] = this.levels[i].weights[j][k];
                }
            }
        }
        return copy;
    }

    /**
     * Mutate network weights and biases
     * @param {number} rate Probability (0 to 1) of mutating a weight
     * @param {number} amount Maximum mutation magnitude (e.g. 0.2 to 1.0)
     */
    mutate(rate = 0.1, amount = 0.5) {
        this.levels.forEach(level => {
            for (let i = 0; i < level.biases.length; i++) {
                if (Math.random() < rate) {
                    level.biases[i] += (Math.random() * 2 - 1) * amount;
                    // Clamp to [-1, 1]
                    level.biases[i] = Math.max(-1, Math.min(1, level.biases[i]));
                }
            }
            for (let i = 0; i < level.weights.length; i++) {
                for (let j = 0; j < level.weights[i].length; j++) {
                    if (Math.random() < rate) {
                        level.weights[i][j] += (Math.random() * 2 - 1) * amount;
                        level.weights[i][j] = Math.max(-1, Math.min(1, level.weights[i][j]));
                    }
                }
            }
        });
    }

    /**
     * Genetic Crossover between two parent networks
     * @param {NeuralNetwork} parentA 
     * @param {NeuralNetwork} parentB 
     * @returns {NeuralNetwork} child
     */
    static crossover(parentA, parentB) {
        const child = new NeuralNetwork(parentA.layerSizes);
        for (let i = 0; i < child.levels.length; i++) {
            const levelA = parentA.levels[i];
            const levelB = parentB.levels[i];
            const childLevel = child.levels[i];

            for (let j = 0; j < childLevel.biases.length; j++) {
                childLevel.biases[j] = Math.random() < 0.5 ? levelA.biases[j] : levelB.biases[j];
            }

            for (let j = 0; j < childLevel.weights.length; j++) {
                for (let k = 0; k < childLevel.weights[j].length; k++) {
                    childLevel.weights[j][k] = Math.random() < 0.5 
                        ? levelA.weights[j][k] 
                        : levelB.weights[j][k];
                }
            }
        }
        return child;
    }

    /**
     * Export network to plain JSON-serializable object
     */
    toJSON() {
        return {
            layerSizes: this.layerSizes,
            levels: this.levels.map(l => ({
                inputsCount: l.inputs.length,
                outputsCount: l.outputs.length,
                biases: Array.from(l.biases),
                weights: l.weights.map(row => Array.from(row))
            }))
        };
    }

    /**
     * Load network from JSON data
     */
    static fromJSON(data) {
        if (!data || !data.layerSizes || !data.levels) return null;
        const net = new NeuralNetwork(data.layerSizes);
        for (let i = 0; i < data.levels.length; i++) {
            const srcLevel = data.levels[i];
            net.levels[i].biases = [...srcLevel.biases];
            net.levels[i].weights = srcLevel.weights.map(row => [...row]);
        }
        return net;
    }
}

class Level {
    constructor(inputCount, outputCount) {
        this.inputs = new Array(inputCount);
        this.outputs = new Array(outputCount);
        this.biases = new Array(outputCount);

        this.weights = [];
        for (let i = 0; i < inputCount; i++) {
            this.weights[i] = new Array(outputCount);
        }

        Level.#randomize(this);
    }

    static #randomize(level) {
        for (let i = 0; i < level.inputs.length; i++) {
            for (let j = 0; j < level.outputs.length; j++) {
                level.weights[i][j] = Math.random() * 2 - 1;
            }
        }
        for (let i = 0; i < level.biases.length; i++) {
            level.biases[i] = Math.random() * 2 - 1;
        }
    }

    static feedForward(givenInputs, level) {
        for (let i = 0; i < level.inputs.length; i++) {
            level.inputs[i] = givenInputs[i] || 0;
        }

        for (let i = 0; i < level.outputs.length; i++) {
            let sum = 0;
            for (let j = 0; j < level.inputs.length; j++) {
                sum += level.inputs[j] * level.weights[j][i];
            }
            sum += level.biases[i];

            // Tanh activation function (-1 to 1)
            level.outputs[i] = Math.tanh(sum);
        }

        return level.outputs;
    }
}
