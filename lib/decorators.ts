import { Ctor } from "@jin-qu/jinqu";

interface TypeInfo {
    type: Ctor<unknown>;
    resource: string;
}

const metadata: TypeInfo[] = [];

export function oDataResource(resource: string) {

    return (target: Ctor<unknown>) => {
        const existing = metadata.find((m) => m.type === target);
        if (existing) {
            existing.resource = resource;
        } else {
            metadata.push({ type: target, resource });
        }
    };
}

export function getResource(type: Ctor<unknown>) {
    const existing = metadata.find((m) => m.type === type);
    return (existing && existing.resource) || null;
}
