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

function isTouchDevice() {
   return window.Touch ? true : false;
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

function addWindowTouchListener(elem, elemCallback, externalCallback, once) {

	var touchDetect = function(e) {
		
		var theTarget = e.target;
		if (theTarget.nodeType == 3) theTarget = theTarget.parentNode;
		
		var unbind = true;
		
		if ($j(theTarget).is(elem) || elem.has(theTarget).length > 0) {
			if (typeof elemCallback == 'function') unbind = elemCallback(e);
		} else {
			if (typeof externalCallback == 'function') unbind = externalCallback(e);
		}
			
		if (once || unbind) $j(window).unbindTouch(touchDetect);
	}
	
	$j(window).touch(touchDetect);
	return touchDetect;
}

function removeWindowTouchListener(listener) {
	if (typeof listener == 'function')
		$j(window).unbindTouch(listener);
}

function getBaseUrl() {
	var basepath = window.location.protocol + '//' + window.location.hostname;
	basepath += (window.location.pathname.length > 1) ? window.location.pathname : '';
	return basepath;
}

function getFieldDescribe() {
	return eval('(' + getSessionValue(contact_describe_storage_key) + ')');
}

function truncateLongText(elems) {
	var values = [], idx = 0;
	$j.each(elems,
		function() { 
			var that = $j(this);
			values[idx++] = that.text(); that.empty();
		});
		
	idx = 0;
	$j.each(elems, 
		function() {
			var that = $j(this);
			that.setText(values[idx++], true);
		});
}

function isPortrait() {
	return (window.innerHeight > window.innerWidth);
}