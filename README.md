ClickTimeExtension
==================

This is the Chrome Extension for Clicktime. Supports the basic operations of ClickTime time entry, including:  
1. Stopwatch  
2. Start/end  
3. Hour logging  

Development Guide  
=================  
This is a chrome extension, so it's a little different than a regular app, but still fairly similar.  

Deployment and Testing  
----------------------
Developers and QA can test their local chrome extensions easily. Just go to chrome://extensions, enable developer mode, and hit "Load unpacked extension". Choose the ClickTimeExtension folder root. You will now have an icon in your Chrome tray at the top right, which you can click to see your local extension.  

Environments:  
Switch the developing/testing environment on your extension by navigating to the login screen and clicking the bottom right corner of the extension popup window four times. This will bring up a dropdown menu with which to select an environment. **The environment is live by default.** Your environment change will persist until logout.  

Deployment:  
When ready to deploy, first update the manifest.json attribute "version" to the newest version. Then run:  
&nbsp;&nbsp;&nbsp;&nbsp;`$ python uploader.py ` 

&nbsp;&nbsp;&nbsp;&nbsp;This will generate a zipped chrome extension folder ready for upload.  

1. Go to https://chrome.google.com/webstore/developer/dashboard  
2. Login into the Clicktime google account registered to deal with Chrome extension uploading.  
3. If this is the first time uploading, click "Add new item" -> "Choose File" -> Select your zipped extension -> upload  
&nbsp;&nbsp;&nbsp;&nbsp;If the extension already exists, just click "edit" and upload a new package.  
4. You will now be at the edit page. Fill in any information, language settings, etc, and hit "publish".  
5. The extension should take some time to publish -- usually around 30 minutes - 1 hour. Once it has published, the newest version will become available to anyone who tries to download it. For existing users who already have the extension, the extension will be updated in the background quietly in the next 6 hours.  
  

Files:  
------
manifest.json: file that encodes basic app information.  
templates/ List of views for the extension:  
&nbsp;&nbsp;&nbsp;&nbsp;main.html: Wrapper template that has a few broadcast functions and contains all references to scripts and styles.  
&nbsp;&nbsp;&nbsp;&nbsp;login.html: Everyone goes to login first. If session already exists, go to:  
&nbsp;&nbsp;&nbsp;&nbsp;time_entry.html: Template for time entry.  
&nbsp;&nbsp;&nbsp;&nbsp;options.html: Template for user options.  

js/   
&nbsp;&nbsp;app/  
&nbsp;&nbsp;&nbsp;&nbsp;app.js: Main module for the app. Has a bunch of constants.  
&nbsp;&nbsp;&nbsp;&nbsp;AppController.js: Main wrapper controller. A few broadcasts, mostly a parent controller.  
&nbsp;&nbsp;&nbsp;&nbsp;background.js: Script that runs on every page in the background, not the extension. Handles the ticking badge in the extension icon and notifications
&nbsp;&nbsp;&nbsp;&nbsp;config.js: Script that handles the routing for each page of the application.  
&nbsp;&nbsp;&nbsp;&nbsp;content.js: Script injected into each page.  
&nbsp;&nbsp;&nbsp;&nbsp;LoginController.js: User is directed here first. If session exists and not timeout, then will go on to TimeEntry.  
&nbsp;&nbsp;&nbsp;&nbsp;options.js: Script for user options page customizability.  
&nbsp;&nbsp;&nbsp;&nbsp;StopwatchController.js: Controller for the stopwatch. Yes it needs its own controller.  
&nbsp;&nbsp;&nbsp;&nbsp;TimeEntryController.js: Controller for all things time entry.    
&nbsp;&nbsp;lib/  
&nbsp;&nbsp;&nbsp;&nbsp;Jquery and Angular files.  
&nbsp;&nbsp;services/  
&nbsp;&nbsp;&nbsp;&nbsp;Several services that serve as a layer between a controller and chrome storage or the API.   

img/ List of images used.    

css/ Style for the app.    

uploader.py: Run this guy to create a zipped chrome extension folder **after updating manifest version** ready for developer dashboard import.  
&nbsp;&nbsp;`$ python uploader.py ` 

destruct.py: Run this script to create a zipped chrome extension to replace the current one on the Developer Dashboard in case of emergency destruct of the Clicktime extension.  
&nbsp;&nbsp;`$ python destruct.py  `

Views  
-----
All views are wrapped by the main.html template. Main uses AppController.js.  

Login:  
&nbsp;&nbsp;&nbsp;&nbsp;Template: login.html  
&nbsp;&nbsp;&nbsp;&nbsp;Controller: LoginEntryController.js  
&nbsp;&nbsp;&nbsp;&nbsp;Services: APIService.js  
&nbsp;&nbsp;&nbsp;&nbsp;Overview: Controller checks to see if there is an existing session in Chrome sync storage. If so, user will be logged in. Otherwise, user will remain on Login view. Once they have entered email and password (and passed validation checks) they can press enter or click login to be redirected to Time Entry.  

Time Entry:  
&nbsp;&nbsp;&nbsp;&nbsp;Template: time_entry.html  
&nbsp;&nbsp;&nbsp;&nbsp;Controller: TimeEntryController.js   
&nbsp;&nbsp;&nbsp;&nbsp;Services: APIService.js, CTService.js, EntityService.js, TimeEntryService.js, StopwatchService.js  
&nbsp;&nbsp;&nbsp;&nbsp;Overview: Upon logging in or an existing session is found, controller will use that session to go fetch all entites (clients, jobs, tasks, time entries, user, company). It will check local storage first, and if they aren't found, ask the API. Once the view is loaded, the user can select entities and make edits to their time entry. Any edit will result in an update of their inProgressEntry in Chrome sync storage. Fields are validated upon entering text, and also upon clicking "save". Uncaught API errors are sent to the Clicktime error email.  

Settings:  
&nbsp;&nbsp;&nbsp;&nbsp;Template: settings.html  
&nbsp;&nbsp;&nbsp;&nbsp;Controller: SettingsController.js  
&nbsp;&nbsp;&nbsp;&nbsp;Services: None  
&nbsp;&nbsp;&nbsp;&nbsp;Overview: User can select which time entry method they want to use (start/end or duration) here, if those methods are available to them. Refresh lists will call the API directly to get all entities, overwriting Chrome local storage in the process. If Allow Reminders is checked, user will get reminders to enter time every 4 hours. Leave Feedback will direct user to Google form for chrome extension feedback. Sign out will log the user out.  

Branches
----------------------
- app: for chrome packaged apps
- jobclients: useless branch courtesey of @nsrose
- startend: see above

Team Members:  
-----------------  
Nick Rose  
Yuan Yuan  
Alex Jones  
Eric Rush  
Sarah Jonn
