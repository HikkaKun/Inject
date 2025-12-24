import { RegistryType } from './Container';
import { getMetadata, InjectMetadataValue } from './InjectMetadata';

type InjectArg = RegistryType | InjectMetadataValue;

export function injectProperty(arg: InjectArg) {
    return function (target: Object, propertyKey: string) {
        const metadata = getMetadata(target);
        metadata.properties[propertyKey] = injectArgsToInjectMetadataValue(arg)[0];
    }
}

export function injectMethod(...args: InjectArg[]) {
    return function (target: Object, propertyKey: string, _: PropertyDescriptor) {
        const metadata = getMetadata(target);
        metadata.methods[propertyKey] = injectArgsToInjectMetadataValue(...args);
    }
}

export function injectClass(...args: InjectArg[]) {
    return function (constructor: Function) {
        const metadata = getMetadata(constructor.prototype);
        metadata.constructor = injectArgsToInjectMetadataValue(...args);
    }
}

function injectArgsToInjectMetadataValue(...args: InjectArg[]): InjectMetadataValue[] {
    return args.map(arg => {
        if (typeof arg === 'object') return arg;
        return { type: arg };
    });
}