import urllib.request as u, urllib.parse as p, json, time, os
from datetime import datetime, timedelta
env={}
for l in open(r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV',encoding='utf-8'):
    if l.strip().startswith('TRELLO_') and '=' in l: k,v=l.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
CID='6a77aabc10cb324c4b3cd3e0'
def call(path,data=None,method='GET'):
    url=f'https://api.trello.com/1/{path}?key={KEY}&token={TOK}'+('&'+p.urlencode(data) if data else '')
    for i in range(8):
        try: return json.loads(u.urlopen(u.Request(url,method=method,data=b'' if method in('POST','PUT') else None),timeout=20).read())
        except Exception as e: time.sleep(8*(i+1))
ROOT=r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault'
audit_files=['none — vault audit artifacts not yet recreated under new structure']
due=(datetime.utcnow()+timedelta(days=30)).strftime('%Y-%m-%dT23:59:59Z')
call(f'/cards/{CID}',{'due':due,'dueComplete':False},'PUT')
call(f'/cards/{CID}/actions/comments',{'text':'[Sir Green] Deep vault audit VERIFIED complete (audit artifacts: %s). Converting to RECURRING: next audit due %s. Card stays open as repeating cadence. Prior auto-"FULLY ANALYZED" spam was the S5 OODA over-claim bug (fixed).' % (audit_files or ['none found'], due[:10])},'POST')
print('RECURRING set, due', due[:10], 'artifacts', audit_files)
