import { DEFAULT_CONTAINER_KEY } from './consts';
import { ContainerScope } from './ContainerScope';
import { IDisposable } from './IDisposable';
import { getMetadata } from './InjectMetadata';


export type RegistryType = string | number | symbol | { new(...args: any[]): any };
export type RegistryKey = string | number | symbol;

export type ContainerFactory<T extends any> = (container: Container) => T;

type ContainerFactoryData<T = any> = {
  factory: ContainerFactory<T>;
  scope: ContainerScope;
}

export class Container implements IDisposable {
  public static readonly Scope = ContainerScope;

  private _parent?: Container;
  private _children: Container[] = [];

  private _factories = new Map<any, Record<RegistryKey, ContainerFactoryData>>();
  private _instances = new Map<any, Record<RegistryKey, any>>();

  constructor(parent?: Container) {
    if (!parent) return;

    this._parent = parent;
    parent._children.push(this);
  }

  public registerInstance(instance: any, type: RegistryType, key: RegistryKey = DEFAULT_CONTAINER_KEY): void {
    const record = this._getRecord(this._instances, type);
    if (key in record) {
      this._throwRegisteredError(type, key);
    }

    record[key] = instance;
  }

  public register<T>(
    type: RegistryType,
    factory: ContainerFactory<T>,
    scope = ContainerScope.TRANSIENT,
    key: RegistryKey = DEFAULT_CONTAINER_KEY
  ): void {
    const record = this._getRecord(this._factories, type);
    if (key in record) {
      this._throwRegisteredError(type, key);
    }

    record[key] = {
      factory,
      scope
    };
  }

  public resolve<T>(type: RegistryType, key: RegistryKey = DEFAULT_CONTAINER_KEY, shouldThrowError = true): T | null {
    const instance = this._resolve<T>(type, key, true);
    if (shouldThrowError && instance === null) {
      throw new Error(`Registration with type "${type.toString()}" and key "${key.toString()}" was not found`);
    }

    return instance;
  }

  public instantiateClass<T>(constructor: { new(...args: any[]): T }) {
    const metadata = getMetadata(constructor.prototype, false);
    if (!metadata) return new constructor();

    const args = metadata.constructor.map(({ type, key, shouldThrowError }) => this.resolve<any>(type, key, shouldThrowError));
    return new constructor(...args);
  }

  public inject(target: Object) {
    const metadata = getMetadata(target, false);
    if (!metadata) return;

    const { methods, properties } = metadata;

    for (const propertyKey in properties) {
      const { type, key, shouldThrowError } = properties[propertyKey];
      const result = this.resolve<any>(type, key, shouldThrowError);
      target[propertyKey as keyof typeof target] = result;
    }

    for (const methodKey in methods) {
      const args = methods[methodKey].map(({ type, key, shouldThrowError }) => this.resolve<any>(type, key, shouldThrowError));
      (target[methodKey as keyof typeof target] as Function)(...args);
    }
  }

  public dispose(): void {
    for (const child of this._children) child.dispose();
    this._children.length = 0;

    for (const record of this._instances.values()) {
      for (const value of Object.values(record)) {
        typeof value === 'object' && (value as Partial<IDisposable>).dispose?.();
      }
    }

    this._instances.clear();
    this._factories.clear();

    delete this._parent;
  }

  private _resolve<T>(type: RegistryType, key: RegistryKey, shouldResolveScoped: boolean): T | null {
    const instancesRecord = this._getRecord(this._instances, type);
    if (key in instancesRecord) {
      return instancesRecord[key] as T;
    }

    if (shouldResolveScoped) {
      const result = this._tryResolveScopedOrTransient<T>(type, key);
      if (result) {
        const { factory, scope } = result;
        const instance = this._createInstance(factory);

        if (scope === ContainerScope.SCOPED) {
          this.registerInstance(instance, type, key);
        }

        return instance;
      }
    }

    const factoriesRecord = this._getRecord(this._factories, type);
    if (key in factoriesRecord) {
      const { factory, scope } = factoriesRecord[key];

      switch (scope) {
        case ContainerScope.TRANSIENT:
          return this._createInstance<T>(factory);
        case ContainerScope.SCOPED:
        case ContainerScope.SINGLETON:
          const instance = this._createInstance<T>(factory);
          this.registerInstance(instance, type, key);
          return instance;
      }
    }

    if (this._parent) {
      return this._parent._resolve<T>(type, key, false);
    }

    return null;
  }

  private _tryResolveScopedOrTransient<T>(type: any, key: RegistryKey): { factory: ContainerFactory<T>, scope: ContainerScope } | null {
    const factoriesRecord = this._getRecord(this._factories, type);
    if (key in factoriesRecord) {
      const { factory, scope } = factoriesRecord[key];
      if (scope === ContainerScope.SCOPED || scope === ContainerScope.TRANSIENT) return { factory, scope };
    }

    if (this._parent) {
      return this._parent._tryResolveScopedOrTransient<T>(type, key);
    }

    return null;
  }

  private _createInstance<T>(factory: ContainerFactory<T>): T {
    const instance = factory(this);

    if (typeof instance == 'object' && instance !== null) {
      this.inject(instance);
    }

    return instance;
  }

  private _getRecord<T extends Record<RegistryKey, any>>(map: Map<any, T>, type: any): T {
    let record = map.get(type);
    if (!record) {
      record = Object.create(null) as T;
      map.set(type, record);
    }

    return record;
  }

  private _throwRegisteredError(type: RegistryType, key: RegistryKey): void {
    throw new Error(`Registration with type "${type.toString()}" and key "${key.toString()}" is already registered`);
  }
}