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

var sforce = window.sforce;

if (sforce === undefined) {
    sforce = {};
}

if (sforce.Client === undefined) {

    // We use $j rather than $ for jQuery so it works in Visualforce
    if (window.$j === undefined) {
        $j = $.noConflict();
    }

    /**
     * The Client provides a convenient wrapper for the Force.com REST API, 
     * allowing JavaScript in Visualforce pages to use the API via the Ajax
     * Proxy.
     * @param [clientId=null] 'Consumer Key' in the Remote Access app settings
     * @param [loginUrl='https://login.salesforce.com/'] Login endpoint
     * @param [proxyUrl=null] Proxy URL. Omit if running on Visualforce or 
     *                  PhoneGap etc
     * @constructor
     */
    sforce.Client = function() {}
    
    sforce.Client.prototype.ajax = function(type, url, data, success, error, complete) {
    	$j.ajax({
            type: type,
            url: url,
            processData: true,
            data: data,
            dataType: 'json',
            success: success,
            error: error,
            complete: complete
        });
    }

    /**
     * Refresh the access token.
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.refreshAccessToken = function(passcode, clientId, refToken, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppOAuth';
        this.ajax('GET', url, 'doRefresh=true&rt='+refToken+'&pass='+passcode+'&cid='+clientId, success, error, complete);
    }
    
    /**
     * Obtain the access token.
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.obtainAccessToken = function(passcode, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppOAuth' + location.search;
        this.ajax('GET', url, (passcode) ? ('pass='+passcode) : '', success, error, complete);
    }
    
    /**
     * Query Contacts
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.queryContactsViaApex = function(filter, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=fetchContacts&filter=' + filter, success, error, complete);
    }
    
    /**
     * Query Contacts
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.retrieveContactViaApex = function(contactId, fields, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=retrieveContact&id=' + contactId + '&fields=' + fields, success, error, complete);
    }
    
    /**
     * Search Contacts
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.searchContactsViaApex = function(text, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=searchContacts&text=' + text, success, error, complete);
    }
    
    /**
     * Fetch chatter for a contact
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.fetchChatterViaApex = function(contactIdArr, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=fetchChatter&ids=' + contactIdArr, success, error, complete);
    }
    
    /**
     * Fetch activities for a contact
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.fetchActivitiesViaApex = function(contactIdArr, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=fetchActivities&ids=' + contactIdArr, success, error, complete);
    }
    
    /**
     * Get Users details
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.getUsersInfoViaApex = function(uids, success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=getUsersInfo&id=' + uids, success, error, complete);
    }
    
    
    /**
     * Get Contact Describe info
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.describeContactViaApex = function(success, error, complete) {
        var that = this;
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=describeContact', success, error, complete);
    }
    
    /**
     * Get Contact Detail Layout
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.getContactDetailsViaApex = function(contactId, recordTypeId, success, error, complete) {
        var url = getBaseUrl() + '/ContactDetails';
        var timezoneOffset = new Date().getTimezoneOffset();
        $j.ajax({
            type: 'GET',
            url: url,
            data: 'id=' + contactId + '&rtid=' + (recordTypeId || '') + '&tzOffset=' + timezoneOffset,
            success: success,
            error: error,
            complete: complete
        });
    }
    
    /**
     * Get Contact App Eula
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.getContactAppEula = function(success, error, complete) {
        var url = getBaseUrl() + '/ContactsAppEula';
        $j.ajax({
            type: 'GET',
            url: url,
            success: success,
            error: error,
            complete: complete
        });
    }
    
    /**
     * Get Contact App Eula
     * @param success function to call on success
     * @param error function to call on failure
     */
    sforce.Client.prototype.submitEulaResponse = function(clientId, response, success, error, complete) {
        var url = getBaseUrl() + '/ContactsAppService';
        this.ajax('GET', url, 'action=manageEula&clientId='+ clientId + '&eulaResponse=' + response, success, error, complete);
    }
}