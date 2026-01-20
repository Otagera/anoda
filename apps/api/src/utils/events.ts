import { EventEmitter } from "node:events";

export const eventEmitter = new EventEmitter();

export const EVENTS = {
	IMAGE_PROCESSED: "IMAGE_PROCESSED",
};

export const emitImageProcessed = (imageId: string, albumId?: string) => {
	eventEmitter.emit(EVENTS.IMAGE_PROCESSED, { imageId, albumId });
};
