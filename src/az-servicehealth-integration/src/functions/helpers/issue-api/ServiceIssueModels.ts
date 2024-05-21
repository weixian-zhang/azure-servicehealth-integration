
export class Subscription {
    Id: string;
    Name: string
    constructor(id: string, name: string) {
        this.Id = id;
        this.Name = name;
    }
}
export class ServiceIssue {
    TenantName: string
    TrackingId: string;
    OverallStatus: string;
    ImpactStartTime: Date;
    ImpactMitigationTime: Date;
    Title: string;
    Summary: string;
    Description: string;
    Level: string; 
    // Error - Widespread issues accessing multiple services across multiple regions are impacting a broad set of customers.
    // Warning - Issues accessing specific services and/or specific regions are impacting a subset of customers.
    // Informational - Issues impacting management operations and/or latency, not impacting service availability.
    LevelDescription: string; 
    ImpactedServices: ImpactedService[];
    ImpactedResources: ImpactedResource[];
    LastUpdateTime: Date;
    LastUpdateTimeEpoch: number;
}

export class ImpactedService {
    ImpactedService: string;
    IsGlobal: boolean = false;
    SEARegionOrGlobalStatus: string;
    ImpactedSubscriptions: string[];
    ImpactedTenants: string[];
    SEARegionOrGlobalLastUpdateTime: Date;
    ImpactUpdates: ImpactUpdates[]
}

export class ImpactUpdates {
    Summary: string;
    UpdateDateTime: Date;
    UpdateEpoch: number
}

export  class ImpactedResource {
    Id: string
    SubscriptionId: string
    ResourceGroup: string
    ResourceType: string;
    ResourceName: string
}
