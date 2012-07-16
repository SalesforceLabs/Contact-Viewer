if (window.LocalyticsManager === undefined) {
	window.LocalyticsManager = function() {
		this.device = DEVICE_TYPE;
		// Call init at the beginning of every page load. It create a
		// Localytics session object
		localyticsSession.init(localyticsAppId);
	
		// Call this immediately after init. It either creates a new session or
		// reattaches to the previous session depending on how long has passed.
		// Also starts the polling for computing session duration
		localyticsSession.open();
		
		// Uploads all stored Localytics data. Call this after opening a session to
		// get the most accurate session information. If the application expects
		// very long running sessions it would be prudent to upload during the
		// session as well.
		localyticsSession.upload();
		// Upload Localytics data every minute.
		this.uploadTimer = setInterval(localyticsSession.upload, 60000);
	};
}

if (window.LocalyticsManager != undefined) {
	LocalyticsManager.prototype.tagScreen = function() {
		
	}

	LocalyticsManager.prototype.tagSplitView = function() {
		
	}

	LocalyticsManager.prototype.tagPortraitView = function() {
		
	}
	
	LocalyticsManager.prototype.tagEvent = function(event, data) {
		localyticsSession.tagEvent(event, data);
	}

	LocalyticsManager.prototype.tagListView = function(listName, recordCount) {
		if (this.prevListName != undefined && this.prevListName)
			this.tagEvent('LIST-' + this.prevListName.toUpperCase() + '-CLOSE', {timeSpent: (Date.now()-this.listTagTime)/1000});
		this.tagEvent('LIST-' + listName.toUpperCase() + '-OPEN', {records: recordCount});
		this.prevListName = listName;
		this.listTagTime = Date.now();
	}

	LocalyticsManager.prototype.tagSearch = function(recordCount) {
		this.tagListView('search', recordCount);
	}

	LocalyticsManager.prototype.tagDetailView = function(detailView, loadTime) {
		if (this.prevDetailView != undefined && this.prevDetailView)
			this.tagEvent(this.device + '-DETAIL-' + this.prevDetailView.toUpperCase() + '-CLOSE', {timeSpent: (Date.now()-this.detailTagTime)/1000});
		this.tagEvent(this.device + '-DETAIL-' + detailView.toUpperCase() + '-OPEN', {loadTime: loadTime});
		this.prevDetailView = detailView;
		this.detailTagTime = Date.now();
	}
}