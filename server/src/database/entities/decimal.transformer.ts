import { ValueTransformer } from 'typeorm';

/** Postgres returns `decimal` columns as strings; normalize to number. */
export const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => (value === null ? null : parseFloat(value)),
};
