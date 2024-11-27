import * as _ from 'lodash';
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
    ImpactedSubscriptions: Map<string, Subscription>;
    ImpactedServices: ImpactedService[];
    ImpactedServicesNames: string[] = [];
    ImpactedResources: ImpactedResource[];
    LastUpdateTime: Date;
    LastUpdateTimeEpoch: number;
    ImpactedRegions: string; //either Global or regions within "region filter"

    getImpactedServiceNames(): string {
        const n = new Array<string>();
        if (_.isEmpty(this.ImpactedServices)) {
            return '';
        }

        this.ImpactedServices.forEach((s) => {
            n.push(s.ImpactedService)
        });

        return n.join(', ');
    }

    addImpactedSubscriptions(subscriptionIds: string[]) {
        if (subscriptionIds.length == 0) {
            return
        }

        for (const id of subscriptionIds) {
            if (!this.ImpactedSubscriptions.has(id)) {
                this.ImpactedSubscriptions.set(id, new Subscription(id, ''));
            }
        }
    }

    addImpactedSubscription(subscription: Subscription) {

        if (!this.ImpactedSubscriptions.has(subscription.Id)) {
            this.ImpactedSubscriptions.set(subscription.Id, subscription);
        }
    }
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
    IssueEventId: string
    Id: string
    SubscriptionId: string
    ResourceGroup: string
    ResourceType: string;
    ResourceName: string
}
