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
 
var ManageUserSession = (function() {

    var sfdc_token_storage_key = 'SFDC-OAUTH-TOKEN';
    var sfdc_clientId_storage_key = 'SFDC-CLIENT-ID';
    var login_host_storage_key = 'SFDC-LOGIN-HOST';
    var login_host_url_storage_key = 'SFDC-LOGIN-HOST-URL';
    var session_token_storage_key = 'SFDC-SESSION-TOKEN';
    
    var sf, sessionAlive, username, instanceUrl, eulaAccepted;
    var isStandalone = ('standalone' in navigator && navigator.standalone);

    function storeOAuthValues(cid, rt) {
        if (cid && cid.length > 0) StorageManager.setLocalValue(sfdc_clientId_storage_key, cid);
        if (rt && rt.length > 0) StorageManager.setLocalValue(sfdc_token_storage_key, rt);
    }
    
    function prepareSession(response) {
    	sessionAlive = true;
		username = response.username;
		instanceUrl = response.instanceUrl;
		eulaAccepted = response.eula;
		sf.setSessionHeader(response.sessionToken);
		StorageManager.setSessionValue(session_token_storage_key, response.sessionToken);
    }
    
    function resurrectSession(sessionToken, onSuccess) {
    	sf.setSessionHeader(sessionToken);
    	
    	var errorCallback = function() {
    		sf.setSessionHeader(null);
    		StorageManager.clearSessionValue(session_token_storage_key);
    		ManageUserSession.initialize(onSuccess);
    	}
    	
    	var successCallback = function(response) {
    		if (response.success) {
    			prepareSession(response);
    			if (typeof onSuccess == 'function') onSuccess();
    		} else errorCallback();
    	};
    	
    	sf.prepareSession(successCallback, errorCallback);
    }

    function authenticate(callback) {

        var validatePasscodeAndRefreshSession = function(passcode, pmcallback) {
        
            // Logout Action
            if (passcode == -1) {
                var resp = confirm('Logout user?');
                if (resp) logout(true);
                else if (typeof pmcallback == 'function') pmcallback(false);
            } else {
                var ind = $j(document).showActivityInd(loadingImg, 'Authenticating...', false);
                
                var checkResponse = function(response) {
                
                    if (response.success) {
                    	prepareSession(response);
                        
                        if (typeof pmcallback == 'function') pmcallback(true);
                        if (typeof callback == 'function') callback();
                        
                    } else {
                        if (response.errorCode == 'INVALID_TOKEN') StorageManager.clearAll();
                        if (typeof pmcallback == 'function') pmcallback(response.success, response.error);
                    }
                }
            
                var errorCallback = function(jqXHR, statusText) {
                    var msg;
                    if (statusText == 'error') {
                        msg = 'Server Unavailable. Check network connection or try again later.';
                    } else if (statusText = 'timeout') {
                        msg = 'Request timed out. Please try again.';
                    }
                    if (typeof pmcallback == 'function') pmcallback(false, msg);
                }
        
                var clientId = StorageManager.getLocalValue(sfdc_clientId_storage_key);
                var refToken = StorageManager.getLocalValue(sfdc_token_storage_key);
        
                sf.refreshAccessToken(passcode, clientId, refToken, checkResponse, errorCallback, ind.hide);
            }
        }
    
        PasscodeManager.checkPasscode(validatePasscodeAndRefreshSession);
    }
    
    function getLoginHostUrl() {
        var domain;
        
        switch(ManageUserSession.getLoginHostType()) {
            case 'host_production' : domain = 'login.salesforce.com'; break;
            case 'host_sandbox': domain = 'test.salesforce.com'; break;
            case 'host_custom': domain = StorageManager.getLocalValue(login_host_url_storage_key); break;
        }
        if (!domain || domain.length == 0) {
            domain = 'login.salesforce.com';
        }
        return domain;
    }

    function authorizeUser() {
        window.location = sf.getAuthorizeUrl(ManageUserSession.getLoginHostUrl());
    }
    
    function obtainOAuthTokensAndSetupPasscode(authCode, callback) {
    
        var fetchTokens = function(passcode, pmcallback) {
    
            passcode = (passcode == -1) ? undefined : passcode;
            var indMsg = (passcode) ? 'Setting Passcode...' : 'Authenticating...';
            var indicator = $j(document).showActivityInd(loadingImg, indMsg, false);
            
            var onSuccess = function(response) {
                prepareSession(response);
                storeOAuthValues(response.clientId, (passcode) ? response.refreshToken : null);
                
                // Callback the parent function which initiated the authentication.
                if (typeof callback == 'function') callback();
            }
            
            sf.obtainAccessToken(ManageUserSession.getLoginHostUrl(),
            					authCode, passcode, 
                                function(response) {
                                    indicator.hide();
                                    if (response.success) {
                                        onSuccess(response);
                                    } else {
                                        alert(response.error);
                                    }
                                    if (typeof pmcallback == 'function') pmcallback();
                                }, 
                                function() {
                                    if (confirm('Failed to obtain access. Try again!')) authorizeUser();
                                });
        };
            
        if (isStandalone) {
            PasscodeManager.setupPasscode(fetchTokens);
        } else {
            fetchTokens();
        }
    }
    
    return {
    
    	isActive: function() { return sessionAlive == true; },
    	
    	isEulaAccepted: function() { return eulaAccepted == true; },
    	
		updateEula: function(accepted) { eulaAccepted = accepted; },
    	
    	getClientId: function() { return (sessionAlive) ? StorageManager.getLocalValue(sfdc_clientId_storage_key) : null; },
    	
        getUsername: function() { if (sessionAlive) return username; return null; },
        
        getApiClient: function() { if (sessionAlive) return sf; return null; },
        
        getLoginHostType: function() { return StorageManager.getLocalValue(login_host_storage_key); },
        
        getLoginHostUrl: getLoginHostUrl,
        
        setLoginHostType: function(host) { StorageManager.setLocalValue(login_host_storage_key, host); },
        
        setLoginHostUrl: function(hostUrl) { 
			var hostType = 'host_custom';
			
			hostUrl = hostUrl.toLowerCase();
			switch(hostUrl) {
				case 'login.salesforce.com' : hostType = 'host_production'; break;
				case 'test.salesforce.com' : hostType = 'host_sandbox'; break;
			}
			
			StorageManager.setLocalValue(login_host_url_storage_key, hostUrl); 
			ManageUserSession.setLoginHostType(hostType);
		},
		
        initialize: function(callback, clearSettings) {
        
            if (!sf) sf = new sforce.Client();
            
            var sessionToken = StorageManager.getSessionValue(session_token_storage_key);        
            var refreshToken = StorageManager.getLocalValue(sfdc_token_storage_key);
        
            if (sessionAlive) { //Check if we are already initialized
                callback();
            } else if (sessionToken && sessionToken.length > 0) {
            	resurrectSession(sessionToken, callback);
            } else if (refreshToken && refreshToken.length > 0) { 
                //Authenticate if we have the refresh token
                authenticate(callback);
            } else {
                // If nothing, the start the oauth process
                var isOAuthCallback = window.location.search.indexOf('code=');
                if (isOAuthCallback > 0) { //Are we coming back from an oauth process flow
                	var authCode = /code=([^&]*)&?/.exec(window.location.search)[1];
                    obtainOAuthTokensAndSetupPasscode(authCode, function() { history.pushState(null, null, window.location.pathname); callback(); });
                } else {
                	if (typeof clearSettings == 'boolean' && clearSettings) StorageManager.clearAll();
                	authorizeUser();
                }
            }
        },
        
        kill: function(postLogout) {
            StorageManager.clearAll();
            sf = sessionAlive = username = undefined;
            postLogout();
        }
    }

})();