export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export class TestRunner {
  private tests: TestCase[] = [];
  private results: { name: string; passed: boolean; error?: string }[] = [];

  addTest(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async runAll() {
    this.results = [];
    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.push({ name: test.name, passed: true });
        console.log(`✅ Test Passed: ${test.name}`);
      } catch (e: any) {
        this.results.push({ name: test.name, passed: false, error: e.message });
        console.error(`❌ Test Failed: ${test.name}\n${e.message}`);
      }
    }
    return this.results;
  }

  getResults() {
    return this.results;
  }
}

// Simple assertion library
export const assert = {
  equal: (actual: any, expected: any, message?: string) => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  },
  isTrue: (value: boolean, message?: string) => {
    if (value !== true) {
      throw new Error(message || `Expected true but got ${value}`);
    }
  },
  isDefined: (value: any, message?: string) => {
    if (value === undefined || value === null) {
      throw new Error(message || `Expected value to be defined`);
    }
  }
};
