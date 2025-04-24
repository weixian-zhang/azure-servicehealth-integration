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
import { InvocationContext } from "@azure/functions";

import test_case_1_event from './test-data/unit-test-data/test_case_1_event.json';
import test_case_2_event from './test-data/unit-test-data/test_case_2_event.json';
import test_case_3_event from './test-data/unit-test-data/test_case_3_event.json';
import test_case_4_event from './test-data/unit-test-data/test_case_4_event.json';
import test_case_5_event from './test-data/unit-test-data/test_case_5_event.json';
import test_case_6_event from './test-data/unit-test-data/test_case_6_event.json';
import test_case_7_event from './test-data/unit-test-data/test_case_7_event.json';
import test_case_8_event from './test-data/unit-test-data/test_case_8_event.json';
import test_case_9_event from './test-data/unit-test-data/test_case_9_event.json';
import test_case_10_event from './test-data/unit-test-data/test_case_10_event.json';
import test_case_11_event from './test-data/unit-test-data/test_case_11_event.json';
import test_case_12_event from './test-data/unit-test-data/test_case_12_event.json';
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
// - issue event type is "ServiceIssue"
// data:
// - 1 issue
//   - impacted services = 1
// result/action:
// - (send issue as email)
// - issues to send as email = 1
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

    // no exitsting tracked issue in DB
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));

    const mock_db = instance(mdb);

    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, 
        [new Subscription('xxx-xx-xxx', 'sub-1')], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(1);
    expect(filtered_issues[0].ImpactedServices.length).toEqual(1);
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
// - issues to send as email = 0
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

    // no exitsting tracked issue in DB
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));

    const mock_db = instance(mdb);

    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, 
        [new Subscription('xxx-xx-xxx', 'sub-1')], 
        appconfig);


    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(0);
 });


// test case 3
// desc: issue / impacted regions is Global or SEA only with multiple impacted services
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// - issue event type is "ServiceIssue"
// test-data:
// - 2 issue 
//   - impacted services = 2
//   - 2 impactedRegions = SEA + Global
// result/action:
// - issue count = 2
// - issues to send as email = 4
test("test_case_3", async () => {

    const event_data = test_case_3_event;
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

    // no exitsting tracked issue in DB
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));

    const mock_db = instance(mdb);

    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, 
        [new Subscription('xxx-xx-xxx', 'sub-1')], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(2);

    expect(filtered_issues[0].ImpactedServices.length + filtered_issues[1].ImpactedServices.length).toEqual(4);
 });

// test case 4
// desc: issue / impacted regions is Not of Global or SEA
// conditions:
// - issue is Active
// - issue/impactedRegions is Not SEA region or Global
// - issue event type is "ServiceIssue"
// result/action:
// - issues to send as email = 1
test("test_case_4", async () => {

    const event_data = test_case_4_event;
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

    // no exitsting tracked issue in DB
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));

    const mock_db = instance(mdb);

    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, 
        [new Subscription('xxx-xx-xxx', 'sub-1')], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(0);
 });


// test case 5
// desc: all ServiceIssue properties and nested object properties are Not null/empty
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// - issue event type is "ServiceIssue"
// result/action:
// - validate all ServiceIssue property values are Not null/empty
test("test_case_5", async () => {

    const event_data = test_case_5_event;
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
    
    // no exitsting tracked issue in DB
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));

    const mock_db = instance(mdb);

    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, 
        [new Subscription('xxx-xx-xxx', 'sub-1')], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    const issue = filtered_issues[0];

    Object.keys(issue).forEach(key => {
        expect(issue[key]).not.toBeNull();
        expect(issue[key]).not.toBe('');
    });

    expect(issue.ImpactedServices.length).toEqual(1);

    issue.ImpactedServices.forEach(impacted_service => {

        expect(impacted_service.ImpactUpdates.length).toEqual(3);

        impacted_service.ImpactUpdates.forEach(update => {
            Object.keys(update).forEach(key => {
                expect(update[key]).not.toBeNull();
                expect(update[key]).not.toBe('');
            });
        });
    });
 });


// ** IssueSendDuplicatePreventer test cases **

//test case 6
// desc: issue is Resolved and issue Not already tracked in DB
// conditions:
// - issue is Resolved
// - issue Not already tracked in DB
// result/action:
// - issues to send as email = 0
test("test_case_6", async () => {

    const event_data = test_case_6_event;
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

    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['GS98-9V8', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Active')]
            ])
        ]
    ));

    // no exitsting tracked issue in DB
    when(mdb.issueExist).thenReturn(async () => await Promise.resolve([false, null]));

    const mock_db = instance(mdb);
    
    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, [
        new Subscription('xxx-xx-xxx', 'sub-1')
        ], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(0);

 });


//test case 7
// desc: Active issue GS98-9V8 is tracked but GS98-CN3Y is Not tracked
// There are 2 existing tracked issues exist in DB, but none of them is "GS98-G5Y1".
// Which means Active issue GS98-G5Y1 is not tracked. 
// conditions:
// - an issue is Resolved
// - issue/impactedRegions is SEA region or Global only
// - existing tracked issue status Resolved in DB
// data:
// - issues = 2
//      - Resolved = 1
//      - Active = 1
// result/action:
// - issue to send as email = 1
test("test_case_7", async () => {

    const event_data = test_case_7_event;
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
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());

    //return tracked-impacted-services
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['GS98-9V8', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Rsolved')],
            ])
        ]
    ));

    // mock DB return existing tracked issue
    when(mdb.issueExist)
        // this issue is tracked
        .thenReturn(async () => await Promise.resolve([ 
            true, 
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Rsolved'),
        ]))
        // this issue is Not tracked
        .thenReturn(async () => await Promise.resolve([ 
            false, 
            new TrackedIssue('TechPass', 'GS98-CN3Y', null, new Date().valueOf(), 'Active'),
        ]));


    const mock_db = instance(mdb);
    
    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, [
        new Subscription('xxx-xx-xxx', 'sub-1')
        ], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(1);

 });

//test case 8
// desc: issue status change from Active to Resolved, and tracked-impacted-service is Active
// conditions:
// - issue is Resolved
// - issue/impactedRegions is SEA region or Global only
// - existing tracked issue is Active
// result/action:
// - (update tracked issue status as Resolved in DB)
// - issue to send as email = 1
test("test_case_8", async () => {

    const event_data = test_case_8_event;
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
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());

    //return tracked-impacted-services
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['GS98-9V8', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Active')]
            ])
        ]
    ));

    // mock DB return existing tracked issue
    when(mdb.issueExist)
        .thenReturn(async () => await Promise.resolve([ 
            true, 
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
        ]));


    const mock_db = instance(mdb);
    
    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, [
        new Subscription('xxx-xx-xxx', 'sub-1')
        ], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(1);

 });



// test case 9
// desc: impacted service region status change from Active to Resolved, while tracked-impacted-service is Active
// conditions:
// - issue is Active
// - tracked impacted service is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - issue to send as email = 1
test("test_case_9", async () => {

    const event_data = test_case_9_event;
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
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());

    // mock DB return existing tracked impacted service
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['Windows Virtual Desktop', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Active')]
            ])
        ]
    ));

    // mock DB return existing tracked issue
    when(mdb.issueExist)
        .thenReturn(async () => await Promise.resolve([ 
            true, 
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
        ]));

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


 // test case 10
// desc: issue / impacted service of "Non SEA" region status change from Active to Resolved,
// while tracked SEA impacted service is Active. Non SEA issue are ignored.
// conditions:
// - issue is Active
// - SEA region tracked impacted service is Active
// - a Non-SEA region "Central US" status is Resolved
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - issue to send as email = 0
test("test_case_10", async () => {

    const event_data = test_case_10_event;
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
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());

    // mock DB return existing tracked impacted service
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['Windows Virtual Desktop', new TrackedImpactedService('Windows Virtual Desktop', new Date().valueOf(), 'Active')]
            ])
        ]
    ));

    // mock DB return existing tracked issue
    when(mdb.issueExist)
        .thenReturn(async () => await Promise.resolve([ 
            true, 
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
        ]));

    const mock_db = instance(mdb);
    
    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, [
        new Subscription('xxx-xx-xxx', 'sub-1')
        ], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(0);

 });


 //test case 11
// desc: issue / impacted service has newer "lastUpdateTime", means has new update
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// result/action:
// - (set tracked-impacted-service status to Resolved in DB)
// - (set tracked-impacted-service lastUpdatedTime to latest updated time in DB)
// - issue to send as email = 1
test("test_case_11", async () => {

    const event_data = test_case_11_event;
    const impacted_resources_data = test_case_impacted_resources;

    globalThis.funcContext =  mock(InvocationContext);

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
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());

    // mock DB return existing tracked impacted service
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['Windows Virtual Desktop', new TrackedImpactedService('Windows Virtual Desktop', 
                    Date.parse('2024-10-28T23:50:38.298Z').valueOf(), 'Active')]
            ])
        ]
    ));

    // mock DB return existing tracked issue
    when(mdb.issueExist)
        .thenReturn(async () => await Promise.resolve([ 
            true, 
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
        ]));

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



 //test case 12
// desc: "Informational" event level is included in addition to [Warning, Error]
// conditions:
// - issue is Active
// - issue/impactedRegions is SEA region or Global only
// data:
// - issues = 5
// - 3 issue with event level "Informational"
//   - 2 issues of SEA region
//   - 1 issue Non SEA region
// - 1 issue with event level "Warning"
// - 1 issue with event level "Error"
// result/action:
// - issue to send as email = 4
test("test_case_12", async () => {

    const event_data = test_case_12_event;
    const impacted_resources_data = test_case_impacted_resources;

    globalThis.funcContext =  mock(InvocationContext);

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
    when(mdb.updateIssueResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceResolved).thenReturn(async () => await Promise.resolve());
    when(mdb.updateImpactedServiceLastUpdateTime).thenReturn(async () => await Promise.resolve());

    // mock DB return existing tracked impacted service
    when(mdb.getImpactedServices).thenReturn(async () => await Promise.resolve(
        [
            new TrackedIssue('TechPass', 'GS98-9V8', null, new Date().valueOf(), 'Active'),
            new Map<string, TrackedImpactedService>([
                ['Windows Virtual Desktop', new TrackedImpactedService('Windows Virtual Desktop', 
                    Date.parse('2024-10-28T23:50:38.298Z').valueOf(), 'Active')]
            ])
        ]
    ));

    // mock DB return existing tracked issue
    when(mdb.issueExist)
        .thenReturn(async () => await Promise.resolve([ 
            false, 
             null,
        ]));

    const mock_db = instance(mdb);

    const apif = new ApiIssueFetcher(
        tenant_name, 
        mrh_instance, [
        new Subscription('xxx-xx-xxx', 'sub-1')
        ], 
        appconfig);

    const preventer = new IssueSendDuplicatePreventer(mock_db);
    preventer.init()
    
    const issues: ServiceIssue[] = await apif.fetchIssuesAndImpactedResources();

    const filtered_issues = await preventer.determineShouldSendIssues(issues);

    expect(filtered_issues.length).toEqual(4);

 });
