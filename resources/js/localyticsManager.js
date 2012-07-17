if (window.LocalyticsManager === undefined) {
    window.LocalyticsManager = function() {
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
        this.uploadTimer = setInterval(localyticsSession.upload, 30000);
    };
    window.LocalyticsManager();
}

if (window.LocalyticsManager != undefined) {
    (function() {
        var bucketRecordCount = function(count) {
            return (count < 100) ? '< 100' : 
                   (count < 200) ? '100 - 200' : 
                   (count < 500) ? '200 - 500' : '> 500';
        }

        var bucketLoadTime = function(timeInMillis) {
            return (timeInMillis < 500) ? '< 0.5s' : 
                   (timeInMillis < 1000) ? '0.5 - 1s' : 
                   (timeInMillis < 2000) ? '1 - 2s' : '> 2s';
        }

        var bucketTextLength = function(timeInMillis) {
            return (timeInMillis < 500) ? '< 0.5s' : 
                   (timeInMillis < 1000) ? '0.5 - 1s' : 
                   (timeInMillis < 2000) ? '1 - 2s' : 
                   (timeInMillis < 5000) ? '2 - 5s' : '> 5s';
        }

        LocalyticsManager.tagScreen = function() {
            
        }

        LocalyticsManager.tagSplitView = function() {
            
        }

        LocalyticsManager.tagPortraitView = function() {
            
        }
        
        LocalyticsManager.tagEvent = function(event, data) {
            localyticsSession.tagEvent(event, data);
        }

        LocalyticsManager.tagListView = function(listName, recordCount, loadTime) {
            this.tagEvent('Render List', {
                            list: listName,
                            resultsetSize: bucketRecordCount(recordCount),
                            loadTimeRange: bucketLoadTime(loadTime),
                            loadTime: loadTime
                          });
        }

        LocalyticsManager.tagSearch = function(textLength, recordCount, loadTime) {
            this.tagEvent('Search', {
                            textLength: (textLength < 3) ? '< 3' : (textLength < 5) ? '3 - 5' : '> 5',
                            resultsetSize: bucketRecordCount(recordCount),
                            loadTimeRange: bucketLoadTime(loadTime),
                            loadTime: loadTime
                          });
        }

        LocalyticsManager.tagDetailView = function(detailView, loadTime) {
            this.tagEvent('Render Detail', {
                            view: detailView,
                            loadTimeRange: bucketLoadTime(loadTime),
                            loadTime: loadTime
                          });
        }
    })();
}