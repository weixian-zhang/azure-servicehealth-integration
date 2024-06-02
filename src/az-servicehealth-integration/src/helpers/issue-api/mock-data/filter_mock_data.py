import json
import os

jd = {}
dir = os.path.join(os.getcwd(), 'src', 'az-servicehealth-integration','src','functions','helpers','issue-api','mock-data')
filePath = os.path.join(dir, 'listBySubscriptionId.json')
with open(filePath, 'r', encoding='utf8') as f:
    jd = json.loads(f.read())

jd = jd['value']
result = []

for d in jd:
    if d['properties']['eventType'] == 'ServiceIssue':
        result.append(d)

with open(os.path.join(dir, 'sea_issues_only.json'), 'w') as f:
    f.write(json.dumps(result, indent=4))

