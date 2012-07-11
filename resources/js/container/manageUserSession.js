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

    var sf, sessionAlive, username, instanceUrl, loginHostUrl;
    
    function prepareSession(response) {
        sessionAlive = true;
        username = response.username;
        instanceUrl = response.instanceUrl;
        sf.setSessionHeader(response.sessionToken);
    }
    
    function authenticate(onSuccess) {
    
        var indicator, oauthProperties, loginSuccess, loginFailure;
        indicator = $j(document).showActivityInd('Authenticating...', false);
    
        oauthProperties = new OAuthProperties(remoteAccessConsumerKey, 
                                                  oauthRedirectURI, 
                                                  ['api'], true, true);
                                                  
        loginSuccess = function(callback) {
            var successCallback = function(response) {
                if (response.success) {
                    prepareSession(response);
                    indicator.hide();
                    if (typeof callback == 'function') callback();
                } else loginFailure();
            };
            return function(oauthInfo) {
                sf.prepareSessionFromOAuth(oauthInfo.accessToken, 
                                           oauthInfo.instanceUrl, 
                                           oauthInfo.identityUrl, 
                                           successCallback, loginFailure);
            }
        }
        
        // Error callback on login process failure method.
        loginFailure = function(result) {
            SFHybridApp.logError("loginFailure: " + result);
            indicator.hide();
            var errorMsg = 'Authentication failed. Do you want to retry?';
            if (confirm(errorMsg)) ManageUserSession.initialize(onSuccess);
        }
        
        SalesforceOAuthPlugin.authenticate(loginSuccess(onSuccess), loginFailure, oauthProperties);
        $j(document).off('salesforceSessionRefresh').on('salesforceSessionRefresh', function(event) {
            (loginSuccess())(event.originalEvent.data);
        });
    }
    
    return {
    
        isActive: function() { return sessionAlive == true; },
        
        isEulaAccepted: function() { /* Since we are inside container, EULA is accepted on install. */ return true; },
        
        updateEula: function(accepted) { /* NOOP */ },
        
        getUsername: function() { if (sessionAlive) return username; return null; },
        
        getApiClient: function() { if (sessionAlive) return sf; return null; },
        
        getLoginHostType: function() { 
            if (loginHostUrl.toLowerCase().indexOf('login.') == 0)
                return 'host_production';
            else if (loginHostUrl.toLowerCase().indexOf('test.') == 0)
                return 'host_sandbox';
            else return 'host_custom';
        },
        
        getLoginHostUrl: function() { return loginHostUrl; },
        
        setLoginHostType: function(host) { 
            if (host.toLowerCase() == 'host_production')
                ManageUserSession.setLoginHostUrl('login.salesforce.com');
            else if (host.toLowerCase() == 'host_sandbox')
                ManageUserSession.setLoginHostUrl('test.salesforce.com');
            else if (host.toLowerCase() == 'host_custom')
                loginHostUrl = '';
        },
        
        setLoginHostUrl: function(hostUrl) { 
            var msg = 'Changing login host will logout the current logged in user. Are you sure you want to continue?';
            hostUrl = hostUrl.toLowerCase();
            if (!sessionAlive || (loginHostUrl != hostUrl && confirm(msg))) {
                loginHostUrl = hostUrl;
                SalesforceOAuthPlugin.setLoginDomain(null, null, loginHostUrl);
                if (sessionAlive) ManageUserSession.kill();
            }
        },
        
        initialize: function(callback) {
            if (sessionAlive)
                callback();
            else {
                authenticate(callback);
                SalesforceOAuthPlugin.getLoginDomain(function(val) { loginHostUrl = val.toLowerCase(); });
                if (!sf) sf = new sforce.Client();
            }
        },
        
        invalidate: function (revokeSession, postInvalidate) {
            if (revokeSession && sessionAlive) sf.revokeSession(null, null, null, null, postInvalidate);
            sf = sessionAlive = username = undefined;
        },
        
        kill: function() {
            if (sessionAlive) {
                ManageUserSession.invalidate();
                SalesforceOAuthPlugin.logout(); 
            }
        }
    }
})();