
export class ServiceIssue {
    TrackingId: string;
    Status: string;
    ImpactStartTime: Date;
    ImpactMitigationTime: Date;
    Title: string;
    Summary: string;
    Description: string;
    ImpactedServices: ImpactedService[];
    ImpactedResources: ImpactedResource[];
    LastUpdateTime: Date;
    LastUpdateTimeEpoch: number;
}

export class ImpactedService {
    ImpactedService: string;
    SoutheastAsiaRegionStatus: string;
    ImpactedSubscriptions: string[];
    ImpactedTenants: string[];
    LastUpdateTime: Date;
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
