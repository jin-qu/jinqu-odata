interface TypeInfo {
    type: Function;
    resource: string;
}

const metadata: Array<TypeInfo> = [];

export function oDataResource(resource: string) {
    
    return (target: Function) => {
        for (let i = 0; i < metadata.length; i++) {
            if (metadata[i].type === target) {
                metadata[i].resource = resource;
                return;
            }
        }

        metadata.push({ type: target, resource });
    }
}

export function getResource(type: Function) {
    const found = metadata.find(m => m.type === type);
    return (found && found.resource) || null;
}
