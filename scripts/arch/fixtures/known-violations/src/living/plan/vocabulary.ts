export type Step = {kind: 'hold' | 'room' | 'body'};
export const schema = {oneOf: [
  {properties: {kind: {type: 'string', const: 'hold'}}},
  {properties: {kind: {type: 'string', const: 'room'}}},
  {properties: {kind: {type: 'string', const: 'body'}}},
]};
export const body = {enum: ['feed', 'water', 'play']};
export interface Service {kind: string; action: string; status: string; type: string}
