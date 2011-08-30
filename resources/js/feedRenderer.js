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
 
var FeedPhotoRenderer = function() { this.userIds = []; }

FeedPhotoRenderer.prototype.getImage = function(userId) {
	this.userIds.push(userId);
	return '<img class="feedImage" id="photo__' + escape(userId) + '"/>';
}

FeedPhotoRenderer.prototype.renderImages = function(scope) {
	if (this.userIds.length == 0) return;
	
	if (!scope) scope = $j(document.body);
	sf.getUsersInfoViaApex(this.userIds,
						 function(response) {
	    					$j.each(response.records, 
    							function () {
    								scope.find('#photo__' + escape(this.Id)).attr('src', this.SmallPhotoUrl);
	    						}
		    				);
						 }, errorCallback);
}

function feedRenderer(records, noFeedMsg, options) {
	var feedWrapperDiv = $j('#feedscroller #feed');
	var feedList = feedWrapperDiv.find('ul');
	
    feedList.empty();
    feedWrapperDiv.find('div').remove();
    
	if (!records || records.length == 0) {
		feedWrapperDiv.append($j('<div style="padding-top:20px"></div>').text(noFeedMsg));
		return;
	}
	
	var photoRenderer = new FeedPhotoRenderer();
	var fieldInfos = getFieldDescribe();
	
	$j.each(records,
		function() {
			var rec = this;
			var type = rec.attributes.type;
			if (type == 'ContactFeed') {
				// add chatter item
				generateChatterItem(rec, feedList, photoRenderer, fieldInfos, options);
			} else if (type == 'Task') {
				// add task item
				generateTaskItem(rec, feedList, photoRenderer, options);
			}
		}
	);
	
	photoRenderer.renderImages(feedList);
}

//chatter feed renderer
function generateChatterItem(rec, parent, photoRenderer, fieldInfos, options) {

    var text = (rec.Body || '');
    if (rec.Type == 'TrackedChange') {
    	$j.each(rec.FeedTrackedChanges.records,
     		function() {
    			if (this.FieldName == 'created') text = 'created this ' + contactLabel.toLowerCase() + '.';
    			else if (this.FieldName == 'contactUpdatedByLead') text = 'updated this ' + contactLabel.toLowerCase() + ' by converting a lead.';
    			else if (this.FieldName == 'contactCreatedFromLead') text = 'converted a lead to this ' + contactLabel.toLowerCase() + '.';
    			else if (this.NewValue != null || this.OldValue != null) {
    				var fieldLabel = fieldInfos[this.FieldName.split('.')[1]].label;
    				text = ('updated ' + fieldLabel + ' from ' + (this.OldValue || 'blank') + ' to ' + (this.NewValue || 'blank'));
    			}
	    	}
     	);
    }
    
    var feedItemParent;
    if (options && options.includeParent) {
    	feedItemParent = $j('<span style="font-weight:bold"></span>').text(rec.Parent.Name);
    	feedItemParent = $j('<a href="#"/>').attr('id', 'contact_' + htmlEncode(rec.Parent.Id)).append(feedItemParent);
    	feedItemParent[0].onclick = options.onClickParent;
    }
	
	var feedBody = $j('<div class="feedBody"></div>').append(feedItemParent).append((feedItemParent) ? '&nbsp;-&nbsp;' : '')
					.append($j('<strong></strong>').text(rec.CreatedBy.Name)).append('&nbsp;') 
					.append($j('<span></span>').text(text)).append('<br/><span class="datetime">' +  $j.format.date(rec.CreatedDate, 'MMM dd, yyyy (at) hh:mm a') + '</span>');
	$j('<li></li>').append(photoRenderer.getImage(rec.CreatedBy.Id)).append(feedBody).appendTo(parent);
}
		 
						 
//Activity Feed renderer
function generateTaskItem(rec, parent, photoRenderer, options) {

	var feedItemParent;
    if (options && options.includeParent) {
    	feedItemParent = $j('<span style="font-weight:bold"></span>').text(rec.Who.Name);
    	feedItemParent = $j('<a href="#"/>').attr('id', 'contact_' + htmlEncode(rec.Who.Id)).append(feedItemParent);
    	feedItemParent[0].onclick = options.onClickParent;
    }
    
	//var image = '<img class="feedImage" id="task_icon" src="' + staticRsrcUrl + '/images/icons/tasks.png' + '"/>';
	var feedBody = $j('<div class="feedBody"></div>').append(feedItemParent).append((feedItemParent) ? '&nbsp;-&nbsp;' : '')
					.append($j('<strong></strong>').text(rec.Owner.Name)).append(' ' + (rec.IsClosed ? 'completed' : 'owns') + ' the task<br/>')
					.append($j('<span></span>').text(rec.Subject || '')).append('<br/><span class="datetime">Due on ' +  (rec.ActivityDate ? $j.format.date(rec.ActivityDate, 'MMM dd, yyyy') : '') + '</span>');	
    $j('<li></li>').append(photoRenderer.getImage(rec.Owner.Id)).append(feedBody).appendTo(parent);
}