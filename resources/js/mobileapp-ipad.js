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

var login_redirect_storage_key = 'SFDC-LOGIN-REDIRECT';

var feedpagescroll, infopagescroll;
var hasRecordTypes = false, hasChatterEnabled = false;
var contactLabel = 'Contact', contactPluralLabel = 'Contacts';

var listView, splitView, sobjectModel;

function initiateInfoScroller() {
    if (infopagescroll === undefined) {
        infopagescroll = createScroller('infoscroller');
        $j(window).orientationChange(initiateInfoScroller);
    } else {
        infopagescroll.refresh();
    }
    destroyFeedScroller();
}

function destroyInfoScroller() {
    if (infopagescroll) {
        $j(window).unbindOrientationChange(initiateInfoScroller);
        infopagescroll.destroy();
        infopagescroll = undefined;
    }
}

function initiateFeedScroller() {
    if (feedpagescroll === undefined) {
        feedpagescroll = createScroller('feedscroller');
        $j(window).orientationChange(initiateFeedScroller);
    } else {
        feedpagescroll.refresh();
    }
    destroyInfoScroller();
}

function destroyFeedScroller() {
    if (feedpagescroll) {
        $j(window).unbindOrientationChange(initiateFeedScroller);
        feedpagescroll.destroy();
        feedpagescroll = undefined;
    }
}

function sessionCallback() {
    
    $j('#loggedin').css('display', 'block');
    
    addClickListeners();

    var describeCallback, selectedContactId;   
    var ind = $j('#loggedin').showActivityInd('Loading...');
    
    var callbacks = 0;
    var showMainFeed;
    
    var last_visit_loc = StorageManager.getLocalValue(last_visited_loc_storage_key);
    if (last_visit_loc && last_visit_loc.split('/').length == 2) {
        
        last_visit_loc = last_visit_loc.split('/');
        selectedContactId = last_visit_loc[0];
        
        var onSlide = function() {
            if (last_visit_loc[1] != 'info') renderContactInfo(last_visit_loc[0]);
            addLeftNavClickListeners([last_visit_loc[0]]);
            switchDetailSection(last_visit_loc[1] || 'info', [last_visit_loc[0]], ind.hide);
        }
        
        describeCallback = function(success) { 
            if (success) switchToDetail(onSlide);
        }
    } else {
        showMainFeed = function(success) {
            if (success) {
                callbacks += 1;
                if (callbacks == 2) {
                    showContactNews(ind.hide, false);
                }
            }
        }
        
        describeCallback = function(success) {
            //setupContactListSection();
            showMainFeed(success);
        };
    }
    
    fetchContactDescribe(describeCallback);
    
    sobjectModel = {
        setRecords : function(recs) {
            this.records = recs;
            this.recordIds = [];
            for (i in recs) this.recordIds.push(recs[i].Id);
        }
    };
    
    splitView = new sforce.SplitView();
    listView = new sforce.ListView({selectedContactId: selectedContactId, onListSelect: getContacts, onSearch: searchContacts, onItemSelect: showContact});
    
    splitView.addOrientationChangeCallback(
        function() { listView.refreshScroller(); }
    );
    
    getContacts('recent', showMainFeed);
    
    // Add the add to home screen scripts if needed
    if (typeof window.addToHomeLaunch == 'function') window.addToHomeLaunch();
}

/* Method to slide in the detail pane from right */
function switchToDetail(callback) {
    if (useAnimations) {
        $j('#detailpage').slideInLeft(function() { 
            switch(isPortrait()) { 
                case false: $j('#detailpage').css(vendor + 'Transform', 'none'); break;
            }
        });
    } else {
        $j('#detailpage').show().css('visibility', '');
    }
    if (typeof callback == 'function') callback(); 
}

function addClickListeners() {
    
    $j('#listpage #footer #gear').off().enableTap().click(
        function(e) {
            e.preventDefault();
            splitView.focusOutContactList();
            setTimeout(SettingsManager.show, 10);
        });
    
    $j('#listpage #footer #home').off().enableTap().click(
        function(e) {
            e.preventDefault();
            splitView.focusOutContactList();
            showContactNews(null, true);
        });
}

function showContact(contactId, onComplete) {

    addLeftNavClickListeners([contactId]);
    splitView.focusOutContactList(); 
    // Hide the details and show the empty panel after hide operation completes
    $j('#rightsection #detailpage #detail').css('visibility', 'hidden').css('opacity', '0');
    $j('#detailpage .header>span').empty();
    switchToDetail();

    var ind = $j('#rightsection').showActivityInd('Loading...');
    switchDetailSection('info', [contactId], function(success) { 
        if (success) {
            $j('#rightsection #detailpage #detail')
            .css('visibility', '').css('opacity', '1');
        }
        ind.hide();
        if (typeof onComplete == 'function') onComplete();
    });
    updateLastVisitLoc(contactId + '/' + 'info');
}

function getChatter(contactId, callback) {
    if (!hasChatterEnabled) {
        callback(); return;
    }
    
    var onComplete = function(jqXHR, statusText) {
        if (typeof callback == 'function') {
            callback(statusText);
        }
    }
    
    ManageUserSession.getApiClient().fetchChatterViaApex([contactId],
            function(response) {
                var noFeedMsg = 'No chatter updates found.';
                var recs = [];
                
                if (response.totalSize > 0) recs = response.records;
                feedRenderer(recs, noFeedMsg);
                
                if (callback) callback();
            }, 
            errorCallback, onComplete);
}

function getActivities(contactId, callback) {
    var onComplete = function(jqXHR, statusText) {
        if (typeof callback == 'function') {
            callback(statusText);
        }
    }
    
    ManageUserSession.getApiClient().fetchActivitiesViaApex([contactId],
            function(response) {
                var noFeedMsg = 'No activities found.';
                var recs = [];
                
                if (response.tasks.totalSize > 0) recs = response.tasks.records;
                feedRenderer(recs, noFeedMsg);
                
                if (callback) callback();
            }, 
            errorCallback, onComplete);
}

function displayContactSummary(contact) {
    $j('#Id').val(contact.Id);
    var fieldInfo = getFieldDescribe();
    var detail = $j('#rightsection #detailpage #detail');
    detail.find('#summary #photo_div>div#name').html(formatStr(contact.Name, 25));
    if (fieldInfo.AccountId) {
        detail.find('#summary #company').show();
        detail.find('#summary #company .fieldLbl').text(fieldInfo.AccountId.relationshipLabel.toUpperCase(), true);
        detail.find('#summary #company .fieldVal').text(contact.Account ? contact.Account.Name : ' ', true);
    } else {
        detail.find('#summary #company').hide();
    }
    if (fieldInfo.Title) {
        detail.find('#summary #title').show();
        detail.find('#summary #title .fieldLbl').text(fieldInfo.Title.label.toUpperCase(), true);
        detail.find('#summary #title .fieldVal').text(contact.Title || ' ', true);
    } else {
        detail.find('#summary #title').hide();
    }
    if (fieldInfo.Phone) {
        detail.find('#summary #phone').show();
        detail.find('#summary #phone .fieldLbl').text(fieldInfo.Phone.label.toUpperCase(), true);
        detail.find('#summary #phone .fieldVal').text(contact.Phone || ' ', true);
    } else {
        detail.find('#summary #phone').hide();
    }
    
        
    if (contact.Phone) {
        var phone = cleanupPhone(contact.Phone);
        detail.find('#call_contact #skype').attr('href', 'skype:' + phone + '?call').show();
        if ((/ipad|iphone/gi).test(navigator.platform)) 
            detail.find('#call_contact #facetime').attr('href', 'facetime://' + phone).show();
        else detail.find('#call_contact #facetime').hide();
    } else {
        detail.find('#call_contact #skype').attr('href', '#').hide();
        detail.find('#call_contact #facetime').attr('href', '#').hide();
    }
    
    if (contact.Email) {
        detail.find('#call_contact #email').attr('href', 'mailto:' + contact.Email).show();
    } else {
        detail.find('#call_contact #email').attr('href', '#').hide();
    }
    
    var address = formatAddress(contact);
    if (address && address.length > 0) {
        detail.find('#call_contact #directions').show()
            .attr('href', 'http://maps.google.com/maps?daddr='+address.replace(/\n/g, ', '));
    } else {
        detail.find('#call_contact #directions').hide();
    }
}

function displayContactDetails(contact) {
    var fieldInfo = getFieldDescribe();
    var info = $j('#rightsection #detailpage #detail #info');
    if (fieldInfo.AccountId) {
        info.find('#Account').show();
        info.find('#Account .fieldLbl').text(fieldInfo.AccountId.relationshipLabel);
        info.find('#Account .fieldVal').html(contact.Account ? formatStr(contact.Account.Name, 50) : '&nbsp;');
    } else {
        info.find('#Account').hide();
    }
    if (fieldInfo.Department) {
        info.find('#Department').show();
        info.find('#Department .fieldLbl').text(fieldInfo.Department.label);
        info.find('#Department .fieldVal').html(formatStr(contact.Department, 50) || '&nbsp;');
    } else {
        info.find('#Department').hide();
    }
    if (fieldInfo.Phone) {
        info.find('#Phone').show();
        info.find('#Phone .fieldLbl').text(fieldInfo.Phone.label);
        info.find('#Phone .fieldVal').html((contact.Phone) ? '<a href="tel:' + formatStr(cleanupPhone(contact.Phone)) + '" style="text-decoration:none;">' + formatStr(contact.Phone, 30) + '</a>' : '&nbsp;');
    } else {
        info.find('#Phone').hide();
    }
    if (fieldInfo.MobilePhone) {
        info.find('#Mobile').show();
        info.find('#Mobile .fieldLbl').text(fieldInfo.MobilePhone.label);
        info.find('#Mobile .fieldVal').html((contact.MobilePhone) ? '<a href="tel:' + formatStr(cleanupPhone(contact.MobilePhone)) + '">' + formatStr(contact.MobilePhone, 30) + '</a>' : '&nbsp;');
    } else {
        info.find('#Mobile').hide();
    }
    if (fieldInfo.Email) {
        info.find('#Email').show();
        info.find('#Email .fieldLbl').text(fieldInfo.Email.label);
        info.find('#Email .fieldVal').html((contact.Email) ? '<a href="mailto:' + contact.Email + '" style="text-decoration:none;">' + formatStr(contact.Email, 50) + '</a>' : '&nbsp;');   
    } else {
        info.find('#Email').hide();
    }
    if (fieldInfo.ReportsToId) {
        info.find('#ReportsTo').show();
        info.find('#ReportsTo .fieldLbl').text(fieldInfo.ReportsToId.label.replace(/\sID$/,''));
        info.find('#ReportsTo .fieldVal').html(contact.ReportsTo ? formatStr(contact.ReportsTo.Name, 50) : '&nbsp;');   
    } else {
        info.find('#ReportsTo').hide();
    }               
    if (fieldInfo.MailingStreet != undefined) {
        var add = formatAddress(contact);
        info.find('#Address').show();
        info.find('#Address .fieldLbl').text('Mailing Address');
        info.find('#Address .fieldVal').html((add.length > 0 ) ? add.replace(/\n/g, '<br/>') : '&nbsp;');
        codeAddressOnMap(add.replace(/\n/g, ', '));
    } else {
        info.find('#Address').hide();
        $j('#map_section').hide();
    }
}

function renderContactInfo(contactId, callback) {
    var loadSuccess = false;
    
    var onComplete = function(jqXHR, statusText) {
        if (typeof callback == 'function') {
            setTimeout( function() { 
                //truncateLongText($j('#rightsection #detailpage #detail #summary table td div')); 
                initiateInfoScroller(); infopagescroll.scrollTo(0, 0, 0); 
            }, 10);
            callback(loadSuccess);
        }
    }
    
    var fields = ['Id', 'Name', 'Account.Id', 'Account.Name', 'Department', 'Title', 'Phone', 
                  'MobilePhone', 'Email', 'MailingStreet', 'MailingCity', 'MailingState', 
                  'MailingCountry', 'MailingPostalCode', 'ReportsTo.Name'];
    if (hasRecordTypes) fields.push('RecordTypeId');
    
    var fieldInfos = getFieldDescribe();
    
    fields = fields.filter(function(fieldName) {
        fieldName = fieldName.split('.');
        return (true && fieldInfos[fieldName[0]]);
    });
    
    var info = $j('#rightsection #detailpage #detail #info');
    
    ManageUserSession.getApiClient().retrieveContactViaApex(contactId, fields,
            function(rec) {
                if(rec && 'Id' in rec) {
                    $j('#detailpage .header>span').text(rec.Name);
                    displayContactSummary(rec);
                    displayContactDetails(rec);
                    renderContactLayout(rec.Id, rec.RecordTypeId);
                    loadSuccess = true;
                 } else {
                    alert(contactLabel + ' not found. Please refresh the list and try again.');
                    showContactNews(null, true);
                 }
            }, 
            errorCallback, onComplete);
}

function formatDetailContent(parent) {
    $j.each(parent.find('.time'),
        function() {
            this.innerHTML = $j.format.date(this.innerHTML.trim(), 'hh:mm a');
        });
    $j.each(parent.find('.textarea'),
        function() {
            this.innerHTML = this.innerHTML.replace(/[\r\n]/g, '<br/>');
        });
}

function renderContactLayout(contactId, recordTypeId) {
    
    var detailsLayout = $j('#rightsection #detailpage #detail #info #detailsLayout');
    detailsLayout.find('#layout').empty();
    detailsLayout.find('#viewMoreBtn').find('span').text('Load All Details');
    detailsLayout.find('#viewMoreBtn').find('img').hide();
    detailsLayout.find('#viewMoreBtn').show().off().enableTap().click(
        function() {
            $j(this).off().find('span').text('Loading Details...');
            $j(this).find('img').show();
            ManageUserSession.getApiClient().getContactDetailsViaApex(contactId, recordTypeId,
                function(response) {
                    var resp = $j(response);  resp.find('head, script').remove();
                    formatDetailContent(detailsLayout.find('#layout').empty().append(resp));
                    detailsLayout.find('#viewMoreBtn').hide();
                }, errorCallback, function() { initiateInfoScroller(); });
        });
}

function showContactNews(callback, showLoadingIndicator) {

    splitView.focusOutContactList(); 
    $j('#detailpage #contactInfo').hide();
    $j('#detailpage .header>span').text(contactLabel + ' Feed');
    $j('#feedscroller ul').empty();
    $j('#feedscroller').appendTo('#contactNews .contentpage').css('visibility', 'hidden').show();
    $j('#detailpage #contactNews').show();
    listView.resetSelectedContact();
    
    var ind;
    if (showLoadingIndicator) {
        ind = $j('#rightsection').showActivityInd('Loading...');
    }
    switchToDetail();
    
    var options = {
        includeParent : true,
        onClickParent : function(e) {
            if (this.id.startsWith('contact_')) {
                e.preventDefault();
                listView.selectContact(this.id.substring(8));
            }
        }
    };
    
    getAggregateFeed(sobjectModel.recordIds, function(status) { 
        if (status == 'success') {
            $j('#feedscroller').css('visibility', '');
        }
        initiateFeedScroller();
        if (ind) ind.hide();
        if (typeof callback == 'function') callback();
    }, options);
}

function getAggregateFeed(contactIdArr, callback, options) {
    
    var recs = [], renderingComplete;
    
    var onSuccess = function() {
        if (recs[0] && recs[1]) {
            var items = recs[0].concat(recs[1]);
            
            var getDate = function(item) {
                var date;
                if ("ActivityDate" in item) {
                    if (item.ActivityDate) date =  item.ActivityDate;
                    else date = item.LastModifiedDate;
                } else {
                    date = item.CreatedDate;
                }
                
                if (date) return $j.format.toDate(date);
                return new Date();
            }
            
            var sorter = function(x, y) {               
                var a = getDate(x);
                var b = getDate(y);
                
                return ((a == b) ? 0 : ((a > b) ? -1 : 1 ));
            }
            
            items.sort(sorter);
            feedRenderer(items, 'No updates found.', options);
            renderingComplete = true;
        }
    }
    
    var onComplete = function(jqXHR, textStatus) { 
        if (typeof callback == 'function' &&
            (textStatus != 'success' || (recs[0] && recs[1]))) {
                callback(textStatus); 
        }
    }
    
    if (hasChatterEnabled) {
        ManageUserSession.getApiClient().fetchChatterViaApex(contactIdArr,
            function(response) {
                recs[0] = (response.totalSize > 0) ? response.records : [];
                onSuccess();
            }, 
            errorCallback, onComplete);
    } else {
        recs[0] = []; onSuccess();
    }
            
    ManageUserSession.getApiClient().fetchActivitiesViaApex(contactIdArr,
            function(response) {
                recs[1] = (response.tasks && response.tasks.totalSize > 0) ? response.tasks.records : [];
                onSuccess();
            }, 
            errorCallback, onComplete);
}

function addLeftNavClickListeners(contact) {
    $j('#rightsection #detailpage #leftnav .dsIcons').off().enableTap()
        .click(function() {     
            
            var loadingText = 'Loading';
            switch (this.id) {
                case 'info': loadingText += ' Details'; break;
                case 'rss': loadingText += ' All Feeds'; break;
                case 'chatter': loadingText += ' Chatter'; break;
                case 'salesforce': loadingText += ' Activities'; break;
            }
            
            var ind = $j('#rightsection #detailpage').showActivityInd(loadingText + '...');
            switchDetailSection(this.id, contact, ind.hide); 
        });
    if (!hasChatterEnabled) $j('#rightsection #detailpage #leftnav #chatter').hide();
}

function switchDetailSection(section, contact, callback) {
    $j('#feedscroller ul').empty();
    $j('#feedscroller').appendTo('#rightsection #detailpage #detail>span'); 
    $j('#detailpage #contactInfo').show();
    $j('#detailpage #contactNews').hide();
    
    $j('#rightsection #detailpage #detail>span>div').hide().css('visibility', 'hidden');
    $j('#rightsection #detailpage #leftnav div.selected').removeClass('selected');
    $j('#rightsection #detailpage #leftnav #' + section).addClass('selected');
    
    if (section == 'info') {
        $j('#rightsection #detailpage #detail #infoscroller').show();
        destroyFeedScroller();
    } else {
        $j('#rightsection #detailpage #detail #feedscroller').show();
        destroyInfoScroller();
    }
    
    var cb = function(success) { if (typeof callback == 'function') callback(success); }
    
    var afterFeedRefresh = function() {
        $j('#rightsection #detailpage #detail #feedscroller').css('visibility', ''); 
        initiateFeedScroller(); 
        cb(); 
    }
    
    if (section == 'info') {
        renderContactInfo(contact[0], function(success) { 
            if(success) $j('#rightsection #detailpage #detail #infoscroller').css('visibility', ''); 
            cb(success); 
        });
    } else if (section == 'chatter') {
        getChatter(contact[0], afterFeedRefresh);
    } else if (section == 'salesforce') {
        getActivities(contact[0], afterFeedRefresh);
    } else if (section == 'rss') {
        getAggregateFeed([contact[0]], afterFeedRefresh);
    } else {
        cb();
    }
    updateLastVisitLoc(contact[0] + '/' + section);
}

function codeAddressOnMap(address) {
    var encodedAdd = encodeURI(address);
    var mapsImage = '<img src="https://maps.googleapis.com/maps/api/staticmap?' + 
                    'zoom=14&size=640x180&format=jpeg&sensor=false&markers=color:red%7C' + 
                    encodedAdd + '"/>';
    $j('#map_section #map_div #google_map_canvas').empty().append(mapsImage);
    $j('#map_section #map_div #openMaps').off().enableTap().click( 
        function() {
            window.location = ((typeof PhoneGap != 'undefined' && PhoneGap) ? 
                              'maps:q=' : 'https://maps.google.com/maps?q=') + encodedAdd;
        });
}
