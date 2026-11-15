export declare function lifeToolAllowed(name: string, review?: boolean): boolean;
/** File tools belong to the native preset, not the global registry. Life only
 * registers its own domain tools locally: never pass those local names to
 * restrict(). Inspect the host service's views, keeping its scope identity. */
export declare function lifeInheritedToolNames<S>(tools: {
    definitions(scope?: S): readonly {
        name: string;
    }[];
}, agent: S, review?: boolean): string[];
/** Native scoped restrictions have exact disposers; ordinary turns are restored. */
export declare function restrictLifeTools(scoped: {
    restrict(filter: {
        allow: readonly string[];
    }): () => void;
}, inheritedNames: readonly string[], review?: boolean): () => void;
