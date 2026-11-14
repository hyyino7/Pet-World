export declare function lifeToolAllowed(name: string, review?: boolean): boolean;
/** Native scoped restrictions have exact disposers; ordinary turns are restored. */
export declare function restrictLifeTools(scoped: {
    restrict(filter: {
        allow: readonly string[];
    }): () => void;
}, globalNames: readonly string[], review?: boolean): () => void;
