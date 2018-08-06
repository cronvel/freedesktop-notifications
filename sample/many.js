#!/usr/bin/env node
"use strict" ;

var notifications = require( '../lib/notifications.js' ) ;

var i ;

notifications.setUnflood( 300 ) ;

for ( i = 1 ; i <= 10 ; i ++ )
{
	notifications.createNotification( {
		summary: '#' + i ,
		body: 'This is the notification <b>#' + i + '</b>' ,
		urgency: 1
	} ).push() ;
}

setTimeout( function() {
	notifications.purge() ;
	process.exit() ;
	//setTimeout( function() { process.exit() ; } , 150 ) ;
} , 1500 ) ;
