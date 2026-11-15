export class PlannedAdmissionWaitError extends Error {
    wait;
    constructor(wait) {
        super('身体仍在完成主人已安排的活动，完成后继续原计划');
        this.wait = wait;
        this.name = 'PlannedAdmissionWaitError';
    }
}
//# sourceMappingURL=behavior.js.map