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

public with sharing class ContactsAppController {
    
    private String userAgent {get; set;}
    public String device { get; private set; }
    public boolean debug {get; private set;} {this.debug = false;}
    
    public boolean isIPhone {get {
            return userAgent.contains('iPhone') || device == 'mobile';
        }
    }
    
    public boolean isWebkit {get {
            return userAgent.toLowerCase().contains('applewebkit');
       }
    }
    
    public boolean isIPad {get {
            return userAgent.contains('iPad') || (isWebkit && device != 'mobile');
        }
    }
    
    // Don't allow animations on android devices.
    public boolean allowAnimations {get{
            return (!userAgent.contains('Version/') && !userAgent.contains('Android')); 
        }
    }

    public boolean isContainer { get {
    	    return userAgent.toLowerCase().contains('salesforcemobilesdk');
        }
    }
    
    public String getOSType() {
	    if (userAgent.toLowerCase().contains('iphone')) return 'ios';
	    else if (userAgent.toLowerCase().contains('android')) return 'android';
	    return '';
    }
    
    public boolean addManifest { get {
          return System.currentPageReference().getParameters().size() == 0;
       }
    }
    
    public String tabletManifestHeader { get {
           return '<html manifest="' + Site.getCurrentSiteUrl() + 'ContactsAppManifest?device=tablet">';
       }
    }
    
    public String mobileManifestHeader { get {
           return '<html manifest="' + Site.getCurrentSiteUrl() + 'ContactsAppManifest?device=mobile">';
       }
    }
    
    public String maifestFooter { get {
           return '</html>';
       }
    }
    
    public ContactsAppSettings__c getNativeSettings() {
    	return SfdcOAuthManager.getNativeOAuthSettings();
    }
    
    public ContactsAppController() {
        this.userAgent = System.currentPageReference().getHeaders().get('User-Agent');
        this.device = System.currentPageReference().getParameters().get('device');
    }

}