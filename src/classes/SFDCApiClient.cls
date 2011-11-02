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

public with sharing class SFDCApiClient {
	
	private static final String API_VERSION = '22.0';
	private SessionManager sm;
	
	private Integer requestRetryCount = 0;
	private static final Integer MAX_REQUEST_RETRIES = 2;
	
	public SFDCApiClient(SessionManager sm) {
		this.sm = sm;
	}
	
	public class ApiException extends Exception {
        public String errorCode {get; private set;}
        public String message {get; private set;}
        private ApiException(String errorCode, String msg) {
            this(msg);
            this.errorCode = errorCode;
            this.message = msg;
        }
    }
	
	private HttpRequest initializeRequest() {
		HttpRequest req = new HttpRequest();
        req.setHeader('Authorization', 'OAuth ' + sm.accessToken);
        req.setCompressed(true);
        return req;
	}
	
	private String makeRequest(HttpRequest req) {
		Http h = new Http();
		HttpResponse resp = h.send(req);
		
		if (resp.getStatusCode() == 200) {
			this.requestRetryCount = 0;
			return resp.getBody();
		} else if (resp.getStatusCode() == 401) {
			if (this.requestRetryCount++ < MAX_REQUEST_RETRIES) {
			    this.sm.refreshSession();
			    makeRequest(req);
			}
		} else if (resp.getStatusCode() == 403) {
			throw new ApiException('NO_API_ACCESS', System.Label.APIIsNotAccessibleToCurrentUser);
		}
		return null;
	}
	
	private String doGet(String path, Map<String,String> params) {
		HttpRequest req = initializeRequest();
		req.setMethod('GET');
		
		String url = sm.instanceUrl + '/services/data/v' + API_VERSION + path;
		if (params != null && params.size() > 0) {
			url += '?';
			Integer idx = 1;
			for (String key : params.keySet()) {
				url += (key + '=' + EncodingUtil.urlEncode(params.get(key), 'UTF-8'));
				if (idx++ < params.size()) {
					url += '&';
				}
			}
		}
		req.setEndpoint(url);
		
		return makeRequest(req);
	}
	
	public String getUserInfo() {
		HttpRequest req = initializeRequest();
        req.setMethod('GET');
        req.setEndpoint(this.sm.userInfoUri);
        
		return makeRequest(req);
	}
	
	public String query(String query) {
		return doGet('/query', new Map<String, String>{ 'q' => query });
	}
	
	public String details(String sobjectType, Id oid, String[] fieldset) {
        return doGet('/sobjects/'+ sobjectType+ '/'+ oid, new Map<String, String>{ 'fields' => ContactsAppUtil.createCSVFromList(fieldset) });
    }
    
    public String sobject(String sobjectType) {
        return doGet('/sobjects/'+ sobjectType, null);
    }
    
    public String describe(String sobjectType) {
        return doGet('/sobjects/'+ sobjectType + '/describe', null);
    }
    
    public String search(String sosl) {
        return doGet('/search', new Map<String, String>{ 'q' => sosl });
    }
    
    public SFDCPartnerSoap.DescribeLayoutResult describeLayout(String sObjectType, Id[] recordTypeIds) {
    	SFDCPartnerSoap.Soap soapClient = new SFDCPartnerSoap.Soap();
    	soapClient.setInstanceUrl(sm.instanceUrl);
    	soapClient.setSessionId(sm.accessToken);
    	
    	return soapClient.describeLayout(sObjectType, recordTypeIds);
    }
    
    public SFDCPartnerSoap.DescribeSObjectResult describeSObjectSOAP(String sObjectType) {
        SFDCPartnerSoap.Soap soapClient = new SFDCPartnerSoap.Soap();
        soapClient.setInstanceUrl(sm.instanceUrl);
        soapClient.setSessionId(sm.accessToken);
        
        return soapClient.describeSObject(sObjectType);
    }
}