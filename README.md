ClickTimeExtension
==================

This is the Chrome Extension for Clicktime. Supports the basic operations of ClickTime time entry, including:  
1. Stopwatch  
2. Start/end  
3. Hour logging  

Development Guide  
-----------------  
This is a chrome extension, so it's a little different than a regular app, but still fairly similar.  

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
&nbsp;&nbsp;&nbsp;&nbsp;background.js: Script that runs on every page in the background, not the extension. Handles appearance of the badge icon of the extension in relation to stopwatch.  
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

uploader.py: Run this guy to create a zipped chrome extension folder AFTER UPDATING YOUR MANIFEST VERSION ready for developer dashboard import.  
&nbsp;&nbsp;$ python uploader.py  

Team Members:  
-----------------  
Nick Rose  
Yuan Yuan  
Alex Jones  
Eric Rush  
Sarah Jonn
