import { INJECT_METADATA_KEY } from './consts';
import { RegistryKey, RegistryType } from './Container';

export type InjectMetadataValue = {
  type: RegistryType;
  key?: RegistryKey;
  shouldThrowError?: boolean;
}

export type InjectMetadata = {
  properties: Record<string, InjectMetadataValue>;
  methods: Record<string, InjectMetadataValue[]>;
  constructor: InjectMetadataValue[];
}

export function getMetadata(target: Object): InjectMetadata;
export function getMetadata(target: Object, createIfNotExist: false): InjectMetadata | null
export function getMetadata(target: Object, createIfNotExist = true) {
  let metadata = Reflect.getMetadata(INJECT_METADATA_KEY, target);
  if (!metadata) {
    if (createIfNotExist) {
      metadata = {
        properties: Object.create(null),
        methods: Object.create(null),
        constructor: [],
      };
      Reflect.defineMetadata(INJECT_METADATA_KEY, metadata, target);
    } else {
      return null;
    }
  }

  return metadata;
}