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

public with sharing class SessionManager {
	
	private SfdcOAuthManager.OAuthResponse authData;
	
	public String accessToken {get { return authData.accessToken; }}
	public String instanceUrl {get { return authData.instanceUrl; }}
	public String userId {get { return authData.userId; }}
	public String userInfoUri {get { return authData.userInfoUri; }}
	
	public SessionManager(Map<String, String> headers) {
		String sessionToken = headers.get('App-Session');
		// If we have the App-Session header then re-surrect the OAuthResponse from it's serialized state
		if (sessionToken != null) 
            this.authData = SfdcOAuthManager.initialize(sessionToken);
        // Note: Used by container app. User can provide a Oauth value map that can be used to create a new OAuthResponse instance.   
        else  
            this.authData = SfdcOAuthManager.initialize(headers);
    }
    
    public SessionManager(SfdcOAuthManager.OAuthResponse authData) {
        this.authData = authData;
    }
	
	public void refreshSession() {
		this.authData = SfdcOAuthManager.refreshAccessFromEncRefToken(instanceUrl, this.authData.encryptedRefreshToken);
	}
	
	public boolean isValid() {
		return authData != null && accessToken != null && instanceUrl != null && userInfoUri != null;
	}
	
	public SfdcOAuthManager.OAuthResponse getOAuthResponse() {
		return this.authData;
	}

}