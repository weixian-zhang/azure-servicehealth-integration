import ApiIssueFetcher from './ApiIssueFetcher';
import IssueFilterer from './IssueFilterer'
import {ServiceIssue, Subscription} from "./ServiceIssueModels";
import path from 'path'
import AppConfig from '../AppConfig';
import dotenv from 'dotenv'; 
import { ClientSecretCredential } from "@azure/identity";
import { MicrosoftResourceHealth, Event, EventsOperations, 
    EventsListBySubscriptionIdOptionalParams, 
    EventsListBySingleResourceOptionalParams, 
    EventsListByTenantIdOptionalParams } from "@azure/arm-resourcehealth"
import {PageSettings, PagedAsyncIterableIterator } from '@azure/core-paging/dist/commonjs/models';
import { mock, when, instance } from 'ts-mockito';
import test_data_case_1 from './test-data/unit-test-data/test_case_1.json';

class EventIterator implements PagedAsyncIterableIterator<Event, Event[], PageSettings> {
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

class EventOps implements EventsOperations {
    eventIterator: EventIterator;
    constructor(data: any[]) {
        this.eventIterator = new EventIterator(data);
    }

    listBySubscriptionId(options?: EventsListBySubscriptionIdOptionalParams): PagedAsyncIterableIterator<Event> {
        return this.eventIterator;
    }
    listByTenantId(options?: EventsListByTenantIdOptionalParams): PagedAsyncIterableIterator<Event> {
        throw new Error('Method not implemented.');
    }
    listBySingleResource(resourceUri: string, options?: EventsListBySingleResourceOptionalParams): PagedAsyncIterableIterator<Event> {
        throw new Error('Method not implemented.');
    }
}
     

// load env var from .env
dotenv.config({path: path.join(__dirname, "test-data/.env")});
const appconfig = AppConfig.loadFromEnvVar(undefined);

const tenant_name = 'TechPass'

// test case 1
// conditions:
// - issue is Active
// - southeast asia region issue is still Active
// - central us region issue is Resolved
// result:
// - issue count = 1
test("issue_Active_SEA_Active", async () => {

    const data = test_data_case_1;

    //ts-mockito
    const mrh :MicrosoftResourceHealth = mock(MicrosoftResourceHealth);
    const mrh_instance = instance(mrh);
    when(mrh.eventsOperations).thenReturn(new EventOps(data));
    when(mrh.subscriptionId).thenCall(() => 'xxx-xx-xxx');


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
