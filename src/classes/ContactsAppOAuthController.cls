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

@RestResource(urlMapping='/oauth2/*')
global with sharing class ContactsAppOAuthController {
    
    /** SOME CONSTANTS TO BE USED IN THIS CLASS **/
    private static final String PASS_KEY = 'pass'; // Key to store the passcode hash 
    private static final String TOKEN_ID_KEY = 'tokenId'; // key to store the random token generated for user
    private static final String INSTANCE_URL_KEY = 'instanceUrl'; // key to store the client record id 
    private static final String REF_TOKEN_KEY = 'encRefToken'; // key to store the encrypted refresh token
    private static final Integer MAX_FAILURE_COUNT = 5; // Maximum number of failed login attempts, i.e. wrong passcode
    private static final Integer MIN_PASSCODE_LEN = 4; // Minimum required length of the passcode
        
    // API operation initiated by the user (refresh, authenticate)
    public ApiResponse apiResp {get; private set;} { this.apiResp = new ApiResponse(); }
    
    /** Class representing the API Response from this controller **/
    global class ApiResponse {
        
        private ApiResponse() {} //Make constructor private.
        
        private Id clientId {get; set;} // Client identifier to pull the encryption key. This identifier is also sent to client side for future authentication.
        private String authToken {get; set;} // Encrypted token to be stored on client side for future access
        private String instanceUrl {get; set;}
        private String username {get; set;}
        private String displayName {get; set;}
        private boolean eulaAccepted {get; set;} {this.eulaAccepted = false;}
        private String errorCode {get; set;}
        private String errorMsg {get; set;}
        private String sessionToken {get; set;}
        private boolean success {get; set;} {this.success = false;} // Flag to check if request was successfull.
        
        global override String toString() {
            Map<String, Object> responseMap = new Map<String, Object>();
            responseMap.put('success', this.success);
            responseMap.put('clientId', this.clientId);
            responseMap.put('username', this.username);
            responseMap.put('displayName', this.displayName);
            responseMap.put('instanceUrl', this.instanceUrl);
            responseMap.put('eula', this.eulaAccepted);
            responseMap.put('error', this.errorMsg);
            responseMap.put('errorCode', this.errorCode);
            responseMap.put('sessionToken', this.sessionToken);
            
            if (this.authToken != null) 
                responseMap.put('refreshToken', EncodingUtil.urlEncode(this.authToken, 'UTF-8'));
            
            String respStr =  JSON.serialize(responseMap);
            System.debug('OAuth resp:' + respStr);
            return respStr;
        }
    }
    
    /** Class to handle any authentication errors **/
    private class AuthenticationException extends Exception {
        public String errorCode {get; private set;}
        public String message {get; private set;}
        private AuthenticationException(String errorCode, String msg) {
            this(msg);
            this.errorCode = errorCode;
            this.message = msg;
        }
    }
    
    /** 
    * Handles all the API requests for OAuth based authentication
    * Supports calls to:
    * 1) /oauth/authenticate - To obtain access & refresh tokens using the oauth code.
    *    Returns: JSON response containing basic user info, sessionToken for subsequent calls & refreshToken for obtaining a new sessionToken.
    * 2) /oauth/refreshAccess - To obtain the session token given a refreshToken that was returned on /authenticate call
    *    Returns: JSON response containing basic user info, sessionToken for subsequent calls.
    **/
    @HttpPost
    global static void doPost() {
        
        ContactsAppOAuthController cont = new ContactsAppOAuthController();
        
        // Based on request type, choose the appropriate operation
        if (RestContext.request.requestURI.endsWith('/refreshAccess')) {
            cont.refreshAccess(RestContext.request);
            
        } else if (RestContext.request.requestURI.endsWith('/authenticate')) {
            cont.obtainAccess(RestContext.request);
            
        // To be used to convert existing oauth session info to contact viewer session
        } else if (RestContext.request.requestURI.endsWith('/prepareSession')) { 
            cont.prepareSession(RestContext.request);
            
        } else if (RestContext.request.requestURI.endsWith('/revokeSession')) {
        	cont.revokeSession(RestContext.request);
        	
        } else { // If none of the above operations, return a 404
            RestContext.response.statusCode = 404;
        }
        
        RestContext.response.responseBody = Blob.valueOf(cont.apiResp.toString());
    } 
    
    @HttpGet
    global static void doGet() {
        String doAuthorize = RestContext.request.params.get('doAuthorize');
        if (doAuthorize != null) {
            String host = RestContext.request.params.get('host');
            RestContext.response.statusCode = 302;
            RestContext.response.addHeader('Location', SfdcOAuthManager.getAuthorizeUserUrl(host));
        }
    } 
    
    /**
    * Converts an existing oauth session to contact viewer session.
    **/
    private void prepareSession(RestRequest req) {
    	SfdcOAuthManager.OAuthResponse oauthInfo = null;
    	
    	String accessToken = req.params.get('accessToken'), 
               instanceUrl = req.params.get('instanceUrl'), 
               identityUrl = req.params.get('identityUrl');
        
        if (accessToken != null && instanceUrl != null && identityUrl != null) {
        	oauthInfo = SfdcOAuthManager.initialize(accessToken, instanceUrl, identityUrl);
        } else {
	        SessionManager sm = new SessionManager(req.headers);
	        oauthInfo = (sm.isValid()) ? sm.getOAuthResponse() : null;
        }
        if (oauthInfo != null) setupResponse(oauthInfo, null);
    }
    
    /**
    * Revokes an existing OAuth 2.0 session.
    **/
    private void revokeSession(RestRequest req) {
    	String clientId = req.params.get('cid'), 
               clientAuthToken = req.params.get('rt');
        
        if (clientId != null && clientAuthToken != null) {
        	Map<String, String> tokenParts = parseClientAuthToken(getClientById(clientId), clientAuthToken);
        	if (tokenParts != null && tokenParts.size() > 0) {
                SfdcOAuthManager.revokeAccess(tokenParts.get(INSTANCE_URL_KEY), tokenParts.get(REF_TOKEN_KEY));
                this.apiResp.success = true;
        	}    
        } else {
        	SessionManager sm = new SessionManager(req.headers);
	        if (sm != null && sm.isValid()) {
	            this.apiResp.success = sm.destroy();
	        }
        }
    }
    
    /** 
    * Obtains a fresh user session provided a valid clientId, client side refreshToken 
    * and the user passcode that was set during /authenticate call 
    **/
    private void refreshAccess(RestRequest req) {
        
        String clientId = req.params.get('cid'), 
               passcode = req.params.get('pass'), 
               clientSideRefToken = req.params.get('rt');
        
        System.debug('Encrypted token with Pass:' + clientSideRefToken);
        
        AppClient__c client = getClientById(clientId);
        
        if (client != null && clientSideRefToken != null && clientSideRefToken.length() > 0) {
            
            try {
                SfdcOAuthManager.OAuthResponse oauthInfo = validateAndGetOAuthInfo(client, clientSideRefToken, passcode);
                
                if (oauthInfo != null) {
                    setupResponse(oauthInfo, client);
                } else {
                    this.apiResp.success = false;
                    this.apiResp.errorMsg = 'Invalid passcode';
                }
            } catch (AuthenticationException ae) {
                this.apiResp.success = false;
                this.apiResp.errorMsg = ae.message;
                this.apiResp.errorCode = ae.errorCode;
            } catch (SfdcOAuthManager.OAuthException exp) {
                this.apiResp.success = false;
                this.apiResp.errorCode = exp.errorCode;
                this.apiResp.errorMsg = exp.message;
            }
            
            upsertAppClient(client, req.headers.get('User-Agent'));
        }
    }
    
    /** 
    * Obtains a fresh user session provided an oauth code that was returned by salesforce after oauth approval,
    * and the user passcode that will be used to protect the refresh token for future authentication calls. 
    **/
    private void obtainAccess(RestRequest req) {
        
        String code = req.params.get('code'), 
               passcode = req.params.get('pass'),
               host = req.params.get('host');
               
        if (code != null) {
                
            try {
                SfdcOAuthManager.OAuthResponse oauthInfo = SfdcOAuthManager.authenticateUser(host, code);
                if (oauthInfo != null) {
                    AppClient__c client = setupAppClient(passcode, oauthInfo);
                    setupResponse(oauthInfo, client);
                    upsertAppClient(client, req.headers.get('User-Agent'));
                }
            } catch (SfdcOAuthManager.OAuthException exp) {
                this.apiResp.success = false;
                this.apiResp.errorCode = exp.errorCode;
                this.apiResp.errorMsg = exp.message;
            }
        }
    }
    
    private void setupResponse(SfdcOAuthManager.OAuthResponse oauthInfo, AppClient__c client) {
        this.apiResp.success = true;
        this.apiResp.instanceUrl = oauthInfo.instanceUrl;
        this.apiResp.sessionToken = oauthInfo.serialize();
        
        Map<String, String> userInfo = initializeUserInfo(oauthInfo);
        AppUser__c appUser = upsertAppUser(userInfo);
        if (appUser != null) {
            this.apiResp.eulaAccepted = appUser.EULA__c;
            if (client != null && client.AppUser__c == null) client.AppUser__c = appUser.id;
        }
    }
    
    /**
    * Initialize user info after user authentication has been done.
    **/
    private Map<String, String> initializeUserInfo(SfdcOAuthManager.OAuthResponse oauthInfo) {
        
        BaseServiceController service = new BaseServiceController(oauthInfo);
        String userInfoJson = service.getApiClient().getUserInfo();
        Map<String, String> userInfo = JSONObject.parseSimpleJson(userInfoJson);
        this.apiResp.username = userInfo.get('username');
        this.apiResp.displayName = userInfo.get('display_name');
        
        return userInfo;
    }
    
    /**
    * Query the Client info based on the provided client id.
    **/
    private static AppClient__c getClientById(Id cId) {
        if (cId != null) {
            List<AppClient__c> clients = [SELECT id, token_id__c, AppUser__c, Failure_Count__c, Encryption_Key__c FROM AppClient__c WHERE id = :cId];
            if (clients != null && !clients.isEmpty()) {
                return clients[0];
            }
        }
        return null;
    }
    
    /**
    * Decrypt the client side ref token and validate user passcode. 
    * If passcode is correct, return the oauth refresh token from the encrypted string.
    **/
    private SfdcOAuthManager.OAuthResponse validateAndGetOAuthInfo(AppClient__c client, String clientAuthToken, String passcode) {
        
        //Get all the parts
        Map<String, String> clientSideRefTokenParts = parseClientAuthToken(client, clientAuthToken);
        
        if (clientSideRefTokenParts != null && clientSideRefTokenParts.size() > 0) {
            
            String tokenId = clientSideRefTokenParts.get(TOKEN_ID_KEY);
            String savedPasscode = clientSideRefTokenParts.get(PASS_KEY);
            String instanceUrl = clientSideRefTokenParts.get(INSTANCE_URL_KEY);
            String refToken = clientSideRefTokenParts.get(REF_TOKEN_KEY);
            
            if ((client.token_id__c == null || client.token_id__c == tokenId) && 
                (client.Failure_Count__c == null || client.Failure_Count__c < MAX_FAILURE_COUNT)) {
                    
                String passcodeHash = ContactsAppUtil.generateHash(passcode);
                if (savedPasscode != null && savedPasscode.length() > 0 
                    && (savedPasscode.equals(passcode) || savedPasscode.equals(passcodeHash))) {
                    client.Failure_Count__c = 0;
                    return SfdcOAuthManager.refreshAccessFromEncRefToken(instanceUrl, refToken);
                } else {
                    if (client.Failure_Count__c == null) client.Failure_Count__c = 0;
                    client.Failure_Count__c++;
                    if (client.Failure_Count__c == MAX_FAILURE_COUNT) {
                        client.Inactive__c = true;
                        client.Encryption_Key__c = null;
                    }
                    throw new AuthenticationException('WRONG_PASSCODE', System.Label.TryAgainRemainingAttempts + ': ' + (MAX_FAILURE_COUNT - client.Failure_Count__c));
                }
            } else {
                throw new AuthenticationException('INVALID_TOKEN', System.Label.InvalidTokenPleaseLogoutAndRelogin);
            }
        }
        
        return null;   
    }
    
    private Map<String, String> parseClientAuthToken(AppClient__c client, String clientAuthToken) {
    	
    	String privatekey = (client != null) ? client.Encryption_Key__c : null;
        
        if (client != null && privatekey != null && privatekey.length() > 0) {
            // Let's decrypt this first
            String decryptedString = ContactsAppUtil.decrypt(privatekey, clientAuthToken);
            
            //Get all the parts
            return (Map<String, String>)JSON.deserialize(decryptedString, Map<String, String>.class);
        } else {
            throw new AuthenticationException('INVALID_TOKEN', System.Label.AuthenticationFailurePleaseRelogin);
        }
    }
    
    /**
    * Perform required post authentication operations to update the client info in database 
    * and create encrypted client side refresh token. 
    **/
    private AppClient__c setupAppClient(String passcode, SfdcOAuthManager.OAuthResponse oauthInfo) {
            
        AppClient__c client = new AppClient__c();
        
        System.debug('Checking valid passcode: ' + passcode);
        if (passcode != null && passcode.trim().length() >= MIN_PASSCODE_LEN) {
            
            client.token_id__c = String.valueOf(Crypto.getRandomLong());
            client.Encryption_Key__c = EncodingUtil.base64Encode(Crypto.generateAesKey(128));
            
            String clientSideRefToken = JSON.serialize(new Map<String, String> {
                PASS_KEY => ContactsAppUtil.generateHash(passcode.trim()), 
                TOKEN_ID_KEY => client.token_id__c,
                INSTANCE_URL_KEY => oauthInfo.instanceUrl,
                REF_TOKEN_KEY => oauthInfo.encryptedRefreshToken
            });
            this.apiResp.authToken = ContactsAppUtil.encrypt(client.Encryption_Key__c, clientSideRefToken);
        }
        
        return client;
    }
    
    /**
    * Log user and client info in the database.
    **/
    private AppUser__c upsertAppUser(Map<String, String> userInfo) {
        
        AppUser__c appUser = null;
        
        if (userInfo != null) {
            
            String userId = userInfo.get('user_id');
            String orgId = userInfo.get('organization_id');
            
            List<AppUser__c> users = [SELECT Eula__c FROM AppUser__c where UserID__c = :userId AND OrganizationID__c = :orgId];
            if (users != null && !users.isEmpty()) {
                appUser = users[0];
            } else {
                appUser = new AppUser__c();
            }
            
            appUser.Name = userInfo.get('display_name');
            appUser.Username__c = userInfo.get('username');
            appUser.UserID__c = userId;
            appUser.OrganizationID__c = orgId;
            appUser.Email__c = userInfo.get('email');
            
            upsert new AppUser__c[] { appUser };
        }
        return appUser;
    }
    
    private AppClient__c upsertAppClient(AppClient__c client, String userAgent) {
        
        if (client != null) {
            client.UserAgent__c = (userAgent != null) ? userAgent.substring(0, Math.min(255, userAgent.length())) : null;
            upsert new AppClient__c[]{client};
            
            if (this.apiResp.success)
               upsert new AppLogin__c[]{new AppLogin__c(AppClient__c = client.Id)};
            
            this.apiResp.clientId = client.Id;
        }
        return client;
    }

}