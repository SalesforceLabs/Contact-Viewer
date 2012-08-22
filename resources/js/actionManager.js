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

(function() {

	var ActionManager, phoneActions, emailActions, actionInfos;

	ActionManager = function() {};

	actionInfos = {
        'Call': { href: 'tel:${target}' }, 
        'Message': { href: 'sms:${target}' }, 
        'Skype': { href: 'skype:${target}?call' }, 
        'Facetime': { href: 'facetime://${target}' },
        'Email': { href: 'mailto:${target}' },
        'Map': { href: 'https://maps.google.com/maps?q=${target}' }
    };
    phoneActions = ['Call', 'Message', 'Skype', 'Facetime'];
    emailActions = ['Email', 'Facetime'];

    ActionManager.prototype.getTargetType = function(target) {
    	if (/^tel:/.test(target)) return 'phone';
		else if (/^mailto:/.test(target)) return 'email';
		return null;
    }

    ActionManager.prototype.getTarget = function(template, href) {
    	var path, target = '#';
    	if (template) {
    		switch(this.getTargetType(href)) {
				case 'phone': target = href.substring(4); break;
				case 'email': target = href.substring(7); break;
			}
			target = template.replace('${target}', target);
		}
		return target;
	}

	ActionManager.prototype.getActions = function(target) {
		switch(this.getTargetType(target)) {
			case 'phone': return phoneActions;
			case 'email': return emailActions;
		}
		return [];
	}

	ActionManager.prototype.handleAction = function(action, target) {
		
		if (actionInfos[action].call) {
			switch(this.getTargetType(target)) {
				case 'phone': target = target.substring(4); break;
				case 'email': target = target.substring(7); break;
				case 'address': target = target.substring(target.indexOf('?q=') + 3); break;
			}
			actionInfos[action].call.apply(this, [target]);
		}
	}

	ActionManager.prototype.attachHandler = function(anchors) {
		var manager = this, showActions;

		// Method to show the action sheet
		showActions = function(e) {
	        var overlay, actionSheet, actionBtns = [], 
	        	href = this.href,
	        	actions = manager.getActions(href);

            e.preventDefault();
            a = true;

            // Add an overlay to prevent other actions
            overlay = $j('body').addOverlay();

            actions.forEach(function(action) {
                actionBtns.push('<a id="' + action + '" ');
                actionBtns.push('href="' + manager.getTarget(actionInfos[action].href, href) + '" ');
                actionBtns.push('class="button">' + action + '</a>');
            });
            actionBtns.push('<div id="cancel" class="button">Cancel</div>');

            actionSheet = $j('<div class="actionSheet"></div>').css('visibility', 'hidden')
                            .css('zIndex', $j.topZIndex(overlay.elem) + 10)
                            .append(actionBtns.join('')).appendTo('body');

            // Attach action button tap listener
            actionSheet.find('.button').enableTap().click(
                function(ev) {
            	    var postHide = function() { actionSheet.remove(); overlay.hide(); }
                    // close panel
                    if (useAnimations) actionSheet.slideOut('Y', window.innerHeight, postHide);
                    else postHide();

                    if (this.id != 'cancel') window.ActionManager.handleAction(this.id, href);
                }
            );
            // Show the actionSheet
            if (useAnimations) // With slide
                actionSheet.slideIn('Y', window.innerHeight, (window.innerHeight - actionSheet.outerHeight()));
            else // just show
                actionSheet.css({top: (window.innerHeight - actionSheet.outerHeight()), visibility: ''});
	    }

	    // Attach listeners for relevant anchor tags
		anchors.each(function() {
			var href = this.href,
				actions = manager.getActions(href);

			// If multiple actions show action sheet else just execute the action
			if (actions.length > 1) {
				$j(this).click(showActions);
			} else if (actions.length == 1) {
				this.href = manager.getTarget(actionInfos[actions[0]].href, href);
				$j(this).click(function() { 
					window.ActionManager.handleAction(actions[0], href); 
				});
			}
		});
	}

	window.ActionManager = new ActionManager();
})();