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

public with sharing class SfdcOAuthManager {

    public static final String LOGIN_URL = 'https://login.salesforce.com';
    public static final String CLIENT_ID, CLIENT_SECRET, REDIRECT_URI;
    
    private static final String ACCESS_TOKEN_COOKIE = 'oauth_access_token';
    private static final String INSTANCE_URL_COOKIE = 'oauth_instance_url';
    private static final String REFRESH_TOKEN_COOKIE = 'oauth_refresh_token';
    private static final String USERID_COOKIE = 'oauth_uid_token';
    
    private static final String PRIVATE_KEY;
    
    static {
    	ContactsAppSettings__c cas = ContactsAppSettings__c.getOrgDefaults();
    	CLIENT_ID = cas.OAuthClientId__c;
        CLIENT_SECRET = cas.OAuthClientSecret__c;
        REDIRECT_URI = cas.OAuthClientRedirectURI__c;
        PRIVATE_KEY = cas.encryptionKey__c;
    }
    
    public class OAuthException extends Exception {
        public String errorCode {get; private set;}
        public String message {get; private set;}
        private OAuthException(String errorCode, String msg) {
            this(msg);
            this.errorCode = errorCode;
            this.message = msg;
        }
    }
                
    public class OAuthResponse {
    
        private OAuthResponse() {}
        
	    public String userId {get; private set;}
	    public String userInfoUri {get; private set;}
	    public String accessToken {get; private set;}
	    public String instanceUrl {get; private set;}
	    private String refreshToken {get; set {
	            this.refreshToken = value;
	            this.encryptedRefreshToken = ContactsAppUtil.encrypt(PRIVATE_KEY, this.refreshToken);
	        }
	    }
	    
	    public String encryptedRefreshToken {get; private set;}
	    
	    public void setOAuthCookies(boolean includeRefreshToken) {
	        Cookie accessToken, refreshToken, instanceUrl;
	        List<Cookie> oauthCookies = new List<Cookie>();
	        
	        if (this.accessToken != null) {
	            oauthCookies.add(new Cookie(ACCESS_TOKEN_COOKIE, this.accessToken, null, -1, true));
	        }
	        if (this.instanceUrl != null) {
	            oauthCookies.add(new Cookie(INSTANCE_URL_COOKIE, this.instanceUrl, null, -1, true));
	        }
	        if (includeRefreshToken && this.encryptedRefreshToken != null) {
	            oauthCookies.add(new Cookie(REFRESH_TOKEN_COOKIE, this.encryptedRefreshToken, null, -1, true));
	        }
	        if (this.userInfoUri != null) {
	            oauthCookies.add(new Cookie(USERID_COOKIE, this.userInfoUri, null, -1, true));
	        }
	        ApexPages.currentPage().setCookies(oauthCookies);
	    }
	}
	
	public static OAuthResponse initializeRespFromCookies() {
        OAuthResponse authResp = new OAuthResponse();
        
        if (ApexPages.currentPage() != null) {
            Map<String, Cookie> cookies = ApexPages.currentPage().getCookies();
            
            Cookie acTkCookie = cookies.get(ACCESS_TOKEN_COOKIE);
            Cookie instUrlCookie = cookies.get(INSTANCE_URL_COOKIE);
            Cookie refTkCookie = cookies.get(REFRESH_TOKEN_COOKIE);
            Cookie uInfoUriCookie = cookies.get(USERID_COOKIE);
            
            if (acTkCookie != null) {
                authResp.accessToken = acTkCookie.getValue();
            }
            if (instUrlCookie != null) {
                authResp.instanceUrl = instUrlCookie.getValue();
            }
            if (refTkCookie != null) {
                authResp.encryptedRefreshToken = refTkCookie.getValue();
            }
            if (uInfoUriCookie != null) {
                authResp.userInfoUri = uInfoUriCookie.getValue();
                Integer userIdStart = authResp.userInfoUri.indexOf('005');
                authResp.userId = authResp.userInfoUri.subString(userIdStart);
            }
        }
        return authResp;
    }
	
	private static String getAccessTokenUrl() {
        return LOGIN_URL + '/services/oauth2/token';
    }
    
    private static OAuthResponse generateOAuthResponse(String jsonResp) {
        
        OAuthResponse oAuthResp = new OAuthResponse();
        
        Map<String, String> oauthRespMap = JSONObject.parseSimpleJson(jsonResp);
        
        for (String key : oauthRespMap.keySet()) {
            
            if (key == 'access_token') {
                oAuthResp.accessToken = oauthRespMap.get(key);
            } else if (key == 'refresh_token') {
                oAuthResp.refreshToken = oauthRespMap.get(key);
            } else if (key == 'instance_url') {
                oAuthResp.instanceUrl = oauthRespMap.get(key);
            } else if (key == 'id') {
            	oAuthResp.userInfoUri = oauthRespMap.get(key);
                Integer userIdStart = oAuthResp.userInfoUri.indexOf('005');
                oAuthResp.userId = oAuthResp.userInfoUri.subString(userIdStart);
            }
        }
        oAuthResp.userInfoUri = oAuthResp.userInfoUri.replace('https://login.salesforce.com', oAuthResp.instanceUrl);
        
        return oAuthResp;   
    }
    
    public static String getAuthorizeUserUrl(String host) {
        
        if (host != null && host.trim().length() > 0) {
        	host = host.trim();
        	if (host.startsWith('http://') || host.startsWith('https://')) {
        		host = host.replaceFirst('http[s]?://', '');
        	}
        	host = host.replace('[/]*$', '');
        }
        
        if (host == null || host.contains('/')) {
        	host = LOGIN_URL; 
        } else {
        	host = 'https://' + host;
        }
        
        return host + '/services/oauth2/authorize?response_type=code&display=touch&client_id=' + 
               CLIENT_ID + '&redirect_uri=' + REDIRECT_URI;
    }
    
    private static OAuthResponse sendOAuthRequest(HttpRequest req) {
    	Http h = new Http();
        try {
            HttpResponse res = h.send(req);
            
            if (res.getStatusCode() == 200) {
                String respBody = res.getBody();
                return generateOAuthResponse(respBody);
            } else {
                JSONObject error = JSONObject.newInstance(res.getBody());
                if (error != null) {
                	String errorMsg = error.get('error_description').value();
                	String errorCode = error.get('error').value();
                    if ('invalid_grant'.equalsIgnoreCase(errorCode)) {
                    	errorMsg = System.Label.SessionExpiredPleaselogoutAndRelogin;
                    }
                    throw new OAuthException(errorCode, errorMsg);
                } else
                   throw new OAuthException('OAUTH_FAILURE', System.Label.FailedToObtainOauthAccess);
            }
        } catch (CalloutException e) {
        	System.debug(e);
            throw new OAuthException('CONNECTION_FAILURE', System.Label.FailedToConnectToSalesforce);
        }
        return null;
    }
    
    public static OAuthResponse authenticateUser(String authCode) {
        
        HttpRequest req = new HttpRequest();
        req.setMethod('POST');
        req.setEndpoint(getAccessTokenUrl());
        req.setTimeout(20000);
        req.setBody('grant_type=authorization_code' + 
                    '&format=json' +
                    '&code=' + authCode +
                    '&client_id=' + CLIENT_ID + 
                    '&client_secret=' + CLIENT_SECRET + 
                    '&redirect_uri=' + REDIRECT_URI);
        
        return sendOAuthRequest(req);
    }
    
    private static OAuthResponse refreshAccessToken(String refreshToken) {
        
        HttpRequest req = new HttpRequest();
        req.setMethod('POST');
        req.setEndpoint(getAccessTokenUrl());
        req.setTimeout(20000);
        req.setBody('grant_type=refresh_token' + 
                    '&format=json' +
                    '&client_id=' + CLIENT_ID + 
                    '&client_secret=' + CLIENT_SECRET + 
                    '&refresh_token=' + refreshToken);
        
        return sendOAuthRequest(req);
    }
    
    public static OAuthResponse refreshAccessFromEncRefToken(String encRefToken) {
        
        String refreshToken = ContactsAppUtil.decrypt(PRIVATE_KEY, encRefToken);
        
        if (refreshToken != null) {
            OAuthResponse atResp = refreshAccessToken(refreshToken);
            atResp.refreshToken = refreshToken;
            return atResp;
        }
        
        return null;
    }
    
    
}