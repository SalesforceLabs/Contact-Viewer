/* 
 * Copyright (c) 2011, salesforce.com <http://salesforce.com> , inc.
 * Author: Akhilesh Gupta
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided 
 * that the following conditions are met:
 * 
 *    Redistributions of source code must retain the above copyright notice, this list of conditions and the 
 *    following disclaimer.
 *  
 *    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and 
 *    the following disclaimer in the documentation and/or other materials provided with the distribution. 
 *    
 *    Neither the name of salesforce.com <http://salesforce.com> , inc. nor the names of its contributors may be used to endorse or 
 *    promote products derived from this software without specific prior written permission.
 *  
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED 
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR 
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED 
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */

public with sharing class ContactsAppServiceController extends BaseServiceController {
    
    public String resultSet {get; private set;}
    
    public ContactsAppServiceController() {
    	super();
    }
    
    public void loadPage() {
    	if (this.sm.isValid()) {
    		try {
	           String action = System.currentPageReference().getParameters().get('action');
	           if (action == 'fetchContacts') {
	                this.resultSet = getContactsList();
	           } else if (action == 'retrieveContact') {
	                this.resultSet = retrieveContact();
	           } else if (action == 'fetchChatter') {
	                this.resultSet = fetchChatter();
	           } else if (action == 'getUsersInfo') {
	                this.resultSet = getUsersInfo();
	           } else if (action == 'searchContacts') {
	                this.resultSet = searchContacts();
	           } else if (action == 'fetchActivities') {
	                this.resultSet = fetchActivities();
	           } else if (action == 'describeContact') {
	        	    this.resultSet = getContactDescribe();
	           } else if (action == 'manageEula') {
	        	    this.resultSet = manageEula();
	           }
	        
	           if (this.resultSet == null) {
                    this.resultSet = '{}';
               }
    		} catch (SFDCApiClient.ApiException ae) {
    			this.resultSet = ae.errorCode;
    		} catch (Exception e) {}
    	}
    }

    private List<Id> stripIdListFromJson(String propName, String json) {
    	Pattern cPattern = Pattern.compile('\"' + propName + '\":\"([^\"]*?)"');
        Matcher cMatcher = cPattern.matcher(json);
        
        List<Id> idList = new List<Id>();
        while(cMatcher.find()) {
            idList.add(cMatcher.group(1));
        }
        
        return idList;
    }
    
    private List<Id> getRecentContacts() {
    	String jsonResp = client.sobject('Contact');
    	
    	Pattern riPattern = Pattern.compile('\"recentItems\":\\[([^\\]]*)\\]');
        Matcher riMatcher = riPattern.matcher(jsonResp);
        
        if (riMatcher.find()) {
        	return stripIdListFromJson('Id', riMatcher.group(1));
        }
        return null;
    }
    
    private List<Id> getFollowedContacts() {
    	String jsonResp = client.query('SELECT ParentId FROM EntitySubscription WHERE parent.type = \'Contact\' AND SubscriberID = \'' + sm.userId + '\' limit 200');
    	
    	Pattern cPattern = Pattern.compile('\"records\":\\[([^\\]]*)\\]');
        Matcher cMatcher = cPattern.matcher(jsonResp);
        
        if (cMatcher.find()) {
            return stripIdListFromJson('ParentId', cMatcher.group(1));
        }
        return null;
    }
    
    private String createIdFilterStringFromList(List<Id> ids) {
    	String filter = 'ID IN (';
    	if (ids != null && ids.size() > 0) {
    		for (Id cid : ids) {
    			filter += ('\'' + cid + '\',');
    		}
	        filter = filter.subString(0, filter.length() - 1);
	    } else {
	    	filter += '\'\'';
	    }
	    return filter + ')';
    }
    
    private String getContactsList() {
    	String filter = System.currentPageReference().getParameters().get('filter');
    	String addWhereClause = '';
    	
    	if (filter != null && filter.length() > 0) {
    		addWhereClause += 'where ';
    		if (filter.equalsIgnoreCase('owner')) {
    			addWhereClause += 'ownerId = \'' + sm.userId + '\'';
    		} else if (filter.equalsIgnoreCase('follow')) {
    			addWhereClause += createIdFilterStringFromList(getFollowedContacts());
    		} else if (filter.equalsIgnoreCase('recent')) {
                addWhereClause += createIdFilterStringFromList(getRecentContacts());
            }
            addWhereClause += ' order by LastName asc';
    	}
    	
    	addWhereClause += ' limit 500';
    	
    	System.debug(addWhereClause);

        return client.query('SELECT Id, FirstName, LastName, Name ' + 
                            'FROM   Contact ' + addWhereClause );
    }
    
    private String retrieveContact() {
        
        String cid = System.currentPageReference().getParameters().get('id');
        String fields = System.currentPageReference().getParameters().get('fields');
        String[] fieldArray = fields.split(',');
        
        return client.details('Contact', cid, fieldArray); 
    }
    
    private String fetchChatter() {
        
        String cids = System.currentPageReference().getParameters().get('ids');
        String[] cidArray = String.escapeSingleQuotes(cids.trim()).split(',');
        
        String filter = 'parentId IN (' + (cidArray.size() > 0 ? ContactsAppUtil.createCSVFromList(cidArray, true) : '\'\'') + ')';
        
        return client.query('Select id, type, Parent.Name, Parent.Id, createdby.name, createdby.id, createdDate, ' + 
                            'likeCount, CommentCount, title, body, linkUrl, ' +
                            '(Select id, fieldName, oldValue, newValue from feedTrackedChanges) from ContactFeed where ' + filter +
                            ' order by createdDate desc, id desc limit 50'); 
    }
    
    private String getUsersInfo() {
        
        String fetchPhototsParam = System.currentPageReference().getParameters().get('fetchPhotos');
        boolean addPhotos = (fetchPhototsParam != null && fetchPhototsParam.trim().equalsIgnoreCase('true'));
        
        String uids = System.currentPageReference().getParameters().get('id');
        uids = String.escapeSingleQuotes(uids.trim()).replaceAll(',', '\',\'');
        String jsonResp = client.query('Select id, name' + ((addPhotos) ? ', smallPhotoUrl' : '') + ' from User where id IN (\'' + uids + '\')');
        
        if (addPhotos) {
        	jsonResp = jsonResp.replaceAll('\"SmallPhotoUrl\":\"/([^\"]*?)"', '\"SmallPhotoUrl\":\"' + this.sm.instanceUrl + '/$1\"')
                       .replaceAll('\"SmallPhotoUrl\":\"([^\"]*?)"', '\"SmallPhotoUrl\":\"$1?oauth_token=' + this.sm.accessToken + '\"');
        }
        
        return jsonResp;
    }
    
    private String searchContacts() {
    	String text = System.currentPageReference().getParameters().get('text');
    	String response = null;
    	
    	if (text != null && text.trim().length() > 0) {
    		text = String.escapeSingleQuotes(text.trim()).replaceAll('([{}])', '\\$1');
	    	String sosl = 'Find {' + text + '* } IN NAME FIELDS ' +
	    	              'RETURNING Contact (Id, FirstName, LastName, Name, Account.Name LIMIT 200)';
	        response = client.search(sosl);
    	}
    	
    	if (response == null) response = '[]';
    	return response;
    }
    
    private String fetchActivities() {
        String cids = System.currentPageReference().getParameters().get('ids');
        String[] cidArray = String.escapeSingleQuotes(cids.trim()).split(',');
        
        String tasks, events;
        
        if (cids.trim().length() > 0 && cidArray.size() > 0) {
	        String filter = 'whoId IN (' + ContactsAppUtil.createCSVFromList(cidArray, true) + ')';
	        
	        tasks = client.query('Select id, subject, status, IsClosed, ActivityDate, Owner.Id, Owner.name, Who.Id, Who.name, lastmodifieddate from Task where ' + filter + ' order by ActivityDate desc, id desc limit 50');
	        events = client.query('Select id, subject, location, ActivityDate, Owner.Id, Owner.name, Who.Id, Who.name, lastmodifieddate from Event where ' + filter + ' order by ActivityDate desc, id desc limit 50');
        } else {
        	tasks = events = '{}';
        }
        
        return '{"tasks":' + tasks + ', "events":' + events + '}';
    }
    
    private String getContactDescribe() {
    	String val = client.describe('Contact');
    	
    	String accDesc = client.sobject('Account');
    	accDesc = accDesc.split('"label"\\s*:\\s*"', 2)[1];
    	String accLabel = accDesc.substring(0, accDesc.indexOf('"'));
    	
    	Integer idx = val.indexOf('"relationshipName":"Account"');
    	if (idx > 0) {
    		val = val.subString(0, idx) + '"relationshipLabel":"' + accLabel + '",' + val.subString(idx);
    	}
    	
    	return val;
    }
    
    private String manageEula() {
    	
    	String clientId = System.currentPageReference().getParameters().get('clientId');
    	String eulaResponse = System.currentPageReference().getParameters().get('eulaResponse');
    	
    	Map<String, String> response = new Map<String, String>();
    	response.put('success', 'false');
    	response.put('errorCode', 'INVALID_CLIENT');
        response.put('error', System.Label.NotValidClientPleaseRelogin);
    	
    	if (clientId != null && clientId.trim().length() > 0) {
    	   List<AppClient__c> appClients = [SELECT id, AppUser__c FROM AppClient__c WHERE id = :clientId.trim()];
    	   if (appClients != null && !appClients.isEmpty()) {
    	       List<AppUser__c> appUserList = [SELECT id, UserID__c, OrganizationID__c, EULA__c FROM AppUser__c where id = :appClients[0].AppUser__c];
    	       if (appUserList != null && !appUserList.isEmpty()) {
    	           String userInfoStr = client.getUserInfo();
    	           JSONObject userInfo = JSONObject.newInstance(client.getUserInfo());
    	           if(userInfo != null && userInfo.get('user_id').value() == appUserList[0].UserID__c && 
    	               userInfo.get('organization_id').value() == appUserList[0].OrganizationID__c) {
                       if(eulaResponse != null && eulaResponse.trim().equalsIgnoreCase('accept')) {
                            appUserList[0].Eula__c = true;
                            appUserList[0].EULA_Acceptance_Date__c = DateTime.now();
                            upsert appUserList;
                            response.put('success', 'true');
                            response.remove('errorCode');
                            response.remove('error');
                       } else {
                            response.put('errorCode', 'INVALID_RESPONSE');
                            response.put('error', System.Label.NotValidResponse);
                       }
    	           }
    	       }
    	   }
    	}
    	
    	return JSONObject.createSimpleJson(response);
    }
    
}