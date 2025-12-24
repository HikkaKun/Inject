import { expect, test } from 'vitest'
import { Container, injectClass, injectMethod, injectProperty } from '../assets/inject';

const TypeA = 'TypeA';
const TypeB = 'TypeB';
const TypeC = 'TypeC';

test('Test basic resolving', () => {
  const container = new Container();
  const instance = {};
  container.registerInstance(instance, TypeA);

  expect(container.resolve(TypeA)).toBe(instance);
});

test('Test parent resolving', () => {
  const parent = new Container();
  const child = new Container(parent);

  parent.register(TypeA, () => ({}));

  expect(child.resolve(TypeA)).toBeDefined();
});

test('Test Transient objects', () => {
  const container = new Container();

  container.register(TypeA, () => ({}), Container.Scope.TRANSIENT);

  const a = container.resolve(TypeA);
  const b = container.resolve(TypeA);

  expect(a === b).toBe(false);
});

test('Test Scoped objects', () => {
  const parent = new Container();
  const child = new Container(parent);

  parent.register(TypeA, () => ({}), Container.Scope.SCOPED);

  const a = child.resolve(TypeA);
  const c = child.resolve(TypeA);
  const b = parent.resolve(TypeA);

  expect(a).toBeDefined();
  expect(b).toBeDefined();
  expect(a === c).toBe(true);
  expect(a === b).toBe(false);
});

test('Test Singleton objects', () => {
  const parent = new Container();
  const child = new Container(parent);

  parent.register(TypeA, () => ({}), Container.Scope.SINGLETON);

  const a = child.resolve(TypeA);
  const b = parent.resolve(TypeA);

  expect(a).toBeDefined();
  expect(a === b).toBe(true);
});

test('Test basic injection', () => {
  const container = new Container();

  container.register(TypeA, () => TypeA);
  container.register(TypeB, () => TypeB);
  container.register(TypeC, () => TypeC);

  @injectClass(TypeA)
  class TestClass {
    public typeA: string;

    @injectProperty(TypeB)
    public typeB!: string;

    public typeC!: string;

    constructor(typeA: string) {
      this.typeA = typeA;
    }

    @injectMethod(TypeC)
    public init(typeC: string) {
      this.typeC = typeC;
    }
  };

  container.register(TestClass, (container) => container.createClass(TestClass));

  const instance = container.resolve<TestClass>(TestClass)!;

  expect(instance.typeA).toBe(TypeA);
  expect(instance.typeB).toBe(TypeB);
  expect(instance.typeC).toBe(TypeC);
});
