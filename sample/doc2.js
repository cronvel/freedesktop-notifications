var notifications = require( '../lib/notifications.js' ) ;

var notif = notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	icon: __dirname + '/log.png' ,
	sound: __dirname + '/hiss.wav' ,
	actions: {
		default: '' ,
		ok: 'OK!' ,
		nope: 'Nope!'
	}
} ) ;

notif.on( 'action' , function( action ) {
	console.log( "Action '%s' was clicked!" , action ) ;
} ) ;

notif.on( 'close' , function( closedBy ) {
	console.log( "Closed by: '%s'" , closedBy ) ;
} ) ;

notif.push() ;

