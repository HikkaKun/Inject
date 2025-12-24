import { expect, describe, test } from 'vitest'
import { Container } from '../assets/inject';

const TypeA = 'TypeA';
const TypeB = 'TypeB';
const TypeC = 'TypeC';

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