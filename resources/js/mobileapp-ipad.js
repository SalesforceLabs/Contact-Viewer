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

var sfdc_token_storage_key = 'SFDC-OAUTH-TOKEN';
var sfdc_clientId_storage_key = 'SFDC-CLIENT-ID';
var session_alive_storage_key = 'OAUTH-SESSION-ALIVE';
var username_storage_key = 'SFDC-USERNAME';
var last_visited_loc_storage_key = 'LAST-VISIT-LOC';
var login_host_storage_key = 'SFDC-LOGIN-HOST';
var login_host_url_storage_key = 'SFDC-LOGIN-HOST-URL';
var contact_describe_storage_key = 'SFDC-CONTACT-DESCRIBE';
var instance_url_storage_key = 'SFDC-INSTANCE-URL';
var login_redirect_storage_key = 'SFDC-LOGIN-REDIRECT';

var listpagescroll, feedpagescroll, infopagescroll;
var sf, sessionAlive, isStandalone, username;
var contactListPullDownCB, listPopoverWindowListener;
var hasRecordTypes = false;
var contactLabel = 'Contact', contactPluralLabel = 'Contacts';
var currentContacts = [], selectedContactId, selectedListId;

function errorCallback(jqXHR, statusText){
    if (statusText == 'error') {
		alert('Server Unavailable. Check network connection or try again later.');
	} else if (statusText = 'timeout') {
		if ((/NO_API_ACCESS/gi).test(jqXHR.responseText)) {
			if (!postLogout) {
				alert('API is not accessible to current user. Please login with a user with access to Salesforce API.');
				logout(true);
			}
		} else {
			alert('Session timed out.');
			clearSessionValue(session_alive_storage_key);
			window.location = getBaseUrl();
		}
	}
}

function storeOAuthValues(cid, rt) {
	if (cid && cid.length > 0 && rt && rt.length > 0) {
		setLocalValue(sfdc_clientId_storage_key, cid);
		setLocalValue(sfdc_token_storage_key, rt);
	}
}

function updateLastVisitLoc(path) {
	if (path) setLocalValue(last_visited_loc_storage_key, path);
	else clearLocalValue(last_visited_loc_storage_key);
}

function initiateContactListScroller(pullDownCallback, refreshOnly) {
	var callback;
	
	if (typeof pullDownCallback == 'function') {
		contactListPullDownCB = pullDownCallback;
		callback = function() { if (typeof contactListPullDownCB == 'function') contactListPullDownCB(); }
	}
	
	if (listpagescroll === undefined && !refreshOnly) {
		listpagescroll = createScroller('listscroller', callback);
		$j(window).orientationChange(initiateContactListScroller);
	} else if (listpagescroll) {
		listpagescroll.refresh();
	}
}

function initiateInfoScroller() {
	if (infopagescroll === undefined) {
		infopagescroll = createScroller('infoscroller');
		$j(window).orientationChange(initiateInfoScroller);
	} else {
		infopagescroll.refresh();
	}
	destroyFeedScroller();
	$j('#infoscroller').find('a').unbind().touch(function(e) { e.stopPropagation(); });
	$j('#infoscroller').find('#map_div #google_map_canvas').unbind().touch(function(e) { e.stopPropagation(); });
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
	$j('#feedscroller').find('a').unbind().touch(function(e) { e.stopPropagation(); });
}

function destroyFeedScroller() {
	if (feedpagescroll) {
		$j(window).unbindOrientationChange(initiateFeedScroller);
		feedpagescroll.destroy();
		feedpagescroll = undefined;
	}
}

function switchToList(from, reverse, callback) {
	$j('#detailpage').slideOutRight(callback);
}

function switchToDetail(from, reverse, title, callback) {
	$j('#detailpage').slideInLeft(function() { 
		switch(isPortrait()) { 
			case false: $j('#detailpage').css(vendor + 'Transform', 'none'); break;
		}
		if (typeof callback == 'function') callback(); 
	});
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
			
				var onSuccess = function(response) {
					setSessionValue(session_alive_storage_key, 'true');
					setSessionValue(username_storage_key, response.username);
					username = response.username;
					if (typeof callback == 'function') callback();
				}
				
				if (response.success) {
					if (typeof pmcallback == 'function') pmcallback(true);
					if (!response.eula) getEulaResponse( function() { onSuccess(response); } );
					else onSuccess(response);
				} else {
					if (response.errorCode == 'INVALID_TOKEN') clearAll();
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
	
			var clientId = getLocalValue(sfdc_clientId_storage_key);
			var refToken = getLocalValue(sfdc_token_storage_key);
	
			sf.refreshAccessToken(passcode, clientId, refToken, checkResponse, errorCallback, ind.hide);
		}
	}

	PasscodeManager.checkPasscode(validatePasscodeAndRefreshSession);
}

function authorizeUser() {
	var host = getLocalValue(login_host_storage_key);
	var domain;
	
	switch(host) {
		case 'host_production' : domain = 'login.salesforce.com'; break;
		case 'host_sandbox': domain = 'test.salesforce.com'; break;
		case 'host_custom':	domain = getLocalValue(login_host_url_storage_key); break;
	}
	if (!domain || domain.length == 0) {
		domain = 'login.salesforce.com';
	}
	window.location = getBaseUrl() + "/ContactsAppOAuth?doAuthorize&host="+domain;
}

function obtainOAuthTokensAndSetupPasscode(callback) {

	var fetchTokens = function(passcode, pmcallback) {

		passcode = (passcode == -1) ? undefined : passcode;
		var indMsg = (passcode) ? 'Setting Passcode...' : 'Authenticating...';
		var indicator = $j(document).showActivityInd(loadingImg, indMsg, false);
		
		var onSuccess = function(response) {
			setSessionValue(session_alive_storage_key, 'true');
			setSessionValue(username_storage_key, response.username);
			if (passcode && response.refreshToken) {
				storeOAuthValues(response.clientId, response.refreshToken);
			}
			updateLastVisitLoc();
			if (typeof callback == 'function') callback();
		}
		
		sf.obtainAccessToken( passcode, 
							function(response) {
								indicator.hide();
								if (response.success) {
									setLocalValue(sfdc_clientId_storage_key, response.clientId);
									setSessionValue(instance_url_storage_key, response.instanceUrl);
									
									if (!response.eula) getEulaResponse( function() { onSuccess(response); } );
									else onSuccess(response);
								} else {
									alert(response.error);
								}
								if (typeof pmcallback == 'function') pmcallback();
							}, 
							function() {
								alert('Failed to obtain access. Try again!');
								authorizeUser();
							});
	};
		
	if (isStandalone) {
		PasscodeManager.setupPasscode(fetchTokens);
	} else {
		fetchTokens();
	}
}



function getEulaResponse(callback) {
	var onAccept = function() {
		var clientId = getLocalValue(sfdc_clientId_storage_key);
		
		var onSuccess = function(resp) {
			if (resp.success && resp.success == 'true') {
				SettingsManager.hideEula();
				if (typeof callback == 'function') callback();
			} else {
				if (resp.error)	alert(resp.error);
				if (resp.errorCode && resp.errorCode == 'INVALID_CLIENT') logout(false);
			}
		}
		sf.submitEulaResponse(clientId, this.id, onSuccess, errorCallback);
	}
	
	var onDecline = function() {
		logout(true);
	}
	
	SettingsManager.showEula(onAccept, onDecline);
}

function prepareSession() {
	
	if (!sf) sf = new sforce.Client();
	
	isStandalone = ('standalone' in navigator && navigator.standalone);
	sessionAlive = getSessionValue(session_alive_storage_key);
	
	var refreshToken = getLocalValue(sfdc_token_storage_key);
	
	if(sessionAlive != 'undefined' && sessionAlive != null && sessionAlive == 'true') {
		username = getSessionValue(username_storage_key);
		sessionCallback();
	} else if (refreshToken != 'undefined' && refreshToken != null && refreshToken.length > 0) {
		authenticate(prepareSession);
	} else {
		var isOAuthCallback = window.location.search.indexOf('code=');
		if (isOAuthCallback > 0) {
			obtainOAuthTokensAndSetupPasscode(function() {window.location = getBaseUrl();});
		} else {
			var redirect = getSessionValue(login_redirect_storage_key);
			if (redirect == 'false') SettingsManager.show();
			else authorizeUser();
		}
	}
}

function sessionCallback() {
	
	$j('#loggedin').css('display', 'block');
	
    addClickListeners();

	var describeCallback;	
	var ind = $j('#loggedin').showActivityInd(loadingImg, 'Loading...');
	
	// Bloody android fires resize on keyboard display too.
	var resetContactList = function() {
		if ((isPortrait() && $j('#listpage').parent()[0].id != 'popover') 
			|| (!isPortrait() && $j('#listpage').parent()[0].id == 'popover')) {
			setupContactListSection();
		}
	}
	
	var callbacks = 0;
	var showMainFeed;
	
	var last_visit_loc = getLocalValue(last_visited_loc_storage_key);
	if (last_visit_loc && last_visit_loc.split('/').length == 2) {
		
		last_visit_loc = last_visit_loc.split('/');
		selectedContactId = last_visit_loc[0];
		
		var onSlide = function() {
			if (last_visit_loc[1] != 'info') renderContactInfo(last_visit_loc[0]);
			addLeftNavClickListeners([last_visit_loc[0]]);
			switchDetailSection(last_visit_loc[1] || 'info', [last_visit_loc[0]], ind.hide);
		}
		
		describeCallback = function(success) { 
			if (success) switchToDetail('#listpage', false, '', onSlide); 
			resetContactList();
		}
	} else {
		showMainFeed = function(success) {
			if (success) {
				callbacks += 1;
				if (callbacks == 2) showContactNews(ind.hide, false);
			}
		}
		
		describeCallback = function(success) {
			resetContactList();
			$j(window).orientationChange(resetContactList);
			showMainFeed(success);
		};
	}
	
	$j(window).orientationChange(resetContactList);
	
	fetchContactDescribe(describeCallback);
	displayList('recent', showMainFeed);
	initializeMap();
}

var postLogout;
function logoutCallback(iframe) {
	if (iframe) $j(iframe).remove();
	if (typeof postLogout == 'function') postLogout();
}

function logout(redirect) {
	var instanceUrl = getSessionValue(instance_url_storage_key);
	var iframe;
	
	clearAll();
	if (!redirect) setSessionValue(login_redirect_storage_key, false);
	postLogout = function() { window.location = getBaseUrl(); };
	
	if (instanceUrl) {
		iframe = $j('<iframe src="' + instanceUrl + '/secur/logout.jsp" style="display:none" onload="logoutCallback(this);"/>');
		$j(document.body).append(iframe);
	} else {
		logoutCallback();
	}
}

function setupContactListSection() {
	$j('#listpage #header #searchbar input[type="search"]').attr('placeholder', 'Search All ' + contactPluralLabel);
	$j('#listpage #header #listselect #owner').text('My ' + contactPluralLabel);
	$j('#listpage #header #listselect #follow').text(contactPluralLabel + ' I Follow');
	switch (isPortrait()) {
		case true:
			$j('#listpage').appendTo('#popover');
			$j('#popover').css('visibility', 'hidden').css('opacity', '0').show();
			$j('#contactlist_button').show().text(contactPluralLabel).touch(function() {
				if (!listPopoverWindowListener) {
					listPopoverWindowListener = addWindowTouchListener($j('#popover,#contactlist_button'), 
												function() { return false; }, 
												function() { focusOutContactList(); return true; }, 
												false);
				}
				$j('#popover').css('visibility', '').css('opacity', '1');
				initiateContactListScroller(null, true);
			});
			break;
		case false:
			$j('#popover').hide();
			$j('#rightsection').before($j('#listpage'));
			$j('#contactlist_button').hide().unbindTouch();
			removeWindowTouchListener(listPopoverWindowListener);
			listPopoverWindowListener = null;
			break;
	}
	initiateContactListScroller(null, true);
}

function focusOutContactList() {
	
	switch (isPortrait()) {
		case true:
			var popover = $j('#popover');
			var onHide = function() { 
				popover.css('visibility', 'hidden').unbind('webkitTransitionEnd');
			}
			if (popover.css('opacity') != '0')  popover.bind('webkitTransitionEnd', onHide);
			popover.css('opacity', '0');
			removeWindowTouchListener(listPopoverWindowListener);
			listPopoverWindowListener = null;
			break;
		default:
	}
}

function displayList(listId, callback) {
	var listButton;
	if (listId) listButton = $j('#listpage #header #listselect button#' + listId);
	else listButton = $j('#listpage #header #listselect button#recent');
	
	$j('#listpage #header #titlebar #title').text(listButton.text());
	
	selectedListId = listButton[0].id;
	getContacts(selectedListId, callback);
}

function showListSelectButtons() {
	$j('#listpage #header #titlebar').unbind();
	
	var selecterDiv = $j('#listpage #header #listselect');
//	selecterDiv.unbind('webkitTransitionEnd').hide(); //Prepare to calculate real height
	
	var listOverlay = $j('#listpage #listscroller').addOverlay();
	var overlayZIndex = $j.topZIndex(listOverlay.elem);
		
	var onShow = function() {
		
		$j('#listpage #header #searchbar').hide();
		selecterDiv.css('visibility', '').css('-webkit-transform', 'translateY(0px)')
//		$j('#listpage #header #titlebar #arrow').css('-webkit-transform','rotate3d(0,0,1,0deg)');
		
		var elemTouch = function(e) {
			e.preventDefault(); 
			
			var theTarget = e.target;
			
			//clear search 
			$j('#listpage #header #searchbar>form>input[type=search]').val('');
			$j('#listpage #header #searchbar>form>button').hide();
			
			hideListSelectButtons(listOverlay); 
			
			var ind = $j('#listpage #listscroller').showActivityInd(loadingImg, 'Loading...');
			displayList(theTarget.id, ind.hide);
			
			return true;
		}
		var externalTouch = function(e) { 
			var theTarget = e.target;
			if (theTarget.nodeType == 3) theTarget = theTarget.parentNode;
		
			var listPage = $j('#listpage');
			if ($j(theTarget).is(listPage) || listPage.has(theTarget).length > 0) e.preventDefault(); 
			
			hideListSelectButtons(listOverlay); return true; 
		}
		addWindowTouchListener(selecterDiv.find('button'), elemTouch, externalTouch, true);
	}
	
	selecterDiv.prev().css('zIndex', overlayZIndex+2);
	selecterDiv.css('zIndex', overlayZIndex+1);
	selecterDiv.css(vendor+'TransitionProperty', '').css('-webkit-transform', 'translateY(-' + selecterDiv.height() + 'px)');
	selecterDiv.css(vendor+'TransitionProperty', '-webkit-transform').css('visibility', 'hidden').show('fast', onShow);
}

function hideListSelectButtons(listOverlay) {
	var selecterDiv = $j('#listpage #header #listselect');
	
	var onComplete = function() {
		if (listOverlay) listOverlay.hide();
		$j('#listpage #header #searchbar').show();
		selecterDiv.unbind('webkitTransitionEnd').hide();
		selecterDiv.css('zIndex', '');
		selecterDiv.prev().css('zIndex', '');
		$j('#listpage #header #titlebar').unbind().click(showListSelectButtons);
	}
	selecterDiv.bind('webkitTransitionEnd', onComplete);
	
	selecterDiv.css('-webkit-transform', 'translateY(-' + selecterDiv.height() + 'px)');
//	$j('#listpage #header #titlebar #arrow').css('-webkit-transform','rotate3d(0,0,1,-90deg)');
}

function addSearchListeners() {
	var searchInFocus = function() { 
		var jqthat = $j(this);
		addWindowTouchListener(jqthat, function() {return false;}, function() { jqthat.blur(); return true; }, false);
	}
	var searchTextChange = function() { 
		var jqthat = $j(this);
		if(jqthat.val().length > 0)  {
			jqthat.next().show(); 
		} else {
			jqthat.next().hide(); 
		}
	}
	var onSubmit = function() {
		var text = $j(this).find('input[type=search]').blur().val();
		text = text.trim();
		if (text.length > 1 && !text.startsWith('*')) {
			var ind = $j('#listpage #listscroller').showActivityInd(loadingImg, 'Searching...');
			//switchToList('#detailpage', true);
			$j('#listpage #header #titlebar #title').html('Search Results');
			searchContacts(text, function() { ind.hide(); });
		}
		return false;
	}
	$j('#listpage #header #searchbar>form').submit(onSubmit);
	$j('#listpage #header #searchbar>form>input[type=search]').focusin(searchInFocus).bind('keydown', searchTextChange).bind('keyup', searchTextChange);
	$j('#listpage #header #searchbar #closebutton').click(function(e) {
		e.preventDefault(); 
		$j(this).hide().prev().val('').blur();
		var ind = $j('#listpage #listscroller').showActivityInd(loadingImg, 'Loading...');
		displayList(selectedListId, ind.hide);
	});
}

function addClickListeners() {
	
	$j('#listpage #header #titlebar').click(showListSelectButtons);
	
	addSearchListeners();
	
	$j('#listpage #footer #gear').touch(
    	function(e) {
    		e.preventDefault();
    		focusOutContactList();
	    	SettingsManager.show();
	    });
    
    $j('#listpage #footer #home').touch(
    	function(e) {
    		e.preventDefault();
    		focusOutContactList();
    		showContactNews(null, true);
    	});
    	
    /*
    $j('#detailpage').wipetouch({
    		wipeRight : function(res) {
    				if ($j('#map_div #google_map_canvas').has(res.event.target).size() == 0) {
						switchToList('#detailpage', true);
					}
				}
			});*/
}

function showContact(contactId) {

	$j('#contactlist .cellselected').removeClass('cellselected');
	$j('#contactlist #contact_' + contactId).addClass('cellselected');
		
	selectedContactId = contactId;
	addLeftNavClickListeners([selectedContactId]);
	focusOutContactList(); 
	// Hide the details and show the empty panel after hide operation completes
	$j('#rightsection #detailpage #detail').css('visibility', 'hidden').css('opacity', '0');
	$j('#detailpage .header>span').empty();
	switchToDetail('#listpage', false);

	var ind = $j('#rightsection').showActivityInd(loadingImg, 'Loading...');
	switchDetailSection('info', [selectedContactId], function(success) { 
		if (success) {
			$j('#rightsection #detailpage #detail')
			.css('visibility', '').css('opacity', '1');
		}
		ind.hide(); 
	});
	updateLastVisitLoc(selectedContactId + '/' + 'info');
}

function addContactsToList(recs) {
	recs.sort(function(x, y) {
		var a = x.LastName.toLowerCase(); var b = y.LastName.toLowerCase();
		return ((a == b) ? 0 : ((a > b) ? 1 : -1 ));
    });
	var chars = [];    	
	
	currentContacts = [];
	
	$j.each(recs, 
		function () {
			 var id = htmlEncode(this.Id);
			 currentContacts.push(id);
    		 var rec = this;
    		 if (chars.length == 0 || (this.LastName != null && chars.last() != this.LastName[0].toUpperCase())) {
    		 	chars.push(this.LastName[0].toUpperCase());
    		 	$j('<li></li>').addClass('listseparater').text(chars.last()).appendTo('#contactlist');
    		 }
			 
			 var listElem = $j('<li></li>').attr('id', 'contact_' + id);
			 if (id == selectedContactId) listElem.addClass('cellselected');
			 listElem.text((this.FirstName || '') + ' ')
			 		 .append($j('<strong></strong>').text(this.LastName || ''))
					 .click(
			 	function(e) {
		 			e.preventDefault();
			 		showContact(this.id.substring(8));
				}).appendTo('#listscroller #scroller #contactlist');
		});
}

function getContacts(filter, callback) {

	var onComplete = function(jqXHR, statusText) {
		initiateContactListScroller(function() { getContacts(filter); }); // Refresh scroller
		if (typeof callback == 'function') {
			callback(statusText == 'success');
		}
	}
	
	sf.queryContactsViaApex(filter,
    		function(response) {
    			$j('#listscroller #scroller #contactlist').empty();
				$j('#listscroller #scroller #resultCount').empty();
    		
    			if(response.totalSize == 0) {
    				$j('#listscroller #scroller #resultCount').text('No ' + contactPluralLabel);
    				currentContacts = [];
    			} else {
    				$j('#listscroller #scroller #resultCount').text('' + response.totalSize + ' ' + contactPluralLabel);
    				addContactsToList(response.records);
				}
			}, 
			errorCallback, onComplete);
}

function searchContacts(searchText, callback) {
	var onComplete = function(jqXHR, statusText) {
		if (typeof callback == 'function') {
			callback(statusText);
		}
	}
	
    sf.searchContactsViaApex(searchText,
    		function(response) {
    			$j('#listscroller #scroller #contactlist').empty();
				$j('#listscroller #scroller #resultCount').empty();
	
    			if(!response || response.length == 0) {
    				$j('#listscroller #scroller #resultCount').text('No ' + contactPluralLabel + ' Found');
    				currentContacts = [];
    			} else {
    				$j('#listscroller #scroller #resultCount').text('Found ' + response.length + ' ' + contactPluralLabel);
    				addContactsToList(response);
				}
				
				initiateContactListScroller(function() { searchContacts(searchText); }); // Refresh scroller
				 
				if (typeof callback != 'undefined' && callback != null) {
					callback();
				}
			}, 
			errorCallback, onComplete);
}

function getChatter(contactId, callback) {
    var onComplete = function(jqXHR, statusText) {
		if (typeof callback == 'function') {
			callback(statusText);
		}
	}
	
    sf.fetchChatterViaApex([contactId],
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
	
    sf.fetchActivitiesViaApex([contactId],
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
	detail.find('#summary #photo_div>div').html(formatStr(contact.Name, 25));
	detail.find('#summary #company .fieldLbl').setText(fieldInfo.AccountId.relationshipLabel.toUpperCase(), true);
	detail.find('#summary #company .fieldVal').setText(contact.Account ? contact.Account.Name : ' ', true);
	detail.find('#summary #title .fieldLbl').setText(fieldInfo.Title.label.toUpperCase(), true);
	detail.find('#summary #title .fieldVal').setText(contact.Title || ' ', true);
	detail.find('#summary #phone .fieldLbl').setText(fieldInfo.Phone.label.toUpperCase(), true);
	detail.find('#summary #phone .fieldVal').setText(contact.Phone || ' ', true);
		
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
	info.find('#Account .fieldLbl').text(fieldInfo.AccountId.relationshipLabel);
	info.find('#Account .fieldVal').html(contact.Account ? formatStr(contact.Account.Name, 50) : '&nbsp;');
	info.find('#Department .fieldLbl').text(fieldInfo.Department.label);
	info.find('#Department .fieldVal').html(formatStr(contact.Department, 50) || '&nbsp;');
	info.find('#Phone .fieldLbl').text(fieldInfo.Phone.label);
	info.find('#Phone .fieldVal').html((contact.Phone) ? '<a href="tel:' + formatStr(cleanupPhone(contact.Phone)) + '" style="text-decoration:none;">' + formatStr(contact.Phone, 30) + '</a>' : '&nbsp;');
	info.find('#Mobile .fieldLbl').text(fieldInfo.MobilePhone.label);
	info.find('#Mobile .fieldVal').html((contact.MobilePhone) ? '<a href="tel:' + formatStr(cleanupPhone(contact.MobilePhone)) + '">' + formatStr(contact.MobilePhone, 30) + '</a>' : '&nbsp;');
	info.find('#Email .fieldLbl').text(fieldInfo.Email.label);
	info.find('#Email .fieldVal').html((contact.Email) ? '<a href="mailto:' + contact.Email + '" style="text-decoration:none;">' + formatStr(contact.Email, 50) + '</a>' : '&nbsp;');
	info.find('#ReportsTo .fieldLbl').text(fieldInfo.ReportsToId.label.replace(/\sID$/,''));
	info.find('#ReportsTo .fieldVal').html(contact.ReportsTo ? formatStr(contact.ReportsTo.Name, 50) : '&nbsp;');
					
	add = formatAddress(contact);
	info.find('#Address .fieldLbl').text('Mailing Address');
	info.find('#Address .fieldVal').html((add.length > 0 ) ? add.replace(/\n/g, '<br/>') : '&nbsp;');
	codeAddressOnMap(add.replace(/\n/g, ', '));
}

function renderContactInfo(contactId, callback) {
	var loadSuccess = false;
	
    var onComplete = function(jqXHR, statusText) {
		if (typeof callback == 'function') {
			setTimeout( function() { 
				truncateLongText($j('#rightsection #detailpage #detail #summary table td div')); 
				initiateInfoScroller(); infopagescroll.scrollTo(0, 0, 0); 
			}, 10);
			callback(loadSuccess);
		}
	}
	
	var fields = ['Id', 'Name', 'Account.Id', 'Account.Name', 'Department', 'Title', 'Phone', 
        	      'MobilePhone', 'Email', 'MailingStreet', 'MailingCity', 'MailingState', 
        	      'MailingCountry', 'MailingPostalCode', 'ReportsTo.Name'];
    if (hasRecordTypes) fields.push('RecordTypeId');
	
	var info = $j('#rightsection #detailpage #detail #info');
	
    sf.retrieveContactViaApex(contactId, fields,
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
	detailsLayout.find('#viewMoreBtn').show().unbind().click(
		function() {
			$j(this).unbind().find('span').text('Loading Details...');
			$j(this).find('img').show();
			sf.getContactDetailsViaApex(contactId, recordTypeId,
				function(response) {
					var resp = $j(response);  resp.find('head, script').remove();
					formatDetailContent(detailsLayout.find('#layout').empty().append(resp));
					detailsLayout.find('#viewMoreBtn').hide();
				}, errorCallback, function() { initiateInfoScroller(); });
		});
}

function showContactNews(callback, showLoadingIndicator) {

	focusOutContactList(); 
	$j('#detailpage #contactInfo').hide();
	$j('#detailpage .header>span').text(contactLabel + ' Feed');
	$j('#feedscroller').appendTo('#contactNews .contentpage').css('visibility', 'hidden').show();
	$j('#detailpage #contactNews').show();
	$j('#contactlist .cellselected').removeClass('cellselected');
	
	var ind;
	if (showLoadingIndicator) {
		ind = $j('#rightsection').showActivityInd(loadingImg, 'Loading...');
	}
	switchToDetail('#listpage', false);
	updateLastVisitLoc();
	
	var options = {};
	options.includeParent = true;
	options.onClickParent = function(e) {
		if (this.id.startsWith('contact_')) {
			e.preventDefault();
			showContact(this.id.substring(8));
		}
	}
	
	getAggregateFeed(currentContacts, function(status) { 
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
	
    sf.fetchChatterViaApex(contactIdArr,
    		function(response) {
    			recs[0] = (response.totalSize > 0) ? response.records : [];
    			onSuccess();
			}, 
			errorCallback, onComplete);
			
	sf.fetchActivitiesViaApex(contactIdArr,
    		function(response) {
    			recs[1] = (response.tasks && response.tasks.totalSize > 0) ? response.tasks.records : [];
    			onSuccess();
			}, 
			errorCallback, onComplete);
}

function fetchContactDescribe(callback) {

	sf.describeContactViaApex( 
			function(response) {
				contactLabel = response.label || 'Contact';
				contactPluralLabel = response.labelPlural || 'Contacts';
				if(response.fields) {
					var fields = {};
					$j.each(response.fields,
						function() {
							var field = {'label':this.label, 'type':this.type, 'length': this.length};
							if (field.type == 'reference') {
								field.relationshipName = this.relationshipName;
								field.referenceTo = this.referenceTo;
								field.relationshipLabel = this.relationshipLabel || '';
							}
							fields[this.name] = field;
						});
					setSessionValue(contact_describe_storage_key, JSON.stringify(fields));
				}
				if (response.recordTypeInfos && response.recordTypeInfos.length > 1) {
					hasRecordTypes = true;
				}
			}, errorCallback, callback);
}

function addLeftNavClickListeners(contact) {
	$j('#rightsection #detailpage #leftnav .dsIcons').unbind('click')
		.click(function() {		
			
			var loadingText = 'Loading';
			switch (this.id) {
				case 'info': loadingText += ' Details'; break;
				case 'rss': loadingText += ' All Feeds'; break;
				case 'chatter': loadingText += ' Chatter'; break;
				case 'salesforce': loadingText += ' Activities'; break;
			}
			
			var ind = $j('#rightsection #detailpage').showActivityInd(loadingImg, loadingText + '...');
			switchDetailSection(this.id, contact, ind.hide); 
		});
}

function switchDetailSection(section, contact, callback) {
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
	} else if (section == 'google') {
		var googleObj = '<object id="object" height="100%" width="100%" type="text/html" data="http://www.google.com/search?q=' + contact[1] + '"></object>';
		var googleDiv = $j('#rightsection #detailpage #detail #google');
		googleDiv.children().remove();
		googleDiv.append(googleObj);
		cb();
	} else {
		cb();
	}
	updateLastVisitLoc(contact[0] + '/' + section);
}

function createScroller(el, onPullDownCallback) {
	
	var pullDownOffset, onRefresh, onScrollMove, onScrollEnd;
	var elem = (typeof el == 'object') ? el : $j('#' + el);
	
	if (onPullDownCallback) {
	
		var pullDownEl = elem.find('#pullDown')[0];
		
		if (!pullDownEl) {
			var pullDownElHtml = '<div id="pullDown"><span class="appleui pullDownIcon"></span><span class="pullDownLabel">Pull down to refresh</span> </div>';
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
				
				onPullDownCallback();	// Execute custom function (ajax call?)
			}
		};
	}
	
	var options = {useTransition: true, topOffset: pullDownOffset || 0 };
	if (onRefresh) options.onRefresh = onRefresh;
	if (onScrollMove) options.onScrollMove = onScrollMove;
	if (onScrollEnd) options.onScrollEnd = onScrollEnd;

	return new iScroll(elem[0], options);
}

var map, marker;
function initializeMap() {
	if (map) return;
	
    var latlng = new google.maps.LatLng(-34.397, 150.644);
    var myOptions = {
      zoom: 8,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: false,
      mapTypeControl: false
    }
    map = new google.maps.Map(document.getElementById("google_map_canvas"), myOptions);
	$j('#map_section #map_div #recenter').unbind().click( 
		function() {
			if (map && marker) { map.setCenter(marker.getPosition()); }
		});
}

function codeAddressOnMap(address) {
	
	initializeMap();
	$j('#map_div').show().css('visibility', 'hidden');
	$j('#map_section').show().css('visibility', 'hidden');
		
	var geocoder = new google.maps.Geocoder();
    geocoder.geocode( { 'address': address}, function(results, status) {
      
      if (marker) { marker.setMap(null); marker = undefined; }
      
      if (status == google.maps.GeocoderStatus.OK) {
      	$j('#map_div #error').hide();
      	$j('#map_section').css('visibility', '')
      		.find('#map_div').css('visibility', '');

      	google.maps.event.trigger(map, 'resize');
        map.setCenter(results[0].geometry.location);
        marker = new google.maps.Marker({
            map: map,
            position: results[0].geometry.location
          /*  icon: staticRsrcUrl + '/images/markerPin.png'*/
        });
      } else {
      	//$j('#map_div #error').html("Unable to locate the address. Geocode was not successful.").show();
      	$j('#map_section').hide();
      }
    });
}
