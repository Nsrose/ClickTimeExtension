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
&nbsp;&nbsp;&nbsp;&nbsp;popup.html: general API testing platform  

js/   
&nbsp;&nbsp;app/  
&nbsp;&nbsp;&nbsp;&nbsp;app.js: Main module for the app.  
&nbsp;&nbsp;&nbsp;&nbsp;content.js: Script injected into each page.  
&nbsp;&nbsp;&nbsp;&nbsp;LoginController.js: Script for the login controller.  
&nbsp;&nbsp;&nbsp;&nbsp;PageController.js: Script for the main controller.    
&nbsp;&nbsp;lib/  
&nbsp;&nbsp;&nbsp;&nbsp;Jquery and Angular files.  
&nbsp;&nbsp;services/  
&nbsp;&nbsp;&nbsp;&nbsp;API service that includes a general function to make API calls.  

img/ List of images used.    

css/ Style for the app.    

Team Members:  
-----------------  
Nick Rose  
Yuan Yuan  
Alex Jones  
Eric Rush  
Sarah Jonn
