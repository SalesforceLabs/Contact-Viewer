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

        var bucketLoadTime = function(timeInMillis, buckets) {
            if (!buckets || !buckets.length) buckets = [500, 1000, 2000];
            for (var idx in buckets)
                if (timeInMillis < buckets[idx]) {
                    return ((idx == 0) ? '< ' : (buckets[idx-1]/1000 + ' - ')) +
                           buckets[idx]/1000 + 's';
                }
        }

        LocalyticsManager.tagScreen = function(screenName) {
            localyticsSession.tagScreen(screenName);
        }

        LocalyticsManager.tagScreenOrientation = function(isPortrait) {
            this.tagScreen((isPortrait) ? 'Portrait' : 'Landscape');
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

        LocalyticsManager.logAppStarted = function() {
            this.appStartTime = Date.now();
        }

        LocalyticsManager.logAuthComplete = function() {
            if (!this.appStartTime) this.appStartTime = Date.now();
            this.appAuthTime = Date.now();
        }

        LocalyticsManager.logAppReady = function() {
            var authTime, dataLoadTime;
            if (this.appAuthTime)
                authTime = Date.now() - this.appStartTime;
                dataLoadTime = Date.now() - this.appAuthTime;

                this.tagEvent('App Ready', {
                    authTime: authTime,
                    dataLoadTime: dataLoadTime,
                    authTimeRange: bucketLoadTime(authTime, [2000, 5000, 10000]),
                    dataLoadTimeRange: bucketLoadTime(dataLoadTime, [2000, 5000, 10000]),
                    totalLoadTimeRange: bucketLoadTime(authTime + dataLoadTime, [5000, 10000, 15000])
                });
        }
    })();
}