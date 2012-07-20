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
 
if (window.$j === undefined) {
    $j = $.noConflict();
}

// Make our own startsWith utility fn
String.prototype.startsWith = function(str) {
    return (this.substr(0, str.length) === str);
}

String.prototype.endsWith = function(str) {
    return (this.substr(this.length - str.length, this.length) === str);
}

Array.prototype.last = function() {
    return this[this.length - 1];
}

function htmlEncode(value){
  return (value) ? $j('<div/>').text(value).html() : value;
}

function htmlDecode(value){
  return (value) ? $j('<div/>').html(value).text() : value;
}

function formatStr(str, length) {
    if (str) str = htmlEncode(str);
    
    if (str && length && str.length > length) {
        return str.substr(0, length-3) + '...';
    }
    return str;
}

function cleanupPhone(phoneStr) {
    if (phoneStr) {
        var phone = htmlEncode(phoneStr);
        return (phone.trim().startsWith('+') ? '+' : '') + phone.replace(/[^0-9]/g,'');
    }
    return phoneStr;
}

function formatAddress(contact) {
    var add = ((contact.MailingStreet) ? htmlEncode(contact.MailingStreet).replace(/\n/g, ', ') + '\n' : '') +
              ((contact.MailingCity) ? htmlEncode(contact.MailingCity).replace(/\n/g, ', ') + ', ' : '') + 
              ((contact.MailingState) ? htmlEncode(contact.MailingState).replace(/\n/g, ', ') + ' ' : '') + 
              ((contact.MailingPostalCode) ? htmlEncode(contact.MailingPostalCode).replace(/\n/g, ', ') + ' ' : '') + 
              ((contact.MailingCountry) ? htmlEncode(contact.MailingCountry).replace(/\n/g, '') : '');
    return add;
}

function getBaseUrl() {
    if (siteUrl.endsWith('/')) return siteUrl.substring(0, siteUrl.length-1);
    return siteUrl;
}

function getFieldDescribe() {
    return eval('(' + StorageManager.getSessionValue(contact_describe_storage_key) + ')');
}

//FIXME: Remove my usage from code.
function truncateLongText(elems) {
    return;
}

function isPortrait() {
    return (window.innerHeight > window.innerWidth);
}

var contact_describe_storage_key = 'SFDC-CONTACT-DESCRIBE';

function fetchContactDescribe(callback) {

    var onComplete = function(jqXHR, textStatus) {
        if (typeof callback == 'function')
            callback(textStatus == 'success');
    }
    
    ManageUserSession.getApiClient().describeContactViaApex( 
            function(response) {
                contactLabel = response.label || 'Contact';
                contactPluralLabel = response.labelPlural || 'Contacts';
                if(response.fields) {
                    var fields = {};
                    $j.each(response.fields,
                        function() {
                            var field = {'label':this.label, 'type':this.type, 'length': this.length};
                            fields[this.name] = field;
                            if (field.type == 'reference') {
                                field.relationshipName = this.relationshipName;
                                field.referenceTo = this.referenceTo;
                                field.relationshipLabel = this.relationshipLabel || '';
                                fields[this.relationshipName] = field;
                            }
                        });
                    StorageManager.setSessionValue(contact_describe_storage_key, JSON.stringify(fields));
                }
                if (response.recordTypeInfos && response.recordTypeInfos.length > 1) {
                    hasRecordTypes = true;
                }
                if (response.childRelationships) {
                    hasChatterEnabled = response.childRelationships.some(function(rel) {
                        return rel.childSObject == 'ContactFeed';
                    });
                }
            }, errorCallback, onComplete);
}

function createScroller(el, onPullDownCallback, ops) {
    
    var pullDownOffset, onRefresh, onScrollMove, onScrollEnd;
    var elem = (typeof el == 'object') ? el : $j('#' + el);
    
    if (onPullDownCallback) {
    
        var pullDownEl = elem.find('#pullDown')[0];
        
        if (!pullDownEl) {
            var pullDownElHtml = '<div id="pullDown"><span class="app-images appleui pullDownIcon"></span><span class="pullDownLabel">Pull down to refresh</span> </div>';
            $j(elem.children().children().get(0)).before(pullDownElHtml);
            pullDownEl = elem.find('#pullDown')[0];
        }
        
        pullDownOffset = pullDownEl.offsetHeight;
    
        onRefresh = function () {
            if (pullDownEl.className.match('loading')) {
                pullDownEl.className = '';
                pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Pull down to refresh';
            }
        };
        
        onScrollMove = function () {
            if (this.y > 5 && !pullDownEl.className.match('flip')) {
                pullDownEl.className = 'flip';
                pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Release to refresh';
                this.minScrollY = 0;
            } else if (this.y < 5 && pullDownEl.className.match('flip')) {
                pullDownEl.className = '';
                pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Pull down to refresh';
                this.minScrollY = -pullDownOffset;
            }
        };
        
        onScrollEnd = function () {
            if (pullDownEl.className.match('flip')) {
                pullDownEl.className = 'loading';
                pullDownEl.querySelector('.pullDownLabel').innerHTML = 'Loading...';
                
                onPullDownCallback();   // Execute custom function (ajax call?)
            }
        };
    }
    
    var options = {useTransition: true, topOffset: pullDownOffset || 0 };
    if (ops && ops.onBeforeScrollStart) options.onBeforeScrollStart = ops.onBeforeScrollStart;
    if (onRefresh) options.onRefresh = onRefresh;
    if (onScrollMove) options.onScrollMove = onScrollMove;
    if (onScrollEnd) options.onScrollEnd = onScrollEnd;

    return new iScroll(elem[0], options);
}

function errorCallback(jqXHR, statusText){
    if (statusText == 'error') {
        var response = jqXHR.responseText;
        try { response = $j.parseJSON(response);} catch (e){}
        
        switch (jqXHR.status) {
            case 403: 
                if ((/NO_API_ACCESS/gi).test(jqXHR.responseText) && ManageUserSession.isActive()) {
                    alert(response.message);
                    logout(true);
                    break;
                }
            case 401:
                alert(response.message || 'Session expired. Please relogin.');
                ManageUserSession.invalidate(true, function() { window.location.reload(); });
                break;
            default:
                alert('Server Unavailable. Check network connection or try again later.');
        }
    } else if (statusText = 'timeout') {
        alert('Session timed out.');
        ManageUserSession.invalidate(true, function() { window.location.reload(); });
    }
}

var last_visited_loc_storage_key = 'LAST-VISIT-LOC';

function updateLastVisitLoc(path) {
    if (path) StorageManager.setLocalValue(last_visited_loc_storage_key, path);
    else StorageManager.clearLocalValue(last_visited_loc_storage_key);
}

function getEulaResponse(callback) {
    var onAccept = function() {

        var onSuccess = function(resp) {
            if (resp.success && resp.success == 'true') {
                ManageUserSession.updateEula(true);
                SettingsManager.hideEula();
                if (typeof callback == 'function') callback();
            } else {
                if (resp.error) alert(resp.error);
                if (resp.errorCode && resp.errorCode == 'INVALID_CLIENT') logout(false);
            }
        }
        ManageUserSession.getApiClient().submitEulaResponse(ManageUserSession.getClientId(), this.id, onSuccess, errorCallback);
    }
    
    var onDecline = function() {
        logout(true);
    }
    
    SettingsManager.showEula(onAccept, onDecline);
}

function logout(redirect) {
    var postLogout = function() {
        if (!redirect) StorageManager.setSessionValue(login_redirect_storage_key, false);
        window.location = getBaseUrl();
    }
    
    ManageUserSession.kill(postLogout);
}

function getContacts(filter, callback) {

    listView.showBusyIndicator('Loading...');
    var onComplete = function(jqXHR, statusText) {
        listView.updateList(sobjectModel.records);
        listView.hideBusyIndicator();
        listView.refreshScroller(function() { getContacts(filter); }); // Refresh scroller
        if (typeof callback == 'function') {
            callback(statusText == 'success');
        }
    }
    
    ManageUserSession.getApiClient().queryContactsViaApex(filter,
            function(response) {
                sobjectModel.setRecords(response.records);
            }, 
            errorCallback, onComplete);
}

function searchContacts(searchText, callback) {
    listView.showBusyIndicator('Searching...');
    var onComplete = function(jqXHR, statusText) {
        listView.updateList(sobjectModel.records);
        listView.hideBusyIndicator();
        listView.refreshScroller(function() { searchContacts(searchText); }); // Refresh scroller
        if (typeof callback == 'function') {
            callback(statusText);
        }
    }
    
    ManageUserSession.getApiClient().searchContactsViaApex(searchText,
            function(response) {
                sobjectModel.setRecords(response);
            }, 
            errorCallback, onComplete);
}

function prepareSession(clearSettings) {

    var redirect = StorageManager.getSessionValue(login_redirect_storage_key);
    if (redirect == 'false') {
        StorageManager.clearSessionValue(login_redirect_storage_key);
        setTimeout(SettingsManager.show, 10);
    } else {
        LocalyticsManager.logAppStarted();
        var onSessionActive = function() {
            LocalyticsManager.logAuthComplete();
            if (!ManageUserSession.isEulaAccepted()) getEulaResponse(sessionCallback);
            else sessionCallback();
        }
        ManageUserSession.initialize(onSessionActive, clearSettings);
    }
}