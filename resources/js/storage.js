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
 
function checkLocalStorage()
{
    if (typeof(localStorage) == 'undefined') {
        return false;
    }
    return true;
}

function checkSessionStorage()
{
    if (typeof(sessionStorage) == 'undefined') {
        return false;
    }
    return true;
}
 
function clearAll()
{
	if (checkLocalStorage()) {
	    localStorage.clear();
	}
	if (checkSessionStorage()) {
		sessionStorage.clear();
	}
}
 
 
function setLocalValue(key, value)
{
	if (checkLocalStorage()) {
		localStorage.setItem(key, value);
	}
}

function getLocalValue(key)
{
	if (checkLocalStorage()) {
		return localStorage.getItem(key);
	}
}
 
function clearLocalValue(key)
{
	if (checkLocalStorage()) {
		localStorage.removeItem(key);
	}
}

function setSessionValue(key, value)
{
	if (checkSessionStorage()) {
		sessionStorage.setItem(key, value);
	}
}

function getSessionValue(key)
{
	if (checkSessionStorage()) {
		return sessionStorage.getItem(key);
	}
}
 
function clearSessionValue(key)
{
	if (checkSessionStorage()) {
		sessionStorage.removeItem(key);
	}
}