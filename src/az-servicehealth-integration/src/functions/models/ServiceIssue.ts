import ImpactedResource from "./ImpactedResource";

export default class ServiceIssue {
    TrackingId: string;
    Status: string;
    ImpactStartTime: Date;
    ImpactMitigationTime: Date;
    Title: string;
    Summary: string;
    ArticleContent: string;
    ImpactedResources: Array<ImpactedResource>;
}

