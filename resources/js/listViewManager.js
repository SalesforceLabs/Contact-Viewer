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

// We use $j rather than $ for jQuery so it works in Visualforce
if (window.$j === undefined) {
    $j = $.noConflict();
}

if (sforce.ListView === undefined) {

    /**
     * The ListView provides a convenient wrapper for initializing and managing the list view 
     * UI component.
     * @param [listOptions] Options such as (onListSelect, onSearch, onItemSelect).
     * @constructor
     */
    sforce.ListView = function(listOptions) {
        var that = this;
        
        // Default options
        that.options = {
            onListSelect: null,
            onSearch: null,
            onItemSelect: null,
            listTypes: {'owner':'My Records', 'follow':'Records I Follow', 'recent':'Recently Viewed'}
        };
        
        // User defined options
        for (i in that.options) that.options[i] = listOptions[i];
        
        that.selectedContactId = listOptions.selectedContactId;
        that.view = $j('#listpage');
        that._init();
    }
    
    sforce.ListView.prototype = {
    
        _init : function() {
            var that = this;
            
            var _hideListSelectButtons = function(listOverlay) {
                
                var selecterDiv = that.view.find('#header #listselect');
                
                var onComplete = function() {
                    if (listOverlay) listOverlay.hide();
                    that.view.find('#header #searchbar').show();
                    selecterDiv.unbind('webkitTransitionEnd').hide();
                    selecterDiv.css('zIndex', '');
                    selecterDiv.prev().css('zIndex', '');
                    that.showingListSelector = false;
                }
                selecterDiv.bind('webkitTransitionEnd', onComplete);
                
                selecterDiv.css('-webkit-transform', 'translateY(-' + selecterDiv.height() + 'px)');
            }
            
            var _showListSelectButtons = function() {
                
                if (that.showingListSelector) return;
                else that.showingListSelector = true;
                
                var selecterDiv = that.view.find('#header #listselect'),
                    listOverlay = that.view.find('#listscroller').addOverlay(),
                    overlayZIndex = $j.topZIndex(listOverlay.elem);
                    
                var onShow = function() {
                    
                    that.view.find('#header #searchbar').hide();
                    selecterDiv.css('visibility', '').css('-webkit-transform', 'translateY(0px)')
                    
                    var elemTouch = function(e) {
                        e.preventDefault(); 
                        
                        var theTarget = e.target;
                        
                        //clear search 
                        that.view.find('#header #searchbar>form>input[type=search]').val('');
                        that.view.find('#header #searchbar>form>button').hide();
                        
                        _hideListSelectButtons(listOverlay); 
                        that._displayList(theTarget.id);
                        
                        return true;
                    }
                    var externalTouch = function(e) { 
                        var theTarget = e.target;
                        if (theTarget.nodeType == 3) theTarget = theTarget.parentNode;
                    
                        var listPage = $j('#listpage');
                        if ($j(theTarget).is(listPage) || listPage.has(theTarget).length > 0) e.preventDefault(); 
                        
                        _hideListSelectButtons(listOverlay); return true; 
                    }
                    selecterDiv.find('button').windowTouch(elemTouch, externalTouch, true);
                }
                
                selecterDiv.prev().css('zIndex', overlayZIndex+2);
                selecterDiv.css('zIndex', overlayZIndex+1);
                selecterDiv.css(vendor+'TransitionProperty', '').css('-webkit-transform', 'translateY(-' + selecterDiv.height() + 'px)');
                selecterDiv.css(vendor+'TransitionProperty', '-webkit-transform').css('visibility', 'hidden').show('fast', onShow);
            }
        
            that._addSearchListeners();
            that.view.find('#header #titlebar').unbind().click(_showListSelectButtons);            
            that.view.find('#listscroller #scroller #contactlist').unbind().click(
                function(e) {
                    var theTarget = e.target;
                    
                    if (that.loadingItem) return;
                    
                    theTarget = $j(theTarget).closest('li', that.view);
                    e.preventDefault();
                    
                    if (theTarget.length && !theTarget.hasClass('listseparater') && 
                        typeof that.options.onItemSelect == 'function') {
                        that.selectContact(theTarget[0].id.substring(8));
                    }
                });
        },
        
        _addSearchListeners : function() {
            var that = this;
            
            var searchInFocus = function() { 
                var jqthat = $j(this);
                jqthat.windowTouch(function() {return false;}, function() { jqthat.blur(); return true; }, false);
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
                    that.mode = "search";
                    that.view.find('#header #titlebar #title').html('Search Results');
                    if (typeof that.options.onSearch == 'function') that.options.onSearch(text);
                }
                return false;
            }
            that.view.find('#header #searchbar>form').submit(onSubmit);
            that.view.find('#header #searchbar>form>input[type=search]').focusin(searchInFocus).bind('keydown', searchTextChange).bind('keyup', searchTextChange);
            that.view.find('#header #searchbar #closebutton').click(function(e) {
                e.preventDefault(); 
                $j(this).hide().prev().val('').blur();
                if (that.mode == 'search') {
                    that._displayList(that.selectedListId);
                    that.mode = 'list';
                }
            });
        },
        
        _displayList : function(listId) {
        
            var that = this, listButton;
            
            if (listId) listButton = that.view.find('#header #listselect button#' + listId);
            else listButton = that.view.find('#header #listselect button#recent');
            
            that.view.find('#header #titlebar #title').text(listButton.text());
            
            that.selectedListId = listButton[0].id;
            
            if (typeof that.options.onListSelect == 'function') {
                that.options.onListSelect(that.selectedListId);
            }
        },
        
        _initiateContactListScroller : function(pullDownCallback) {
            var that = this;
        
            if (typeof pullDownCallback == 'function') {
                that.contactListPullDownCB = pullDownCallback;
            }
            
            if (that.listpagescroll === undefined) {
                var callback = function() { 
                    //This way we can update the underlying callback without updating the callback on scroller.
                    if (typeof that.contactListPullDownCB == 'function') that.contactListPullDownCB(); 
                }
                that.listpagescroll = createScroller('listscroller', callback);
                $j(window).orientationChange(that._initiateContactListScroller);
            } else if (that.listpagescroll) {
                that.listpagescroll.refresh();
            }
        },
                
        //PUBLIC METHODS

        updateList : function(recs) {
            var that = this;
            
            var listContainer = that.view.find('#listscroller #scroller #contactlist');
            var listSummary = that.view.find('#listscroller #scroller #resultCount');
            
            listContainer.empty(); listSummary.empty();

            if(!recs || recs.length == 0) {
                listSummary.text('No ' + contactPluralLabel + ' Found');
            } else {
                listSummary.text('Found ' + recs.length + ' ' + contactPluralLabel);
            }
                
            recs.sort(function(x, y) {
                var a = x.LastName.toLowerCase(); var b = y.LastName.toLowerCase();
                return ((a == b) ? 0 : ((a > b) ? 1 : -1 ));
            });
            var chars = [];     
            
            $j.each(recs, 
                function () {
                    var id = htmlEncode(this.Id);
                    var rec = this;
                    if (chars.length == 0 || (this.LastName != null && chars.last() != this.LastName[0].toUpperCase())) {
                        chars.push(this.LastName[0].toUpperCase());
                        $j('<li></li>').addClass('listseparater').text(chars.last()).appendTo(listContainer);
                    }
                    
                    var listElem = $j('<li></li>').attr('id', 'contact_' + id);
                    if (id == that.selectedContactId) listElem.addClass('cellselected');
                    listElem.text((this.FirstName || '') + ' ')
                            .append($j('<strong></strong>').text(this.LastName || ''))
                            .appendTo(listContainer);
                });
        },
        
        resetSelectedContact : function() {
            this.selectedContactId = null;
            this.view.find('#contactlist .cellselected').removeClass('cellselected');
        },
        
        selectContact : function(contactId) {
            var that = this;
            that.resetSelectedContact();
            that.selectedContactId = contactId;
            that.view.find('#contactlist li#contact_' + contactId).addClass('cellselected');
            that.loadingItem = true;
            that.options.onItemSelect(that.selectedContactId, function() { that.loadingItem = false; });
        },
        
        showBusyIndicator : function(text) {
            this.busyInd = this.view.find('#listscroller').showActivityInd(text);
        },
        
        hideBusyIndicator : function() {
            if (this.busyInd) this.busyInd.hide();
        },
        
        refreshScroller : function(onRefreshCallback) {
            this._initiateContactListScroller(onRefreshCallback);
        }
    }
}
