import { statSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { readPersona, renderPersona } from "./persona.js";
import { renderSelf } from "./self.js";
import { belongsToWorld, inWorld } from "./sourceArchive.js";
import { DEFAULT_TEMPLATE_FILE, readTemplate, renderWorldPrompt } from "./worldPrompt.js";
import { reassembleOnChange } from "./worldScope.js";
export const WORLD_PROMPT_PREFIX = 'dsh-world:';
/** The stock "You are an AI agent powered by DeepSeek Harness." line; a section of the same name on her agent shadows it. */
const HARNESS_IDENTITY = 'harness:identity';
function cachePromptFile(file, read) {
    let cached;
    return force => {
        let version = '';
        try {
            const stat = file ? statSync(file, { throwIfNoEntry: false }) : undefined;
            if (stat)
                version = `${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
        }
        catch {
            cached = undefined;
            return read();
        }
        if (!force && cached?.version === version)
            return cached.value;
        const value = read();
        cached = { version, value };
        return value;
    };
}
/**
 * Her persona and the world prompt both reach only sessions of her preset inside the world's workspace, and come and
 * go together as a session enters or leaves it: the preset alone is DSH's default `standard` for most setups, so it
 * would turn every unrelated session into her (#37). Both are sections of the session's system prompt so she sees them on every
 * request. Checking the files during assembly also covers compression outside DSH (#42). The prompt stays in the
 * provider-cached prefix while its content is the same. Whether the session is her home is asked per request.
 *
 * Her persona takes the place of DeepSeek Harness's stock identity line, but never of a persona someone has set: it is its own
 * section placed right after the host's persona slot, so a system persona the deployment or her preset already has stays
 * where it is and hers follows it.
 */
export function createPromptSections(config, world, deps) {
    const sectionName = WORLD_PROMPT_PREFIX + config.worldId;
    const entries = new Map();
    const agents = new WeakMap();
    const persona = cachePromptFile(world.prompt.persona, () => ({
        persona: world.prompt.persona ? renderPersona(readPersona(world.prompt.persona)) : '',
        names: world.names?.() ?? world.prompt.names,
    }));
    const template = cachePromptFile(world.prompt.file ?? DEFAULT_TEMPLATE_FILE, () => {
        const template = readTemplate(world.prompt.file);
        if (template.error)
            deps.logger.warn(`dsh-world: ${template.error}`);
        return template.text;
    });
    const self = cachePromptFile(config.selfFile, () => config.selfFile ? { file: config.selfFile, text: renderSelf(config.selfFile) } : undefined);
    let forceRead = false;
    function read() {
        const force = forceRead;
        forceRead = false;
        return { template: template(force), self: self(force), ...persona(force) };
    }
    /** Registers her persona while the session is in her workspace and she has one; drops it otherwise. */
    function placePersona(agent, entry) {
        if (!entry.active || !entry.text.persona) {
            entry.persona?.();
            delete entry.persona;
            return;
        }
        if (entry.persona)
            return;
        const prompt = agent.ctx.systemPrompt;
        const order = prompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX') ?? 0;
        const text = () => entry.text.persona;
        const persona = prompt.section({ name: sectionName + ':persona', order: order + 1, interpolate: false, text });
        // DeepSeek Harness's own identity line gives way to hers; a persona someone set in DSH sits in its own slot and is left alone.
        // If a preset already put its own words on that identity slot for this agent, they stay exactly as written.
        let identity;
        try {
            identity = prompt.section({ name: HARNESS_IDENTITY, order: prompt.getSectionOrder('HARNESS_IDENTITY'), interpolate: false, text: () => '' });
        }
        catch { /* the slot is already taken for this agent */ }
        entry.persona = () => { persona(); identity?.(); };
    }
    function refresh(agent, entry) {
        const text = read();
        if (isDeepStrictEqual(text, entry.text))
            return false;
        entry.text = text;
        entry.restart = true;
        placePersona(agent, entry);
        return true;
    }
    return {
        add(agent) {
            if (entries.has(agent) || !belongsToWorld(agent.session, config))
                return;
            let disposeWorld;
            /** Reassemble if the placement or the content changed since the host collected the sections. */
            const sync = (current) => {
                if (current !== agent)
                    return false;
                const active = inWorld(agent.session, config, world.inWorkspace);
                if (active === entry.active)
                    return active && refresh(agent, entry);
                entry.active = active;
                entry.restart = true;
                if (!entry.active) {
                    disposeWorld?.();
                    disposeWorld = undefined;
                    placePersona(agent, entry);
                    return true;
                }
                entry.text = read();
                disposeWorld = agent.ctx.systemPrompt.section({ name: sectionName, order: 50, interpolate: false, text: () => renderWorldPrompt({ ...world.prompt, names: entry.text.names }, entry.text.template, entry.text.self, world.isHome(agent.id)) });
                placePersona(agent, entry);
                return true;
            };
            const disposeSync = reassembleOnChange(agent.ctx, sync);
            const entry = { text: { template: '', persona: '', names: world.prompt.names }, active: false, restart: false, dispose: () => { disposeSync(); disposeWorld?.(); } };
            entries.set(agent, entry);
            agents.set(agent.session, agent);
            sync(agent);
        },
        active(session) {
            const agent = agents.get(session);
            return !!(agent && entries.get(agent)?.active);
        },
        /** On in-history routes, start a new series to replace the old prompt instead of appending to it. */
        takeRestart(session) {
            const agent = agents.get(session);
            const entry = agent && entries.get(agent);
            if (!entry?.restart)
                return false;
            entry.restart = false;
            return true;
        },
        refresh(session) {
            const agent = agents.get(session);
            // A compaction can finish after the current step assembled its prompt.
            if (agent && entries.get(agent)?.active)
                forceRead = true;
        },
        clear() {
            for (const entry of entries.values())
                for (const dispose of [entry.dispose, entry.persona]) {
                    try {
                        dispose?.();
                    }
                    catch { /* agent scope already gone */ }
                }
            entries.clear();
        },
    };
}
