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

//@RestResource(urlMapping='/oauth2')
global with sharing class ContactsAppOAuthController {
    
    private static final String PASS_KEY = 'pass';
    private static final String TOKEN_ID_KEY = 'tokenId';
    private static final String CLIENT_ID_KEY = 'clientId';
    private static final String REF_TOKEN_KEY = 'encRefToken';
    
    private static final Integer MAX_FAILURE_COUNT = 5;
    private static final Integer MIN_PASSCODE_LEN = 4;
        
    private SfdcOAuthManager.OAuthResponse resp {get; set;}
    public String encryptedRefreshToken {get; private set;}
    public String clientId {get; private set;}
    public Boolean isSuccess {get; private set;} {this.isSuccess = false;}
    public Boolean isValidPasscode {get; private set;} {this.isValidPasscode = false;}
    public String errorMsg {get; private set;}
    public String errorCode {get; private set;}
    public String username {get; private set;}
    public String displayName {get; private set;}
    public String instanceUrl {get; private set;}
    public boolean eulaAccepted {get; private set;} {this.eulaAccepted = false;}
    
    private AppClient__c client;
    private AppUser__c appUser;
    private String operation, passcode;
    private Map<String, String> userInfo;
    
    private class AuthenticationException extends Exception {
    	public String errorCode {get; private set;}
    	public String message {get; private set;}
    	private AuthenticationException(String errorCode, String msg) {
    		this(msg);
    		this.errorCode = errorCode;
    		this.message = msg;
    	}
    }
    
    public ContactsAppOAuthController() {
    	initalize();
    }
    
    public void initalize() {
        
        String doRefresh = System.currentPageReference().getParameters().get('doRefresh');
        if (doRefresh != null) {
        	this.operation = 'refresh';
        	
        	String clientSideRefToken = System.currentPageReference().getParameters().get('rt');
        	
            System.debug('Encrypted token with Pass:' + clientSideRefToken);
            
            if (clientSideRefToken != null && clientSideRefToken.length() > 0) {
            	
            	try {
	            	String encRefToken = validatePasscodeAndGetRefToken(clientSideRefToken);
	            	
	            	if (encRefToken != null) {
		            	this.resp = SfdcOAuthManager.refreshAccessFromEncRefToken(encRefToken);
		                this.resp.setOAuthCookies(true);
		                this.isSuccess = true;
	            	} else {
	            		this.isSuccess = false;
	            		this.errorMsg = 'Invalid passcode';
	            	}
            	} catch (AuthenticationException ae) {
            		this.isSuccess = false;
            		this.errorMsg = ae.message;
            		this.errorCode = ae.errorCode;
            	} catch (SfdcOAuthManager.OAuthException exp) {
                    this.isSuccess = false;
                    this.errorCode = exp.errorCode;
                    this.errorMsg = exp.message;
                }
            }
        }
        
        String code = System.currentPageReference().getParameters().get('code');
        if (code != null) {
        	this.operation = 'authenticate';
        	
        	try {
        	    this.resp = SfdcOAuthManager.authenticateUser(code);
            
                if (this.resp != null) {
	                this.client = new AppClient__c( token_id__c = String.valueOf(Crypto.getRandomLong()) );
	                this.passcode = System.currentPageReference().getParameters().get('pass');
	            
	                if (this.passcode != null && this.passcode.trim().length() >= MIN_PASSCODE_LEN) {
	            	    this.passcode = ContactsAppUtil.generateHash(this.passcode.trim());
	            	    this.isValidPasscode = true;
	                }
	                this.resp.setOAuthCookies(this.isValidPasscode);
	                this.isSuccess = true;
                }
            } catch (SfdcOAuthManager.OAuthException exp) {
            	this.isSuccess = false;
            	this.errorCode = exp.errorCode;
            	this.errorMsg = exp.message;
            }
        }
        
        if (this.isSuccess) {
        	this.instanceUrl = this.resp.instanceUrl;
        	
            Http h = new Http();
            HttpRequest req = new HttpRequest();
            req.setHeader('Authorization', 'OAuth ' + this.resp.accessToken);
            req.setCompressed(true);
            req.setMethod('GET');
            req.setEndpoint(this.resp.userInfoUri);
            
            HttpResponse resp = h.send(req);
            
            if (resp.getStatusCode() == 200) {
                this.userInfo = JSONObject.parseSimpleJson(resp.getBody());
                this.username = this.userInfo.get('username');
                this.displayName = this.userInfo.get('display_name');
                System.debug(username);
            }
        }
    }
    
    private static AppClient__c getClientById(String cId) {
    	if (cId != null && cId.trim().length() > 0) {
            List<AppClient__c> clients = [SELECT id, token_id__c, AppUser__c, Failure_Count__c, Encryption_Key__c FROM AppClient__c WHERE id = :cId];
            if (clients != null && !clients.isEmpty()) {
                return clients[0];
            }
        }
        return null;
    }
    
    private String validatePasscodeAndGetRefToken(String clientSideString) {
    	
    	String privatekey;
    	this.clientId = System.currentPageReference().getParameters().get('cid');
    	this.passcode = System.currentPageReference().getParameters().get('pass');
    	
        this.client = getClientById(this.clientId);
        
    	if (this.client != null) {
            privatekey = this.client.Encryption_Key__c;
            this.clientId = this.client.id;
    	}
    	
    	if (this.client != null && privatekey != null && privatekey.length() > 0) {
	    	// Let's decrypt this first
	    	String decryptedString = ContactsAppUtil.decrypt(privatekey, clientSideString);
	        
	        //Get all the parts
	        Map<String, String> clientSideRefTokenParts = JSONObject.parseSimpleJson(decryptedString);
	        
	        if (clientSideRefTokenParts != null && clientSideRefTokenParts.size() > 0) {
	        	String tokenId = clientSideRefTokenParts.get(TOKEN_ID_KEY);
	        	String savedPasscode = clientSideRefTokenParts.get(PASS_KEY);
	        	String refToken = clientSideRefTokenParts.get(REF_TOKEN_KEY);
	        	String savedClientId = clientSideRefTokenParts.get(CLIENT_ID_KEY);
	        	
	        	if (this.client.AppUser__c != null) {
	        	   List<AppUser__c> appUserList = [SELECT id, EULA__c FROM AppUser__c WHERE Id = :this.client.AppUser__c];
	                if (appUserList != null && appUserList.size() > 0) {
		                this.appUser = appUserList[0];
		                this.eulaAccepted = this.appUser.EULA__c;
		            }
	        	}
	        	
	            System.debug(this.client.token_id__c + ':' + tokenId);
	            System.debug(this.clientId);
	            
	            if (this.client != null && (this.client.token_id__c == null || this.client.token_id__c == tokenId) && 
	                (this.client.Failure_Count__c == null || this.client.Failure_Count__c < MAX_FAILURE_COUNT)) {
	            	String passcodeHash = ContactsAppUtil.generateHash(this.passcode.trim());
	                if (savedPasscode != null && savedPasscode.length() > 0 
	                    && (savedPasscode.equals(this.passcode.trim()) || savedPasscode.equals(passcodeHash))) {
	                	this.client.Failure_Count__c = 0;
	                    return refToken;
	                } else {
	                	if (this.client.Failure_Count__c == null) this.client.Failure_Count__c = 0;
	                	this.client.Failure_Count__c++;
	                	if (this.client.Failure_Count__c == MAX_FAILURE_COUNT) {
	                		this.client.Inactive__c = true;
	                		this.client.Encryption_Key__c = null;
	                	}
	                    throw new AuthenticationException('WRONG_PASSCODE', System.Label.TryAgainRemainingAttempts + ': ' + (MAX_FAILURE_COUNT - this.client.Failure_Count__c));
	                }
	            } else {
	            	throw new AuthenticationException('INVALID_TOKEN', System.Label.InvalidTokenPleaseLogoutAndRelogin);
	            }
	        	
	        } else {
	        	return clientSideString;
	        }
    	} else {
    		throw new AuthenticationException('INVALID_TOKEN', System.Label.AuthenticationFailurePleaseRelogin);
    	}
        
        return null;   
    }
    
    public PageReference loadPage() {
        
        String doAuthorize = System.currentPageReference().getParameters().get('doAuthorize');
        if (doAuthorize != null) {
        	String host = System.currentPageReference().getParameters().get('host');
            return new PageReference(SfdcOAuthManager.getAuthorizeUserUrl(host));
        } else if (this.operation == 'refresh' && this.client != null) {
        	upsertClientAndUser(); 
        } else if (this.operation == 'authenticate' && this.isSuccess) {
            
            upsertClientAndUser();
            this.clientId = this.client.Id;
            
            if (this.isValidPasscode) {
	            String clientSideRefToken = JSONObject.createSimpleJson(new Map<String, String> {
	                PASS_KEY => this.passcode, 
	                TOKEN_ID_KEY => this.client.token_id__c,
	                CLIENT_ID_KEY => this.client.id, 
	                REF_TOKEN_KEY => this.resp.encryptedRefreshToken
	            });
	            
	            this.client.Encryption_Key__c = EncodingUtil.base64Encode(Crypto.generateAesKey(128));
	            this.encryptedRefreshToken = ContactsAppUtil.encrypt(this.client.Encryption_Key__c, clientSideRefToken);
	            
	            update new AppClient__c[]{this.client};
            }
        }
        
        return null;
    }
    
    
    private void upsertClientAndUser() {
    	
    	if (this.userInfo != null) {
    		
    		String userId = this.userInfo.get('user_id');
    		String orgId = this.userInfo.get('organization_id');
    		
    		if (this.appUser == null) {
    			List<AppUser__c> users = [SELECT Eula__c FROM AppUser__c where UserID__c = :userId AND OrganizationID__c = :orgId];
    			if (users != null && !users.isEmpty()) {
    				this.appUser = users[0];
    				this.eulaAccepted = this.appUser.EULA__c;
    			} else {
    			    this.appUser = new AppUser__c();
    			}
    		}
    		
	    	this.appUser.Name = this.userInfo.get('display_name');
	        this.appUser.UserID__c = userId;
	    	this.appUser.OrganizationID__c = orgId;
	        
	        upsert new AppUser__c[] { this.appUser };
	        
	        this.client.AppUser__c = this.appUser.id;
	        this.client.Last_Login__c = DateTime.now();
    	}
        
        upsert new AppClient__c[]{this.client};
    }

}