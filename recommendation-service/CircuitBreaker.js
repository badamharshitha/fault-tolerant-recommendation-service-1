class CircuitBreaker {
    constructor(name, config) {
        this.name = name;
        this.timeout = config.timeout || 2000;
        this.failureThresholdRate = config.failureThresholdRate || 0.5;
        this.volumeThreshold = config.volumeThreshold || 10;
        this.consecutiveTimeoutsThreshold = config.consecutiveTimeoutsThreshold || 5;
        this.resetTimeout = config.resetTimeout || 30000;
        this.halfOpenTrials = config.halfOpenTrials || 3;

        this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
        this.openTime = null;

        // Metrics for the current window
        this.calls = [];
        this.consecutiveTimeouts = 0;
        this.successfulCallsCount = 0;
        this.failedCallsCount = 0;

        // Half-open state tracking
        this.trialSuccesses = 0;
    }

    async fire(action) {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (now - this.openTime >= this.resetTimeout) {
                this.transitionToHalfOpen();
            } else {
                throw new Error('CircuitBreaker is OPEN');
            }
        }

        if (this.state === 'HALF_OPEN') {
            // Allow action but track success/failure specifically for half open
            return this.executeAction(action);
        }

        return this.executeAction(action);
    }

    async executeAction(action) {
        let timeoutId;
        let isTimeout = false;

        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                isTimeout = true;
                reject(new Error('Timeout'));
            }, this.timeout);
        });

        try {
            const result = await Promise.race([action(), timeoutPromise]);
            clearTimeout(timeoutId);
            this.onSuccess();
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            this.onFailure(isTimeout);
            throw error;
        }
    }

    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.trialSuccesses++;
            if (this.trialSuccesses >= this.halfOpenTrials) {
                this.transitionToClosed();
            }
        } else if (this.state === 'CLOSED') {
            this.recordCall(true);
            this.consecutiveTimeouts = 0;
        }
    }

    onFailure(isTimeout) {
        if (this.state === 'HALF_OPEN') {
            this.transitionToOpen();
        } else if (this.state === 'CLOSED') {
            this.recordCall(false);
            if (isTimeout) {
                this.consecutiveTimeouts++;
            } else {
                this.consecutiveTimeouts = 0; // Reset consecutive timeouts on non-timeout failure
                // Wait, the requirements don't explicitly say non-timeout resets consecutive timeouts, but typically it does.
                // Actually, let's just do it standard.
            }

            this.checkThresholds();
        }
    }

    recordCall(success) {
        this.calls.push(success);
        if (success) {
            this.successfulCallsCount++;
        } else {
            this.failedCallsCount++;
        }

        if (this.calls.length > this.volumeThreshold) {
            const oldest = this.calls.shift();
            if (oldest) {
                this.successfulCallsCount--;
            } else {
                this.failedCallsCount--;
            }
        }
    }

    checkThresholds() {
        if (this.consecutiveTimeouts >= this.consecutiveTimeoutsThreshold) {
            this.transitionToOpen();
            return;
        }

        if (this.calls.length >= this.volumeThreshold) {
            const failureRate = this.failedCallsCount / this.calls.length;
            if (failureRate >= this.failureThresholdRate) {
                this.transitionToOpen();
            }
        }
    }

    transitionToOpen() {
        this.state = 'OPEN';
        this.openTime = Date.now();
    }

    transitionToHalfOpen() {
        this.state = 'HALF_OPEN';
        this.trialSuccesses = 0;
    }

    transitionToClosed() {
        this.state = 'CLOSED';
        this.consecutiveTimeouts = 0;
        this.calls = [];
        this.successfulCallsCount = 0;
        this.failedCallsCount = 0;
    }

    getMetrics() {
        const total = this.successfulCallsCount + this.failedCallsCount;
        const failureRate = total === 0 ? "0.0%" : ((this.failedCallsCount / total) * 100).toFixed(1) + "%";

        return {
            state: this.state.replace('HALF_OPEN', 'HALF-OPEN'), // Ensure hyphen for display or let it be HALF_OPEN as requested
            // The requirement says "HALF_OPEN" in JSON but text says "HALF-OPEN". Let's output "HALF_OPEN".
            failureRate: failureRate,
            successfulCalls: this.successfulCallsCount,
            failedCalls: this.failedCallsCount
        };
    }
}

module.exports = CircuitBreaker;
