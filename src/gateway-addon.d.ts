declare module 'gateway-addon' {
    class Event {
        constructor(device: any, name: string, data?: any);
    }

    interface EventDescription {
        name: string;
        metadata: EventMetadata;
    }

    interface EventMetadata {
        description: string,
        type: string
    }

    class Property {
        public name: any;
        public value: any;
        public device: Device;
        public readOnly: boolean;

        constructor(device: Device, name: string, propertyDescr: {});

        public setCachedValue(value: any): void;

        public setCachedValueAndNotify(value: any): void;

        public setValue(value: any): Promise<void>
    }

    class Device {
        public properties: Map<String, Property>;
        public events: Map<String, EventDescription>;
        protected '@context': string;
        protected '@type': string[];
        protected id: string;
        protected name: string;
        protected description: string;
        protected adapter: Adapter;

        constructor(adapter: Adapter, id: string);

        public notifyPropertyChanged(property: Property): void;

        public addAction(name: string, metadata: any): void;

        public eventNotify(event: Event): void;

        public setTitle(name: any): void;

        public findProperty(propertyName: string): Property;
    }

    interface Preferences {
        language: string;
        units: {
            temperature: string
        };
    }

    interface UserProfile {
        addonsDir: string;
        baseDir: string;
        configDir: string;
        dataDir: string;
        mediaDir: string;
        logDir: string;
        gatewayDir: string;
    }

    class Adapter {
        public userProfile: UserProfile;
        public preferences: Preferences;

        public devices: { [id: string]: Device };

        constructor(addonManager: any, id: string, packageName: string);

        public handleDeviceAdded(device: Device): void;

        public handleDeviceRemoved(device: Device): void;

        public removeThing(device: Device): void;

        public startPairing(_timeoutSeconds: number): void;
    }

    class Database {
        constructor(packageName: string, path?: string);

        public open(): Promise<void>;

        public loadConfig(): Promise<any>;

        public saveConfig(config: any): Promise<void>;
    }
}
