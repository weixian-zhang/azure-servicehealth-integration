import ApiIssueFetcher from './ApiIssueFetcher';
import * as _ from 'lodash';
import IssueSendDuplicatePreventer from './IssueSendDuplicatePreventer';
import {ServiceIssue, Subscription} from "./ServiceIssueModels";
import path from 'path'
import AppConfig from '../AppConfig';
import { DB, TrackedIssue, TrackedImpactedService  } from '../DB';
import dotenv from 'dotenv'; 
import { mock, when, instance } from 'ts-mockito';
import { MicrosoftResourceHealth, Event, EventsOperations, 
    EventsListBySubscriptionIdOptionalParams, 
    EventsListBySingleResourceOptionalParams, 
    EventsListByTenantIdOptionalParams,
    ImpactedResources,
    EventImpactedResource,
    ImpactedResourcesGetByTenantIdOptionalParams,
    ImpactedResourcesGetByTenantIdResponse,
    ImpactedResourcesGetOptionalParams,
    ImpactedResourcesGetResponse,
    ImpactedResourcesListBySubscriptionIdAndEventIdOptionalParams,
    ImpactedResourcesListByTenantIdAndEventIdOptionalParams} from "@azure/arm-resourcehealth"
import {PageSettings, PagedAsyncIterableIterator } from '@azure/core-paging/dist/commonjs/models';

import test_case_1_event from './test-data/unit-test-data/test_case_1_event.json';
import test_case_2_event from './test-data/unit-test-data/test_case_2_event.json';
import test_case_impacted_resources from './test-data/unit-test-data/test_case_impacted_resources.json';

class MockEventIterator implements PagedAsyncIterableIterator<Event, Event[], PageSettings> {
    data: any[];
    idx: number;
    constructor(data: any[]) {
        this.data = data;
        this.idx = 0;
    }

    next(): Promise<IteratorResult<Event, any>> {
        if (this.idx >= this.data.length) {
            return Promise.resolve({ value: undefined, done: true });
        }
        
        const awaitable_promise = Promise.resolve({value: this.data[this.idx], done:false});
        this.idx += 1;
        return awaitable_promise;
    }

    byPage: (settings?: PageSettings) => AsyncIterableIterator<Event[]>;
    [Symbol.asyncIterator](): PagedAsyncIterableIterator<Event, Event[], PageSettings> {
        //throw new Error('Method not implemented.');
        return this;
    }
}

class MockImpactedResourceIterator implements PagedAsyncIterableIterator<EventImpactedResource, EventImpactedResource[], PageSettings> {
    data: any[];
    idx: number;
    constructor(data: any[]) {
        this.data = data;
        this.idx = 0;
    }

    next(): Promise<IteratorResult<Event, any>> {
        if (this.idx >= this.data.length) {
            return Promise.resolve({ value: undefined, done: true });
        }
        
        const awaitable_promise = Promise.resolve({value: this.data[this.idx], done:false});
        this.idx += 1;
        return awaitable_promise;
    }

    byPage: (settings?: PageSettings) => AsyncIterableIterator<Event[]>;
    [Symbol.asyncIterator](): PagedAsyncIterableIterator<Event, Event[], PageSettings> {
        //throw new Error('Method not implemented.');
        return this;
    }
}

class MockEventOperations implements EventsOperations {
    iterator: MockEventIterator;
    constructor(data: any[]) {
        this.iterator = new MockEventIterator(data);
    }

    listBySubscriptionId(options?: EventsListBySubscriptionIdOptionalParams): PagedAsyncIterableIterator<Event> {
        return this.iterator;
    }
    listByTenantId(options?: EventsListByTenantIdOptionalParams): PagedAsyncIterableIterator<Event> {
        throw new Error('Method not implemented.');
    }
    listBySingleResource(resourceUri: string, options?: EventsListBySingleResourceOptionalParams): PagedAsyncIterableIterator<Event> {
        throw new Error('Method not implemented.');
    }
}

class MockImpactedResources implements ImpactedResources {
    iterator: MockImpactedResourceIterator;
    constructor(data: any[]) {
        this.iterator = new MockImpactedResourceIterator(data);
    }

    listBySubscriptionIdAndEventId(eventTrackingId: string, options?: ImpactedResourcesListBySubscriptionIdAndEventIdOptionalParams): PagedAsyncIterableIterator<EventImpactedResource> {
        return this.iterator;
    }
    listByTenantIdAndEventId(eventTrackingId: string, options?: ImpactedResourcesListByTenantIdAndEventIdOptionalParams): PagedAsyncIterableIterator<EventImpactedResource> {
        throw new Error('Method not implemented.');
    }
    get(eventTrackingId: string, impactedResourceName: string, options?: ImpactedResourcesGetOptionalParams): Promise<ImpactedResourcesGetResponse> {
        throw new Error('Method not implemented.');
    }
    getByTenantId(eventTrackingId: string, impactedResourceName: string, options?: ImpactedResourcesGetByTenantIdOptionalParams): Promise<ImpactedResourcesGetByTenantIdResponse> {
        throw new Error('Method not implemented.');
    }
}
     

// load env var from .env
dotenv.config({path: path.join(__dirname, "test-data/.env"), override: true});
const appconfig = AppConfig.loadFromEnvVar(undefined);
const tenant_name = 'TechPass';

// ** IssueFilterer test cases **

// test case 1
// desc: issue is active and impacted region is SEA
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - (send issue as email)
// - issue count = 1
test("test_case_1", async () => {

    const event_data = test_case_1_event;
    const impacted_resources_data = test_case_impacted_resources;

    // setup mock MicrosoftResourceHealth
    const mrh = mock(MicrosoftResourceHealth);
    when(mrh.eventsOperations).thenReturn(new MockEventOperations(event_data));
    when(mrh.impactedResources).thenReturn(new MockImpactedResources(impacted_resources_data));
    const mrh_instance = instance(mrh);
    Object.defineProperty(mrh_instance, "subscriptionId", { writable: true, value: 'xx-xx-xx' });

    
    //setup mock DB 
    const mdb = mock(DB);
    when(mdb.initDB).thenReturn(async () => await Promise.resolve());
    when(mdb.addIssue).thenReturn(async () => await Promise.resolve());
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', '', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['GS98-9V8', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Active')]
            ])
        ]
    ));
    const mock_db = instance(mdb);
    
    
    const subscriptions = [
        new Subscription('xxx-xx-xxx', 'sub-1')
    ]

    const apif = new ApiIssueFetcher(tenant_name, mrh_instance, subscriptions, appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(1);
 });


// test case 2
// desc: if event type is not "ServiceIssue", do not send issue as email
// https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2024-02-01&tabs=HTTP#eventtypevalues
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// - issue event type is in [EmergingIssues, HealthAdvisory, PlannedMaintenance, RCA, SecurityAdvisory]
// result/action:
// - (do not send issue as email)
// - issue count = 0
test("test_case_2", async () => {

    const event_data = test_case_2_event;
    const impacted_resources_data = test_case_impacted_resources;

    // setup mock MicrosoftResourceHealth
    const mrh = mock(MicrosoftResourceHealth);
    when(mrh.eventsOperations).thenReturn(new MockEventOperations(event_data));
    when(mrh.impactedResources).thenReturn(new MockImpactedResources(impacted_resources_data));
    const mrh_instance = instance(mrh);
    Object.defineProperty(mrh_instance, "subscriptionId", { writable: true, value: 'xx-xx-xx' });

    
    //setup mock DB 
    const mdb = mock(DB);
    when(mdb.initDB).thenReturn(async () => await Promise.resolve());
    when(mdb.addIssue).thenReturn(async () => await Promise.resolve());
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', '', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['GS98-9V8', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Active')]
            ])
        ]
    ));
    const mock_db = instance(mdb);
    
    
    const subscriptions = [
        new Subscription('xxx-xx-xxx', 'sub-1')
    ]

    const apif = new ApiIssueFetcher(tenant_name, mrh_instance, subscriptions, appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(0);
 });


// test case 3
// desc: issue / impacted regions is Global or SEA only
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - issue count = 1


// test case 4
// desc: all ServiceIssue properties is Not null/empty
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - validate all ServiceIssue property values are Not null/empty



// ** IssueSendDuplicatePreventer test cases **

//test case 5
// desc: issue is Resolved and issue Not already tracked in DB
// conditions:
// - issue is Resolved
// - issue Not already tracked in DB
// result/action:
// - issue count = 0

//test case 6
// desc: issue is Resolved and tracked issue is also Resolved
// conditions:
// - issue is Resolved
// - issue/impactedRegions is SEA region or Global only
// - existing tracked issue status Resolved in DB
// result/action:
// - issue count = 0


//test case 7
// desc: issue is Active and No existing tracked issue is found in DB
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// - existing tracked issue is NOT found in DB
// result/action:
// - (save issue as tracked issue in DB)
// - issue count = 1



//test case 8
// desc: issue is Active and existing tracked issue is found in DB
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// - existing tracked issue Is Found in DB
// result/action:
// - issue count = 0


// test case 9
// desc: issue / impacted service status change from Active to Resolved
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - issue count = 1



//test case 10
// desc: issue / impacted service has newer "lastUpdateTime", means has new update
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - (set tracked-impacted-service status to Resolved in DB)
// - (set tracked-impacted-service lastUpdatedTime to latest updated time in DB)
// - issue count = 1
