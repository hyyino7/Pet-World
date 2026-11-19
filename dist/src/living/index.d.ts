import { Context, type Fiber } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
import type { RegistrationLease, TableRegistration } from '../contracts/tables.js';
import type { CompanionBehavior } from './body/plugin.js';
import type { CompanionLife } from './plan/plugin.js';
import type { CompanionEconomy } from './economy/plugin.js';
interface Areas {
    body: CompanionBehavior;
    plan: CompanionLife;
    economy: CompanionEconomy;
}
type Area = keyof Areas;
export interface AreaReference<T> {
    readonly value: T;
    isCurrent(): boolean;
}
export declare class LivingWorld {
    private readonly domain;
    private readonly labels;
    private entries;
    private constructor();
    private static matching;
    static find(ctx: Context, host: PetCoreHost): LivingWorld | undefined;
    static retain(ctx: Context, host: PetCoreHost, area: Area): {
        world: LivingWorld;
        release: () => void;
    };
    register<K extends Area>(area: K, value: Areas[K], fiber: Fiber): TableRegistration;
    lookup<K extends Area>(area: K): (AreaReference<Areas[K]> & {
        lease: RegistrationLease;
    }) | undefined;
}
type AreaPorts = {
    [K in Area]?: () => Areas[K] | undefined;
};
export type LivingPorts = AreaPorts & {
    observe?: boolean;
};
export declare class LivingView {
    private readonly ports;
    readonly isCurrent: () => boolean;
    private readonly world?;
    constructor(ports?: LivingPorts, isCurrent?: () => boolean, world?: LivingWorld | undefined);
    lookup<K extends Area>(area: K): AreaReference<Areas[K]> | undefined;
    get<K extends Area>(area: K): Areas[K] | undefined;
    watch<K extends Area>(ctx: Context, area: K, notify: (area: AreaReference<Areas[K]> | undefined, isObserved: () => boolean) => void): () => void;
}
export declare function settleCleanup(...steps: (() => void | Promise<void>)[]): Promise<void>;
export declare function mountLivingArea<K extends Area>(ctx: Context, host: PetCoreHost, area: K, create: (view: LivingView) => Areas[K], start: (value: Areas[K]) => void, close?: (value: Areas[K]) => void | Promise<void>): void;
export declare const livingCaller: () => (() => void) | undefined;
export declare function withLivingCaller<T>(validate: () => void, call: () => T): T;
export declare class InFlight {
    private readonly work;
    run<T>(start: () => Promise<T>): Promise<T>;
    settled(): Promise<void>;
}
export {};
