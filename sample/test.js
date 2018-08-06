#!/usr/bin/env node
"use strict" ;

var notifications = require( '../lib/notifications.js' ) ;


notifications.getCapabilities( function( error , caps ) {
	console.log( "Capabilities:" , caps ) ;
} ) ;

notifications.getServerInfo( function( error , info ) {
	console.log( "Server info:" , info ) ;
} ) ;


var notif = notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	urgency: 'critical' ,
	timeout: 0 ,
	appName: 'bill app' ,
	category: 'idk' ,
	//icon: __dirname + '/log.png' ,
	icon: 'appointment-new' ,
	sound: __dirname + '/hiss.wav' ,
	//*
	actions: {
		default: '' ,
		ok: 'OK!' ,
		cancel: 'Cancel...'
	}
	//*/
} ) ;

notif.on( 'action' , function( action ) {
	console.log( "Action '%s' triggered!" , action ) ;
} ) ;

notif.on( 'close' , function( closedBy ) {
	console.log( "Closed by '%s'" , closedBy ) ;
} ) ;

notif.push() ;



setTimeout( function() {
	
	notif.set( { summary: 'changed!!!' } ) ;
	notif.push() ;
	
	setTimeout( function() {
		
		notif.set( {
			summary: 'changed x2!!!' ,
			body: 'Oh noes!!!'
		} ) ;
		notif.push() ;
		
		setTimeout( function() {
			//notif.close() ;
			//process.exit() ;
			notifications.reset() ;
		} , 2000 ) ;
	} , 2000 ) ;
} , 2000 ) ;


