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

var vendor = (/webkit/i).test(navigator.appVersion) ? 'webkit' :
		(/firefox/i).test(navigator.userAgent) ? 'Moz' :
		'opera' in window ? 'O' : '';
		
(function($) {

	var actInd;
	
	/*changePage: function (to, reverse, callback) {
		var fromPage = this;
		var toPage = x$(to);
		
		var mult = reverse ? -1 : 1;
		pageScrollLoc[this] = document.body.scrollTop;
		var scrollDiff = pageScrollLoc[to] - pageScrollLoc[fromPage];
		
		toPage.setStyle('display', 'block').setStyle('left', mult*document.body.clientWidth + 'px');
		fromPage.setStyle('top', scrollDiff+'px');
		document.body.scrollTop = pageScrollLoc[to];
		
		fromPage.tween({left:-1*mult*document.body.clientWidth + 'px', duration:500}); 
		toPage.tween({left:'0px', duration:500, after: function() { fromPage.setStyle('top', '0px').setStyle('display', 'none');} }, callback);
	}*/
	
	$.fn.changePage = function (to, reverse, callback) {
		var fromPage = this;
		var toPage = (typeof to == 'object') ? to : $(to);
		
		var parentWidth = this.parent().width();
		
		var mult = reverse ? -1 : 1;
		
		fromPage.slideOut('X', -1*mult*parentWidth);
		toPage.slideIn('X', mult*parentWidth, 0, callback);
		
	};
	
	$.fn.scrollHeight = function() {
		return this[0].scrollHeight;
	};
	
	$.fn.slideIn = function(axis, initialPos, finalPos, callback) {
		var that = this;
		
		var initialTransform, finalTransform;
		switch(axis.toUpperCase()) {
			case 'X': 
				initialTransform = 'translate3d(' + initialPos + 'px, 0px, 0px)';
				finalTransform = 'translate3d(' + finalPos + 'px, 0px, 0px)';
				break;
			case 'Y': 
				initialTransform = 'translate3d(0px, ' + initialPos + 'px, 0px)';
				finalTransform = 'translate3d(0px, ' + finalPos + 'px, 0px)';
				break;
		};
		
		that.css(vendor + 'TransitionProperty','none')
			.css(vendor + 'Transform', initialTransform).css('visibility', 'hidden');
		
		var onComp = function() { that.unbind('webkitTransitionEnd'); if(typeof callback == 'function') callback(); };
		this.unbind('webkitTransitionEnd').bind('webkitTransitionEnd', onComp);
		
		var transProp = '-' + vendor.toLowerCase() + '-transform';
		
		this.addClass('transitionSettings').css(vendor + 'TransformOrigin' + axis.toUpperCase(), initialPos)
			.css('visibility', 'visible');
		setTimeout(function() { 
			that.css(vendor + 'TransitionProperty', transProp)
				.css(vendor + 'Transform', finalTransform); 
		}, 10);
	};
	
	$.fn.slideOut = function(axis, finalPos, callback){
		var that = this;
		
		var finalTransform;
		switch(axis.toUpperCase()) {
			case 'X': 
				finalTransform = 'translate3d(' + finalPos + 'px, 0px, 0px)';
				break;
			case 'Y': 
				finalTransform = 'translate3d(0px, ' + finalPos + 'px, 0px)';
				break;
		};
		
		var onComp = function() { 
			that.unbind('webkitTransitionEnd').css('visibility', 'hidden'); 
			if(typeof callback == 'function') callback(); 
		};	
		this.unbind('webkitTransitionEnd').bind('webkitTransitionEnd', onComp);
				
		this.css(vendor + 'Transform', finalTransform);
	};
	
	$.fn.slideInLeft = function(callback) {
				
		var leftPos = this.parent().width() - this.outerWidth(); // Element should be hidden before calculating width
		this.slideIn('X', this.parent().width(), leftPos, callback);
	};
	
	$.fn.slideOutRight = function(callback) {
				
		if (this.css('display') == 'block') {
			this.slideOut('X', this.parent().width(), callback);
		}	
	};
	
	$.fn.showActivityInd = function(loadingImgUrl, displayText, addOverlay) {
		
		var overlay;
		if(addOverlay) overlay = this.addOverlay();
		
		if (actInd) actInd.hide().unbind();
		else {
			actInd = $('<div></div>').hide().append('<img/><br/><span/>');
			actInd.appendTo(document.body);
		}
		
		actInd[0].style.cssText = 'background-color:black; position: absolute; padding: 20px; color:white;' +
							      '-webkit-border-radius: 10px; text-align: center; z-index:1000';
		
		if (loadingImgUrl) actInd.find('img').css('padding-bottom', '15px').attr('src', loadingImgUrl);
		actInd.find('span').text(displayText || 'Loading...');
		
		var parentPos = this.offset();
		parentPos = (parentPos) ? parentPos : {left: 0, top: 0};
		var leftPos = parentPos.left + (this.width() - actInd.outerWidth(false))/2;
		var topPos = parentPos.top + (this.height() - actInd.outerHeight(false))/2;
		actInd.css('left', leftPos).css('top', topPos);
		
		//actInd.css(vendor + 'Transform', 'scale3d(2, 2, 1)').show();
		actInd[0].style.cssText += ';-webkit-transition:-webkit-transform 100ms ease-out;';
		actInd.show();
		
		//setTimeout(function() { actInd.css('-webkit-transform', 'scale3d(1, 1, 1)'); }, 0);
		
		return {
			hide: function() {
				actInd.css('-webkit-transition-property', '-webkit-transform, opacity');
				actInd.bind('webkitTransitionEnd', function() { actInd.hide(); });
				actInd.css({webkitTransform: 'scale3d(0.5, 0.5, 1)', opacity: '0'});
				//actInd.hide().remove();
				if(overlay) overlay.hide();
			}
		};
	};
	
	$.fn.addOverlay = function() {
		var that = this;
		
		var elemZIndex = $.topZIndex(that);
		
		var overlay = $('<div></div>').hide();
		overlay[0].style.cssText = 'background-color: black; border: none; opacity: 0.5; position: absolute; z-index:' + (elemZIndex + 10) + ';';
		
		overlay.css({width: that.width(), height: that.height()});
		overlay.appendTo(that).show().offset(that.offset());
		
		overlay.orientationChange(function () { 
			overlay.offset(that.offset()); 
			overlay.css({width: that.width(), height: that.height()});
		});

		return {
			elem: overlay,
			hide: function() {
				overlay.unbind('orientationchange').hide().remove();
			}
		};
	};
	
	$.fn.positionCenterOf = function(elem) {
		var topLoc = ($j(elem).height()/2 - this.outerHeight()/2);
		var leftLoc = ($j(elem).width()/2 - this.outerWidth()/2);
		
		this.offset({top: topLoc, left: leftLoc});
	};
	
	$.fn.orientationChange = function(listener) {
		if (window.onorientationchange) {
			this.bind('orientationchange', listener);
		} else {
			$j(window).resize(listener);
		}
		return this;
	};
	
	$.fn.unbindOrientationChange = function(listener) {
		if (window.onorientationchange) {
			this.unbind('orientationchange', listener);
		} else {
			$j(window).unbind('resize', listener);
		}
		return this;
	};
	
	$.fn.touch = function(listener) {
		if (window.Touch) this.bind('touchstart', listener);
		else this.bind('click', listener);
		return this;
	};
	
	$.fn.unbindTouch = function(listener) {
		if (window.Touch) this.unbind('touchstart', listener);
		else this.unbind('click', listener);
		return this;
	};
	
	$.fn.setText = function(text, autoTruncateLongText, fixedWidthElem) {
		this.text('');
		var elem = (fixedWidthElem || this);
		var initialWidth = elem.width();
		
		if (text == ' ') this.html('&nbsp;');
		else this.text(text); 
		
		var lastWidth = elem.width() + 1;
		
		while(autoTruncateLongText && text.length > 3 && elem.width() > initialWidth && elem.width() < lastWidth) {
			text = text.substring(0, Math.max(0, text.length - 4)) + '...';
			lastWidth = elem.width();
			this.text(text);
		}
		return this;
	};
	
})(jQuery);