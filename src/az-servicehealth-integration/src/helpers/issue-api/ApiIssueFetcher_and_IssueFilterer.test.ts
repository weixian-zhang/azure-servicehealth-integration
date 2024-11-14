import ApiIssueFetcher from './ApiIssueFetcher';
import IssueFilterer from './IssueFilterer'
import fs from 'fs';
import path from 'path'
// import { describe, expect, test } from '@jest/globals';
import AppConfig from '../AppConfig';
import dotenv from 'dotenv'; 

import test_data_case_1 from './test-data/unit-test-data/test_case_1.json';

dotenv.config({path: path.join(__dirname, "test-data/.env")});
// const test_data_dir = "./test_data";
// const _test_data_case_1 = path.join(test_data_dir, "test_case_1.json");
//const appconfig = AppConfig.loadFromEnvVar(undefined);

console.log(process.env.GCC_TECHPASS_CLIENT_ID)

// test case 1
// conditions:
// - issue is Active
// - southeast asia region issue is Active
// result:
// - issue count = 1

describe('deployNewMarketContract', () => { 
    test("test case 1", () => {
        //var issue = "";
        const data = test_data_case_1;
        
        //const issues = JSON.parse(data);
    
        typeof(data)
    
        expect(2).toEqual(2);
     });
         
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
