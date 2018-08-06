#!/usr/bin/env node
"use strict" ;

var notifications = require( '../lib/notifications.js' ) ;

var notif = notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	icon: 'appointment-new' ,
	antiLeakTimeout: 2000
} ) ;

notif.on( 'close' , function( closedBy ) {
	console.log( "Closed by '%s'" , closedBy ) ;
} ) ;

notif.push() ;
