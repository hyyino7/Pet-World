export type PhotoView = 'eyes' | 'overview';
export type PhotoLook = 'forward' | 'room';
export declare function roomPhoto(home: object, garden: object, view: PhotoView, look: PhotoLook, signal: AbortSignal): Promise<{
    mediaType: string;
    data: string;
}>;
