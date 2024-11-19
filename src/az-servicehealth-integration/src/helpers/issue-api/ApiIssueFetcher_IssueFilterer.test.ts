import ApiIssueFetcher from './ApiIssueFetcher';
import IssueFilterer from './IssueFilterer'
import {ServiceIssue, Subscription} from "./ServiceIssueModels";
import path from 'path'
import AppConfig from '../AppConfig';
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
import test_case_1_impacted_resources from './test-data/unit-test-data/test_case_1_impacted_resources.json';

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
dotenv.config({path: path.join(__dirname, "test-data/.env")});
const appconfig = AppConfig.loadFromEnvVar(undefined);

const tenant_name = 'TechPass';


// test case 1
// conditions:
// - issue is Active
// - event level is Warning
// - southeast asia region issue is still Active
// - central us region issue is Resolved
// result:
// - issue count = 1
test("issue_Active_SEA_Active", async () => {

    const event_data = test_case_1_event;
    const impacted_resources_data = test_case_1_impacted_resources;

    // setup mock
    const mrh :MicrosoftResourceHealth = mock(MicrosoftResourceHealth);
    when(mrh.eventsOperations).thenReturn(new MockEventOperations(event_data));
    when(mrh.impactedResources).thenReturn(new MockImpactedResources(impacted_resources_data));
    const mrh_instance = instance(mrh);
    Object.defineProperty(mrh_instance, "subscriptionId", { writable: true, value: 'xx-xx-xx' });


    const subscriptions = [
        new Subscription('xxx-xx-xxx', 'sub-1')
    ]

    const apif = new ApiIssueFetcher(tenant_name, mrh_instance, subscriptions, appconfig);
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    expect(issues.length).toEqual(1);
 });


// test case 2
// conditions:
// - issue is Active
// - southeast asia region issue is still Active
// - central us region issue is Resolved
// result:
// - issue count = 1


// test case 3
// conditions:
// - issue is Active
// - southeast asia region issue is still Resolved
// - central us region issue is Active
// result:
// - issue count = 1
